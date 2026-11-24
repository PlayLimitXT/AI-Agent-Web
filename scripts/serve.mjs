#!/usr/bin/env node
/**
 * Zero-dependency static preview server for PLXT.
 *
 * Usage:
 *   npm run serve
 *   npm run serve -- 9090
 *   PORT=9090 HOST=0.0.0.0 node scripts/serve.mjs
 */

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const port = Number(process.argv[2] || process.env.PORT || 8080);
const host = process.env.HOST || '127.0.0.1';

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`Invalid port: ${process.argv[2] || process.env.PORT}`);
  process.exit(1);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.pdf': 'application/pdf',
  '.wasm': 'application/wasm',
  '.map': 'application/json; charset=utf-8',
  '.yml': 'application/yaml; charset=utf-8',
  '.yaml': 'application/yaml; charset=utf-8'
};

function send(response, status, body, headers = {}) {
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
    ...headers
  });
  response.end(body);
}

const server = createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    send(response, 405, 'Method Not Allowed', { Allow: 'GET, HEAD' });
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host || 'localhost'}`).pathname);
  } catch {
    send(response, 400, 'Bad Request');
    return;
  }

  if (pathname === '/') pathname = '/index.html';

  const relative = pathname.replace(/^\/+/, '');
  const file = resolve(ROOT, relative);

  // Refuse path traversal outside the repository root.
  if (file !== ROOT && !file.startsWith(ROOT + sep)) {
    send(response, 403, 'Forbidden');
    return;
  }

  if (!existsSync(file) || !statSync(file).isFile()) {
    send(response, 404, `Not found: ${relative}`);
    return;
  }

  const stat = statSync(file);
  response.writeHead(200, {
    'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
    'Content-Length': stat.size,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store'
  });

  if (request.method === 'HEAD') {
    response.end();
    return;
  }

  const stream = createReadStream(file);
  stream.on('error', () => {
    response.destroy();
  });
  stream.pipe(response);

  console.log(`${request.method} ${pathname} 200`);
});

server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Try: npm run serve -- ${port + 1}`);
  } else {
    console.error(error);
  }
  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`\nPLXT preview: http://${host}:${port}/\nPress Ctrl+C to stop.\n`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}