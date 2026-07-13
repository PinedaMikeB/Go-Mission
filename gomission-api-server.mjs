#!/usr/bin/env node
/**
 * gomission-api-server.mjs
 *
 * Local Node.js API for GoMission — runs on your Mac Mini, exposed via
 * Cloudflare Tunnel at gomission-api.marga.biz → port 3100.
 *
 * Same pattern as Marga App's local-margabase-proxy.mjs.
 * Runs all netlify/functions handlers directly — no Netlify needed.
 */

import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const PORT = Number(process.env.GOMISSION_API_PORT || 3100);
const HOST = process.env.GOMISSION_API_HOST || '127.0.0.1';
const require = createRequire(import.meta.url);
const { handleJoinRequest } = require('./gomission-join-handler.js');

const ALLOWED_ORIGINS = new Set([
  'https://gomission.wotgonline.com',
  'https://gomission.netlify.app',
  'http://127.0.0.1:3100',
  'http://localhost:3100',
]);

function corsHeaders(req) {
  const origin = String(req?.headers?.origin || '');
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : 'https://gomission.wotgonline.com';
  return {
    'access-control-allow-origin': allowed,
    'vary': 'Origin',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'Content-Type,Authorization,Cookie',
    'access-control-allow-credentials': 'true',
  };
}

function send(req, res, status, body, extraHeaders = {}) {
  res.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
    ...corsHeaders(req),
    ...extraHeaders,
  });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function runFunction(functionName, req, res) {
  const fnPath = path.join(ROOT_DIR, 'netlify', 'functions', `${functionName}.js`);
  let handler;
  try {
    const mod = require(fnPath);
    handler = mod.handler || mod.default;
  } catch {
    return send(req, res, 404, { error: `Function not found: ${functionName}` });
  }
  if (typeof handler !== 'function') {
    return send(req, res, 500, { error: `No handler exported from: ${functionName}` });
  }

  const url = new URL(req.url, `http://${req.headers.host || `127.0.0.1:${PORT}`}`);
  const queryStringParameters = {};
  url.searchParams.forEach((v, k) => { queryStringParameters[k] = v; });
  const bodyStr = req.method === 'GET' || req.method === 'HEAD' ? null : await readBody(req);

  const event = {
    httpMethod: req.method,
    path: url.pathname,
    rawUrl: url.href,
    headers: req.headers,
    queryStringParameters,
    body: bodyStr,
    isBase64Encoded: false,
  };

  const result = await handler(event);
  const resBody = result?.isBase64Encoded
    ? Buffer.from(result.body || '', 'base64')
    : (result?.body || '');
  send(req, res, Number(result?.statusCode || 200), resBody, result?.headers || {});
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || `127.0.0.1:${PORT}`}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders(req));
    res.end();
    return;
  }

  // Health check — used by the start script and Cloudflare health monitors
  if (url.pathname === '/health' || url.pathname === '/api/health') {
    return send(req, res, 200, { ok: true, service: 'gomission-api', port: PORT });
  }

  // Group join — entirely local Postgres, no Firebase, no quota limits
  if (url.pathname === '/api/join' || url.pathname === '/.netlify/functions/gomission-join') {
    try {
      const bodyStr = await readBody(req);
      const result = await handleJoinRequest({
        httpMethod: req.method,
        headers: req.headers,
        body: bodyStr,
      });
      res.writeHead(result.statusCode, { ...corsHeaders(req), ...(result.headers || {}) });
      res.end(result.body);
    } catch (err) {
      console.error('[gomission-api] join error:', err);
      send(req, res, 500, { error: err.message || 'Join request failed.' });
    }
    return;
  }

  // Route /.netlify/functions/<name> → local handler
  const fnMatch = url.pathname.match(/^\/.netlify\/functions\/([^/]+)/);
  if (fnMatch) {
    try {
      await runFunction(fnMatch[1], req, res);
    } catch (err) {
      console.error(`[gomission-api] ${fnMatch[1]} error:`, err);
      send(req, res, 500, { error: err.message || 'Internal server error' });
    }
    return;
  }

  // Friendly shorthand routes
  const shortcuts = {
    '/api/auth': 'local-auth',
    '/api/read': 'pg-read',
  };
  if (shortcuts[url.pathname]) {
    req.url = `/.netlify/functions/${shortcuts[url.pathname]}${url.search}`;
    try {
      await runFunction(shortcuts[url.pathname], req, res);
    } catch (err) {
      console.error(`[gomission-api] shortcut error:`, err);
      send(req, res, 500, { error: err.message || 'Internal server error' });
    }
    return;
  }

  send(req, res, 404, { error: 'Not found' });
});

server.listen(PORT, HOST, () => {
  console.log(`[gomission-api] Running at http://${HOST}:${PORT}`);
  console.log(`[gomission-api] Health: http://${HOST}:${PORT}/health`);
});

server.on('error', (err) => {
  console.error('[gomission-api] Server error:', err);
  process.exit(1);
});
