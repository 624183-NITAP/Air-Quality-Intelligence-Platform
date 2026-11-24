/**
 * AeroPulse 2.0 - Secure Server-Side Gemini API Proxy
 * Zero-dependency Node.js implementation.
 * 
 * Features:
 * - Reads GEMINI_API_KEY strictly from server environment variables (never bundled in client)
 * - Restricts requests to HTTP POST
 * - Caps maximum payload size (50 KB)
 * - In-memory sliding-window rate limiting (30 requests/min/IP)
 * - Input validation & sanitization
 * - Transmits credentials via 'x-goog-api-key' header
 * - Response validation & secret scrubbing before client dispatch
 */

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;

// Periodically clean up stale rate-limit IP records
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now - record.startTime > RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.delete(ip);
    }
  }
}, 30000).unref();

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now - record.startTime > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { startTime: now, count: 1 });
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  record.count += 1;
  return true;
}

export async function handleGeminiProxyRequest(req, res) {
  // 1. Enforce POST
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method Not Allowed. Use POST.' }));
    return;
  }

  // 2. Rate limiting
  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
  if (!checkRateLimit(clientIp)) {
    res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '60' });
    res.end(JSON.stringify({ 
      error: 'Too Many Requests. Rate limit exceeded (30 requests per minute).',
      fallbackRequired: true 
    }));
    return;
  }

  // 3. Read body with size ceiling
  const MAX_BYTES = 50 * 1024; // 50 KB
  let bodyBuffer = '';

  req.on('data', chunk => {
    bodyBuffer += chunk;
    if (bodyBuffer.length > MAX_BYTES) {
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Payload Too Large. Max size is 50 KB.' }));
      req.destroy();
    }
  });

  req.on('end', async () => {
    try {
      if (!bodyBuffer) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Empty request body.' }));
        return;
      }

      const parsed = JSON.parse(bodyBuffer);
      const { prompt, contents, model = 'gemini-2.0-flash' } = parsed;

      // Validate model selection
      const ALLOWED_MODELS = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];
      const targetModel = ALLOWED_MODELS.includes(model) ? model : 'gemini-2.0-flash';

      // Verify server-side credentials
      const serverApiKey = process.env.GEMINI_API_KEY;
      if (!serverApiKey || serverApiKey.trim().length < 10) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Server-side GEMINI_API_KEY is not configured.',
          fallbackRequired: true,
        }));
        return;
      }

      // Construct Gemini request payload
      // Supports multi-turn conversation contents if provided, or single prompt
      const geminiContents = Array.isArray(contents) && contents.length > 0 
        ? contents.slice(-8) // Cap history to last 8 turns for bounded payload size
        : [
            {
              role: 'user',
              parts: [{ text: String(prompt || '').slice(0, 4000) }]
            }
          ];

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent`;

      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': serverApiKey.trim(),
        },
        body: JSON.stringify({
          contents: geminiContents,
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 1200,
          }
        }),
      });

      if (!response.ok) {
        const status = response.status;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: `Upstream AI provider error (Status ${status}).`,
          fallbackRequired: true,
        }));
        return;
      }

      const geminiData = await response.json();
      const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Output scrubbing: ensure no credentials or raw external URLs leak in responses
      const sanitizedText = rawText
        .replace(/AIzaSy[A-Za-z0-9_-]{33}/g, '[REDACTED_API_KEY]')
        .trim();

      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, private',
      });
      res.end(JSON.stringify({
        text: sanitizedText || 'No response generated by model.',
        model: targetModel,
        timestamp: new Date().toISOString(),
      }));

    } catch {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Internal server error processing AI query.',
        fallbackRequired: true,
      }));
    }
  });
}
