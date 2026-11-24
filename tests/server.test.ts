import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../server/server.js';
import { resetRateLimits } from '../server/geminiProxy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '..', 'dist');

describe('AeroPulse 2.0 Production Server (server/server.js)', () => {
  let server: ReturnType<typeof createAppServer>;
  let serverUrl: string;
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeAll(async () => {
    // Ensure dist directory and index.html exist for test runs
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }
    const testIndexPath = path.join(distDir, 'index.html');
    if (!fs.existsSync(testIndexPath)) {
      fs.writeFileSync(testIndexPath, '<!DOCTYPE html><html><head><title>AeroPulse 2.0</title></head><body><div id="root">AeroPulse App</div></body></html>', 'utf-8');
    }

    server = createAppServer({ distDir });
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          serverUrl = `http://127.0.0.1:${address.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  beforeEach(() => {
    resetRateLimits();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
  });

  // ==========================================================================
  // 1. HEALTH MONITORING ENDPOINT
  // ==========================================================================
  describe('GET /api/health (Render Health Check)', () => {
    it('returns 200 with service status, environment, and uptime', async () => {
      const res = await fetch(`${serverUrl}/api/health`);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/json');

      const data = await res.json();
      expect(data.status).toBe('ok');
      expect(data.service).toBe('AeroPulse 2.0');
      expect(data.timestamp).toBeDefined();
    });
  });

  // ==========================================================================
  // 2. BACKEND API: GEMINI PROXY (/api/gemini)
  // ==========================================================================
  describe('POST /api/gemini (Gemini AI Proxy)', () => {
    it('rejects non-POST HTTP methods with 405 Method Not Allowed', async () => {
      const getRes = await fetch(`${serverUrl}/api/gemini`, { method: 'GET' });
      expect(getRes.status).toBe(405);
      const getData = await getRes.json();
      expect(getData.error).toContain('Use POST');

      const putRes = await fetch(`${serverUrl}/api/gemini`, { method: 'PUT' });
      expect(putRes.status).toBe(405);
    });

    it('returns 400 when request body is empty', async () => {
      const res = await fetch(`${serverUrl}/api/gemini`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '',
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Empty request body');
    });

    it('returns 400 when JSON body is invalid syntax', async () => {
      const res = await fetch(`${serverUrl}/api/gemini`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{ prompt: invalid_json_syntax',
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Invalid JSON payload');
    });

    it('returns 413 Payload Too Large when request exceeds 50 KB', async () => {
      const largePayload = JSON.stringify({
        prompt: 'a'.repeat(55 * 1024), // 55 KB
      });

      const res = await fetch(`${serverUrl}/api/gemini`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: largePayload,
      });

      expect(res.status).toBe(413);
      const data = await res.json();
      expect(data.error).toContain('Payload Too Large');
    });

    it('returns 503 when server-side GEMINI_API_KEY is not configured', async () => {
      delete process.env.GEMINI_API_KEY;

      const res = await fetch(`${serverUrl}/api/gemini`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'How do I protect against smog?' }),
      });

      expect(res.status).toBe(503);
      const data = await res.json();
      expect(data.fallbackRequired).toBe(true);
      expect(data.error).toContain('GEMINI_API_KEY is not configured');
    });

    it('successfully proxies request to Gemini API and scrubs secrets from output', async () => {
      const testKey = 'AIzaSyFakeTestKeyForValidation1234567890';
      process.env.GEMINI_API_KEY = testKey;

      let capturedUrl = '';
      let capturedHeaders: Record<string, string> = {};
      let capturedBody: string = '';

      const realFetch = originalFetch;
      global.fetch = vi.fn().mockImplementation((url: string | URL | Request, init?: RequestInit) => {
        const urlStr = String(url);
        if (urlStr.includes('generativelanguage.googleapis.com')) {
          capturedUrl = urlStr;
          capturedHeaders = (init?.headers as Record<string, string>) || {};
          capturedBody = (init?.body as string) || '';

          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              candidates: [
                {
                  content: {
                    parts: [
                      { text: 'PART 1: CURRENT SITUATION\nClean haven active. Key: AIzaSyFakeTestKeyForValidation1234567890' }
                    ]
                  }
                }
              ]
            })
          });
        }
        return realFetch(url, init);
      });

      const res = await fetch(`${serverUrl}/api/gemini`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Recommend an indoor routine' }),
      });

      expect(res.status).toBe(200);
      expect(capturedUrl).toContain('gemini-2.0-flash:generateContent');
      expect(capturedBody).toContain('Recommend an indoor routine');
      // Crucial Security Verification: Key transmitted via header, never in URL
      expect(capturedUrl).not.toContain('key=');
      expect(capturedHeaders['x-goog-api-key']).toBe(testKey);

      const data = await res.json();
      expect(data.text).toContain('Clean haven active');
      // Secret scrubbing verified: Raw key is redacted from output
      expect(data.text).not.toContain(testKey);
      expect(data.text).toContain('[REDACTED_API_KEY]');
    });

    it('handles upstream Gemini 500 error gracefully and signals fallbackRequired', async () => {
      process.env.GEMINI_API_KEY = 'AIzaSyValidDummyKey1234567890abcdefghij';

      const realFetch = originalFetch;
      global.fetch = vi.fn().mockImplementation((url: string | URL | Request, init?: RequestInit) => {
        const urlStr = String(url);
        if (urlStr.includes('generativelanguage.googleapis.com')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            json: async () => ({ error: { message: 'Internal Server Error' } }),
          });
        }
        return realFetch(url, init);
      });

      const res = await fetch(`${serverUrl}/api/gemini`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'What CADR is needed?' }),
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.fallbackRequired).toBe(true);
      expect(data.error).toContain('Upstream AI provider error');
    });

    it('enforces sliding-window rate limiting of 30 requests/minute/IP', async () => {
      delete process.env.GEMINI_API_KEY;

      const testIp = '198.51.100.42';
      // Issue 30 requests (allowed)
      for (let i = 0; i < 30; i++) {
        const r = await fetch(`${serverUrl}/api/gemini`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': testIp,
          },
          body: JSON.stringify({ prompt: 'test' }),
        });
        expect(r.status).toBe(503); // Fails for missing key, but within rate limit
      }

      // 31st request should be blocked by rate limiter with 429
      const blockedRes = await fetch(`${serverUrl}/api/gemini`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': testIp,
        },
        body: JSON.stringify({ prompt: 'test' }),
      });

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.headers.get('retry-after')).toBe('60');
      const blockedData = await blockedRes.json();
      expect(blockedData.fallbackRequired).toBe(true);
      expect(blockedData.error).toContain('Rate limit exceeded');
    });
  });

  // ==========================================================================
  // 3. STATIC FILE SERVING & SPA FALLBACK
  // ==========================================================================
  describe('Static Asset Serving & SPA Routing', () => {
    it('serves dist/index.html with Content-Type text/html on root GET /', async () => {
      const res = await fetch(`${serverUrl}/`);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');

      const html = await res.text();
      expect(html).toContain('<div id="root">');
    });

    it('supports HEAD requests on static files without response body', async () => {
      const res = await fetch(`${serverUrl}/`, { method: 'HEAD' });
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');
      const text = await res.text();
      expect(text).toBe('');
    });

    it('falls back to index.html for client-side SPA routes (e.g. /dashboard, /routine)', async () => {
      const res = await fetch(`${serverUrl}/daily-routine`);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');

      const html = await res.text();
      expect(html).toContain('<div id="root">');
    });

    it('returns 404 for nonexistent /api/* routes rather than falling back to SPA index.html', async () => {
      const res = await fetch(`${serverUrl}/api/nonexistent-route`);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toContain('API route not found');
    });

    it('blocks directory traversal attempts with 403 Forbidden', async () => {
      const port = new URL(serverUrl).port;
      const statusCode = await new Promise<number>((resolve, reject) => {
        const rawReq = http.get(
          {
            host: '127.0.0.1',
            port,
            path: '/../../package.json',
          },
          (rawRes) => {
            resolve(rawRes.statusCode || 0);
          }
        );
        rawReq.on('error', reject);
      });

      expect(statusCode).toBe(403);
    });

    it('returns 404 for missing static files with extensions rather than falling back to SPA index.html', async () => {
      const res = await fetch(`${serverUrl}/missing-style.css`);
      expect(res.status).toBe(404);
      expect(await res.text()).toContain('Asset Not Found');
    });

    it('rejects POST on non-API routes with 405 Method Not Allowed', async () => {
      const res = await fetch(`${serverUrl}/dashboard`, { method: 'POST' });
      expect(res.status).toBe(405);
    });
  });
});
