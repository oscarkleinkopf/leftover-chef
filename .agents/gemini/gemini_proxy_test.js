/**
 * Gemini proxy + live camera suite.
 * Unit-tests shared prompt/parser, HTTP contract of /api/gemini-*,
 * and camera helpers without calling Google.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const { JSDOM } = require('jsdom');

const rootDir = path.join(__dirname, '..', '..');
const gemini = require(path.join(rootDir, 'js', 'gemini-scan.js'));

let failures = 0;
const pass = (msg) => console.log(`✅ ${msg}`);
const fail = (msg) => { console.error(`❌ ${msg}`); failures += 1; };

function read(rel) {
  return fs.readFileSync(path.join(rootDir, rel), 'utf8');
}

console.log('=== GEMINI PROXY + LIVE CAMERA SUITE ===\n');

{
  try {
    require('child_process').execSync('node --check js/gemini-scan.js', { cwd: rootDir, stdio: 'pipe' });
    pass('js/gemini-scan.js syntax OK');
  } catch (e) {
    fail('js/gemini-scan.js syntax error');
  }
}

{
  const prompt = gemini.buildGeminiScanPrompt(['vegetarian'], 'TM5');
  if (prompt.includes('TM5') && prompt.includes('vegetarian') && prompt.includes('Thermomix')) {
    pass('buildGeminiScanPrompt includes diet + Thermomix model');
  } else {
    fail('buildGeminiScanPrompt missing expected diet/model context');
  }
}

{
  const dataUrl = 'data:image/jpeg;base64,QUJDRA==';
  const normalized = gemini.normalizeImages([
    { mimeType: 'image/jpeg', data: dataUrl },
    { mimeType: 'image/gif', data: 'xxxx' },
    { mimeType: 'image/png', data: '' },
    { mimeType: 'image/webp', data: 'abcd' },
    { mimeType: 'image/png', data: 'efgh' },
    { mimeType: 'image/png', data: 'ijkl' }
  ]);
  if (
    normalized.length === 4 &&
    normalized[0].data === 'QUJDRA==' &&
    normalized.every((img) => gemini.ALLOWED_MIME[img.mimeType])
  ) {
    pass('normalizeImages strips data URLs, drops bad mime/empty, caps at 4');
  } else {
    fail(`normalizeImages unexpected: ${JSON.stringify(normalized)}`);
  }
}

{
  const body = gemini.buildGeminiRequestBody(
    [{ mimeType: 'image/jpeg', data: 'QUJD' }],
    [],
    'TM6'
  );
  const inline = body.contents[0].parts.find((p) => p.inlineData);
  if (body.generationConfig.responseMimeType === 'application/json' && inline && inline.inlineData.data === 'QUJD') {
    pass('buildGeminiRequestBody emits JSON generationConfig + inline image');
  } else {
    fail('buildGeminiRequestBody shape unexpected');
  }
}

{
  const recipe = { title: 'Crema de calabacín', detectedIngredients: ['calabacin'] };
  const parsed = gemini.parseGeminiRecipeResponse(JSON.stringify(recipe));
  const fenced = gemini.parseGeminiRecipeResponse('```json\n' + JSON.stringify(recipe) + '\n```');
  if (parsed.title === recipe.title && fenced.title === recipe.title) {
    pass('parseGeminiRecipeResponse accepts raw JSON and fenced markdown');
  } else {
    fail('parseGeminiRecipeResponse failed on raw/fenced JSON');
  }
}

{
  let threw = false;
  try { gemini.parseGeminiRecipeResponse('no json here'); } catch (_) { threw = true; }
  if (threw) pass('parseGeminiRecipeResponse rejects non-JSON text');
  else fail('parseGeminiRecipeResponse should throw on non-JSON');
}

{
  const html = read('index.html');
  const needed = [
    'id="btn-open-camera"',
    'id="camera-overlay"',
    'id="camera-video"',
    'id="btn-capture-frame"',
    'id="btn-close-camera"',
    'js/gemini-scan.js',
    'capture="environment"'
  ];
  const missing = needed.filter((s) => !html.includes(s));
  if (missing.length === 0) pass('index.html wires live camera + gemini-scan.js');
  else fail(`index.html missing: ${missing.join(', ')}`);
}

{
  const sw = read('service-worker.js');
  if (sw.includes("CACHE_NAME = 'leftover-chef-v8'") && sw.includes('./js/gemini-scan.js') && sw.includes('/api/')) {
    pass('Service worker v7 precaches gemini-scan.js and skips /api/');
  } else {
    fail('Service worker missing v7 / gemini-scan.js / API bypass');
  }
}

{
  const scanner = read('js/scanner.js');
  const app = read('js/app.js');
  if (scanner.includes('./api/gemini-scan') && scanner.includes('startLiveCamera') && scanner.includes('captureLiveFrame')) {
    pass('scanner.js has proxy fetch + live camera helpers');
  } else {
    fail('scanner.js missing proxy or camera methods');
  }
  if (app.includes('probeGeminiProxy') && app.includes('useProxy') && app.includes('openLiveCamera')) {
    pass('app.js probes proxy, passes useProxy, and opens live camera');
  } else {
    fail('app.js missing proxy probe / useProxy / camera wiring');
  }
  if (app.includes('GEMINI_API_KEY') && !app.includes('AIza')) {
    pass('app.js never embeds a Gemini API key literal');
  } else {
    fail('app.js looks like it might leak or hardcode a Gemini key');
  }
}

{
  const serverSrc = read('server.js');
  if (serverSrc.includes('/api/gemini-status') && serverSrc.includes('/api/gemini-scan') && !serverSrc.includes('console.log(parsed')) {
    pass('server.js exposes status + scan routes without logging request bodies');
  } else {
    fail('server.js proxy routes incomplete or logs request bodies');
  }
}

function bootScanner() {
  const html = read('index.html');
  const geminiJs = read('js/gemini-scan.js');
  const scannerJs = read('js/scanner.js');
  const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'dangerously' });
  const { window } = dom;
  window.HTMLCanvasElement.prototype.getContext = () => ({
    drawImage() {},
    toDataURL() { return 'data:image/jpeg;base64,QQ=='; }
  });
  window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/jpeg;base64,QQ==';
  window.eval(geminiJs);
  window.eval(scannerJs);
  return window;
}

{
  const window = bootScanner();
  const scanner = new window.FridgeScanner();
  const id = scanner.addDataUrlImage('data:image/jpeg;base64,QUJD', 'image/jpeg');
  const rejected = scanner.addDataUrlImage('https://example.com/nope.jpg');
  if (id && scanner.images.length === 1 && rejected == null) {
    pass('addDataUrlImage accepts data URLs and rejects remote URLs');
  } else {
    fail('addDataUrlImage did not gate data URLs correctly');
  }

  let captureThrew = false;
  try {
    scanner.captureLiveFrame({ videoWidth: 0, videoHeight: 0 });
  } catch (_) {
    captureThrew = true;
  }
  if (captureThrew) pass('captureLiveFrame throws when the video has no frame');
  else fail('captureLiveFrame should throw without a live frame');

  scanner.stopLiveCamera({ srcObject: null });
  pass('stopLiveCamera is safe with no active stream');
}

function request(port, method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body == null ? null : Buffer.from(JSON.stringify(body));
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: urlPath,
      method,
      headers: payload
        ? { 'Content-Type': 'application/json', 'Content-Length': payload.length }
        : {}
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try { json = JSON.parse(text); } catch (_) { json = null; }
        resolve({ status: res.statusCode, text, json });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function httpContract() {
  const port = 3461;
  const env = { ...process.env, PORT: String(port) };
  delete env.GEMINI_API_KEY;
  delete env.GOOGLE_API_KEY;

  const child = spawn(process.execPath, [path.join(rootDir, 'server.js')], {
    cwd: rootDir,
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server start timeout')), 5000);
    child.stdout.on('data', (buf) => {
      if (String(buf).includes('localhost')) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.on('error', reject);
  });

  try {
    const status = await request(port, 'GET', '/api/gemini-status');
    if (status.status === 200 && status.json && status.json.configured === false && Object.keys(status.json).length === 1) {
      pass('GET /api/gemini-status returns { configured: false } without extra fields');
    } else {
      fail(`gemini-status unexpected: HTTP ${status.status} ${status.text}`);
    }
    if (!/AIza|GEMINI_API_KEY\s*=/.test(status.text)) {
      pass('gemini-status body does not leak key material');
    } else {
      fail('gemini-status body appears to leak key material');
    }

    const empty = await request(port, 'POST', '/api/gemini-scan', {});
    if (empty.status === 400) pass('POST /api/gemini-scan without images returns 400');
    else fail(`empty scan expected 400, got ${empty.status} ${empty.text}`);

    const bogus = await request(port, 'POST', '/api/gemini-scan', { images: [{ mimeType: 'image/jpeg', data: 'QUJDRA==' }] });
    if (bogus.status === 503 && bogus.json && /GEMINI_API_KEY/.test(bogus.json.error || '')) {
      pass('POST /api/gemini-scan with images but no server key returns 503');
    } else {
      fail(`scan without key expected 503, got ${bogus.status} ${bogus.text}`);
    }

    const asset = await request(port, 'GET', '/js/gemini-scan.js');
    if (asset.status === 200 && asset.text.includes('LeftoverGemini')) {
      pass('GET /js/gemini-scan.js is reachable');
    } else {
      fail(`gemini-scan.js HTTP ${asset.status}`);
    }
  } finally {
    child.kill('SIGTERM');
  }
}

httpContract()
  .catch((e) => fail(`HTTP gemini contract failed: ${e.message}`))
  .finally(() => {
    console.log('\n=== GEMINI SUITE SUMMARY ===');
    if (failures === 0) {
      console.log('🎉 ALL GEMINI PROXY / CAMERA CHECKS PASSED');
      process.exit(0);
    }
    console.log(`❌ ${failures} FAILURE(S)`);
    process.exit(1);
  });
