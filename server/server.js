/**
 * AeroPulse 2.0 - Production Node.js Server for Render Deployment
 * 
 * Unified Web Service Architecture:
 * - Serves production React SPA static assets from dist/
 * - Implements SPA fallback (HTML5 history mode) for all client routes
 * - Serves secure server-side Gemini API proxy at POST /api/gemini
 * - Provides lightweight health monitoring at GET /api/health
 * - Listens on process.env.PORT and binds to 0.0.0.0 (required for Render)
 * - Zero external runtime dependencies (native Node.js http, fs, path, url)
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleGeminiProxyRequest } from './geminiProxy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_DIST_DIR = path.resolve(__dirname, '..', 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

/**
 * Creates the HTTP application server instance.
 * @param {object} options
 * @param {string} [options.distDir] Absolute path to frontend dist directory
 * @returns {http.Server}
 */
export function createAppServer({ distDir = DEFAULT_DIST_DIR } = {}) {
  const indexHtmlPath = path.join(distDir, 'index.html');

  return http.createServer((req, res) => {
    // 1. Backend API: Gemini Proxy
    if (req.url === '/api/gemini' || req.url.startsWith('/api/gemini?')) {
      handleGeminiProxyRequest(req, res);
      return;
    }

    // 2. Health Monitoring Check for Render
    if (req.url === '/api/health' || req.url.startsWith('/api/health?')) {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache',
      });
      res.end(JSON.stringify({
        status: 'ok',
        service: 'AeroPulse 2.0',
        environment: process.env.NODE_ENV || 'production',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      }));
      return;
    }

    // 3. Reject unknown API routes
    if (req.url.startsWith('/api/')) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'API route not found.' }));
      return;
    }

    // 4. Static File Serving & SPA Fallback (GET and HEAD only)
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Method ${req.method} Not Allowed.` }));
      return;
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    } catch {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Bad Request');
      return;
    }

    let pathname = decodeURIComponent(parsedUrl.pathname);
    let candidatePath = path.normalize(path.join(distDir, pathname));

    // Security: Prevent directory traversal (reject any '..' segments or path escaping distDir)
    let decodedRawUrl = '';
    try {
      decodedRawUrl = decodeURIComponent(req.url);
    } catch {
      decodedRawUrl = req.url;
    }

    if (
      decodedRawUrl.includes('..') ||
      req.url.includes('..') ||
      pathname.includes('..') ||
      !candidatePath.startsWith(distDir)
    ) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    // If candidate path is directory, look for index.html inside
    try {
      if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isDirectory()) {
        candidatePath = path.join(candidatePath, 'index.html');
      }
    } catch {
      // Continue to check existence below
    }

    // Check if requested static file exists
    if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
      serveStaticFile(candidatePath, pathname, req.method, res);
      return;
    }

    // 5. SPA Fallback: Serve dist/index.html for client-side navigation routes
    // Asset requests with unknown/missing file extensions return 404 rather than HTML
    const hasStaticExtension = path.extname(pathname) !== '' && path.extname(pathname) !== '.html';
    if (hasStaticExtension) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Asset Not Found');
      return;
    }

    if (fs.existsSync(indexHtmlPath)) {
      serveStaticFile(indexHtmlPath, '/index.html', req.method, res);
      return;
    }

    // Fallback if frontend dist has not been built yet
    res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head><title>AeroPulse 2.0 - Build Required</title></head>
        <body style="font-family: sans-serif; padding: 40px; text-align: center; background: #0b1120; color: #f8fafc;">
          <h1>AeroPulse 2.0 - Service Starting</h1>
          <p>Frontend production bundle not found in <code>dist/</code>.</p>
          <p>Please run <code>npm run build</code> to generate the client assets.</p>
        </body>
      </html>
    `);
  });
}

function serveStaticFile(filePath, pathname, method, res) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const stat = fs.statSync(filePath);

    // Cache strategy:
    // Hashed build assets (/assets/*) are immutable for 1 year
    // HTML / root files are not cached to ensure immediate updates
    const isHashedAsset = pathname.startsWith('/assets/') || pathname.startsWith('assets/');
    const cacheControl = isHashedAsset
      ? 'public, max-age=31536000, immutable'
      : 'no-cache, no-store, must-revalidate';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Cache-Control': cacheControl,
      'X-Content-Type-Options': 'nosniff',
    });

    if (method === 'HEAD') {
      res.end();
      return;
    }

    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
      }
      res.end('Internal Server Error reading file.');
    });
    stream.pipe(res);
  } catch {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Error serving static file.');
  }
}

/**
 * Starts the production server listening on process.env.PORT and 0.0.0.0.
 */
export function startServer({
  port = parseInt(process.env.PORT || '3000', 10),
  host = process.env.HOST || '0.0.0.0',
  distDir = DEFAULT_DIST_DIR,
} = {}) {
  const server = createAppServer({ distDir });

  server.listen(port, host, () => {
    console.log(`[AeroPulse 2.0] Production server listening on http://${host}:${port}`);
    console.log(`[AeroPulse 2.0] Serving static frontend from: ${distDir}`);
    console.log(`[AeroPulse 2.0] Gemini AI endpoint active at: POST /api/gemini`);
    console.log(`[AeroPulse 2.0] Health monitoring active at: GET /api/health`);
  });

  const shutdown = (signal) => {
    console.log(`\n[AeroPulse 2.0] Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      console.log('[AeroPulse 2.0] Server closed cleanly.');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('[AeroPulse 2.0] Forced shutdown after timeout.');
      process.exit(1);
    }, 5000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return server;
}

// Automatically start server when executed directly (node server/server.js)
const isDirectExecution = process.argv[1] && (
  path.resolve(process.argv[1]) === path.resolve(__filename)
);

if (isDirectExecution) {
  startServer();
}
