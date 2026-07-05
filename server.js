/**
 * Leftover Chef - Minimalist Static Web Server
 * Zero-dependency server using Node.js standard libraries.
 * Serves index.html, CSS and JS scripts.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

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

const server = http.createServer((req, res) => {
  console.log(`[Leftover-Chef Server] Request: ${req.url}`);

  // Normalize path and set index.html as default
  let filePath = req.url === '/' ? '/index.html' : req.url;
  
  // Resolve absolute path in workspace
  const resolvedPath = path.join(__dirname, filePath);

  // Check if file exists
  fs.access(resolvedPath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error(`[Leftover-Chef Server] File not found: ${resolvedPath}`);
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 - Recurso no encontrado (Leftover Chef)');
      return;
    }

    // Read and serve file
    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(resolvedPath, (readErr, content) => {
      if (readErr) {
        console.error(`[Leftover-Chef Server] Error reading file: ${readErr}`);
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
});

server.listen(PORT, () => {
  console.log('\n==================================================');
  console.log('🍳 ¡LEFTOVER CHEF ESTÁ LISTO!');
  console.log(`Servidor activo en: http://localhost:${PORT}`);
  console.log('==================================================\n');
  console.log('Abre la URL anterior en tu navegador o escanea tu red local');
  console.log('para usarlo desde tu teléfono celular en la cocina.');
});
