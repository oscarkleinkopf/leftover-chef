/**
 * Leftover Chef - Static web server + Gemini scan proxy.
 * GEMINI_API_KEY stays on the server (.env / process env). The browser never sees it.
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const gemini = require('./js/gemini-scan.js');

const PORT = process.env.PORT || 3000;
const MAX_BODY_BYTES = 8 * 1024 * 1024;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.ico': 'image/x-icon'
};

function loadDotEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match) return;
    const key = match[1];
    let value = match[2] || '';
    if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null || process.env[key] === '') {
      process.env[key] = value.trim();
    }
  });
}

loadDotEnv();

function geminiApiKey() {
  return (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
}

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('payload-too-large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function postGemini(body) {
  const key = geminiApiKey();
  const payload = JSON.stringify(body);
  const url = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${gemini.MODEL}:generateContent?key=${encodeURIComponent(key)}`);
  return new Promise((resolve, reject) => {
    const request = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        resolve({
          status: response.statusCode,
          text: Buffer.concat(chunks).toString('utf8')
        });
      });
    });
    request.on('error', reject);
    request.write(payload);
    request.end();
  });
}

async function handleGeminiScan(req, res) {
  let parsed;
  try {
    const raw = await readBody(req, MAX_BODY_BYTES);
    parsed = raw ? JSON.parse(raw) : {};
  } catch (e) {
    json(res, e.message === 'payload-too-large' ? 413 : 400, { error: 'JSON de escaneo inválido.' });
    return;
  }
  const images = gemini.normalizeImages(parsed.images);
  if (images.length === 0) {
    json(res, 400, { error: 'Envía al menos una foto de la nevera.' });
    return;
  }
  if (!geminiApiKey()) {
    json(res, 503, { error: 'El servidor no tiene GEMINI_API_KEY configurada.' });
    return;
  }
  try {
    const body = gemini.buildGeminiRequestBody(images, parsed.dietaryFilters, parsed.targetModel);
    const upstream = await postGemini(body);
    let upstreamJson = {};
    try { upstreamJson = JSON.parse(upstream.text); } catch (e) { upstreamJson = {}; }
    if (upstream.status >= 400) {
      json(res, 502, { error: (upstreamJson.error && upstreamJson.error.message) || 'Gemini rechazó el escaneo.' });
      return;
    }
    const rawText = upstreamJson.candidates?.[0]?.content?.parts?.[0]?.text;
    const recipe = gemini.parseGeminiRecipeResponse(rawText);
    recipe.id = 'gemini_' + Date.now();
    recipe.image = recipe.image || 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800';
    json(res, 200, { recipe });
  } catch (e) {
    json(res, 502, { error: e.message || 'No se pudo completar el escaneo con Gemini.' });
  }
}

function serveStatic(req, res, pathname) {
  let filePath = pathname === '/' ? '/index.html' : pathname;
  const resolvedPath = path.resolve(path.join(__dirname, filePath));
  if (!resolvedPath.startsWith(path.resolve(__dirname))) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403');
    return;
  }
  fs.access(resolvedPath, fs.constants.F_OK, (err) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 - Recurso no encontrado (Leftover Chef)');
      return;
    }
    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    fs.readFile(resolvedPath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 - Error interno del servidor');
        return;
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      res.end(content);
    });
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  if (pathname === '/api/gemini-status' && req.method === 'GET') {
    json(res, 200, { configured: Boolean(geminiApiKey()) });
    return;
  }
  if (pathname === '/api/gemini-scan' && req.method === 'POST') {
    handleGeminiScan(req, res);
    return;
  }
  if (pathname.startsWith('/api/')) {
    json(res, 404, { error: 'API no encontrada' });
    return;
  }

  console.log(`[Leftover-Chef Server] Request: ${pathname}`);
  serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  const proxyReady = Boolean(geminiApiKey());
  console.log('\n==================================================');
  console.log('🍳 ¡LEFTOVER CHEF ESTÁ LISTO!');
  console.log(`Servidor activo en: http://localhost:${PORT}`);
  console.log(proxyReady
    ? 'Gemini proxy: configurado (la clave no sale del servidor)'
    : 'Gemini proxy: inactivo (añade GEMINI_API_KEY en .env)');
  console.log('==================================================\n');
});
