/**
 * Production Deployment Verification Script for AeroPulse 2.0
 * Starts production server on a dedicated port, tests all endpoints via live HTTP, and shuts down.
 */

import http from 'node:http';
import { startServer } from '../server/server.js';

const TEST_PORT = 3847;
const TEST_HOST = '127.0.0.1';
const BASE_URL = `http://${TEST_HOST}:${TEST_PORT}`;

process.env.PORT = String(TEST_PORT);
process.env.HOST = TEST_HOST;
process.env.NODE_ENV = 'production';

console.log('--- STARTING AEROPULSE 2.0 PRODUCTION VERIFICATION ---');

const server = startServer({ port: TEST_PORT, host: TEST_HOST });

// Wait 500ms for socket binding
await new Promise(r => setTimeout(r, 500));

let failures = 0;

async function check(name, testFn) {
  try {
    await testFn();
    console.log(`[PASS] ${name}`);
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    failures++;
  }
}

try {
  // Test 1: Root GET / serves index.html
  await check('1. Root GET / serves frontend index.html', async () => {
    const res = await fetch(`${BASE_URL}/`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('text/html')) throw new Error(`Expected text/html, got ${ct}`);
    const html = await res.text();
    if (!html.includes('<div id="root">')) throw new Error('Missing #root in HTML');
  });

  // Test 2: Health check endpoint GET /api/health
  await check('2. Health check GET /api/health returns 200 JSON with status: ok', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const json = await res.json();
    if (json.status !== 'ok') throw new Error(`Expected status: ok, got ${json.status}`);
    if (json.service !== 'AeroPulse 2.0') throw new Error(`Expected service name AeroPulse 2.0, got ${json.service}`);
  });

  // Test 3: Gemini API Proxy POST /api/gemini
  await check('3. Gemini Proxy POST /api/gemini returns 503 fallback when key unset', async () => {
    delete process.env.GEMINI_API_KEY;
    const res = await fetch(`${BASE_URL}/api/gemini`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Test verification prompt' }),
    });
    if (res.status !== 503) throw new Error(`Expected 503, got ${res.status}`);
    const json = await res.json();
    if (json.fallbackRequired !== true) throw new Error('Expected fallbackRequired: true');
  });

  // Test 4: SPA Fallback GET /daily-routine
  await check('4. SPA Fallback GET /daily-routine returns 200 index.html', async () => {
    const res = await fetch(`${BASE_URL}/daily-routine`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const html = await res.text();
    if (!html.includes('<div id="root">')) throw new Error('Missing #root in SPA fallback HTML');
  });

  // Test 5: Missing static asset returns 404
  await check('5. Missing asset GET /missing-asset.css returns 404', async () => {
    const res = await fetch(`${BASE_URL}/missing-asset.css`);
    if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
  });

  // Test 6: Directory traversal attempt blocked
  await check('6. Directory traversal attempt is blocked with 403 Forbidden', async () => {
    const statusCode = await new Promise((resolve, reject) => {
      const req = http.get({
        host: TEST_HOST,
        port: TEST_PORT,
        path: '/../../package.json',
      }, res => resolve(res.statusCode || 0));
      req.on('error', reject);
    });
    if (statusCode !== 403) throw new Error(`Expected 403, got ${statusCode}`);
  });

} finally {
  await new Promise(resolve => server.close(resolve));
  console.log('--- PRODUCTION SERVER CLOSED ---');
}

if (failures > 0) {
  console.error(`Verification FAILED with ${failures} error(s).`);
  process.exitCode = 1;
} else {
  console.log('ALL LIVE PRODUCTION CHECKS PASSED SUCCESSFULLY (6/6)!');
  process.exitCode = 0;
}
