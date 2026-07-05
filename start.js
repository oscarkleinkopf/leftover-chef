/**
 * Leftover Chef - Cross-Platform Process Runner
 * Starts both the web server and the auto-sync watcher concurrently.
 * Zero external dependencies.
 */

const { fork } = require('child_process');
const path = require('path');

console.log('🏁 [Runner] Iniciando servicios de Leftover Chef...');

// Helper to spawn a child module
function startProcess(modulePath, name, colorCode) {
  const child = fork(modulePath, [], { stdio: ['inherit', 'pipe', 'pipe', 'ipc'] });

  // Prefix output logs for readability
  child.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      console.log(`[\x1b[${colorCode}m${name}\x1b[0m] ${line}`);
    });
  });

  child.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      console.error(`[\x1b[31m${name} ERROR\x1b[0m] ${line}`);
    });
  });

  child.on('exit', (code) => {
    console.log(`🛑 [Runner] El servicio ${name} terminó con código de salida: ${code}`);
  });

  return child;
}

// Start Server (Color 32 = Green)
const serverProcess = startProcess(path.join(__dirname, 'server.js'), 'Servidor', '32');

// Start Auto-Sync Watcher (Color 36 = Cyan)
const watcherProcess = startProcess(path.join(__dirname, 'sync-watcher.js'), 'Auto-Sync', '36');

// Handle termination signals to clean up children
process.on('SIGINT', () => {
  console.log('\n🛑 [Runner] Deteniendo todos los servicios...');
  serverProcess.kill('SIGINT');
  watcherProcess.kill('SIGINT');
  process.exit(0);
});
