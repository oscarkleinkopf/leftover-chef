/**
 * Leftover Chef - Auto-Sync Watcher
 * Watches the workspace directory and automatically backs up changes to GitHub.
 * Zero external dependencies.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// 1. Read .env file to get GitHub configuration
const envPath = path.join(__dirname, '.env');
let config = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      // Remove surrounding quotes if any
      if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
        value = value.substring(1, value.length - 1);
      }
      config[key] = value.trim();
    }
  });
}

const TOKEN = config.GITHUB_TOKEN;
const USER = config.GITHUB_USER || 'oscarkleinkopf';
const REPO = config.GITHUB_REPO || 'leftover-chef';

if (!TOKEN) {
  console.error('⚠️ [Auto-Sync] Error: GITHUB_TOKEN no encontrado en el archivo .env');
  process.exit(1);
}

console.log('🔄 [Auto-Sync] Iniciando vigilante de archivos...');
console.log(`💻 [Auto-Sync] Monitoreando directorio: ${__dirname}`);
console.log(`🌐 [Auto-Sync] Destino remoto: https://github.com/${USER}/${REPO}`);

// Debounce timer
let debounceTimer = null;
const DEBOUNCE_DELAY = 5000; // 5 seconds wait to let all edits finish

// Watch options
const watchOptions = {
  recursive: true
};

// Check if recursive watching is supported (supported natively on Windows/macOS)
const watcher = fs.watch(__dirname, watchOptions, (eventType, filename) => {
  if (!filename) return;

  // Ignore Git files, Node modules, .env, log files, etc.
  const isIgnored = filename.startsWith('.git') || 
                    filename.includes('node_modules') || 
                    filename.startsWith('.env') ||
                    filename.endsWith('.log') ||
                    filename.includes('sync-watcher.js');

  if (isIgnored) return;

  console.log(`✏️ [Auto-Sync] Modificación detectada: ${filename} (Tipo: ${eventType})`);
  
  // Reset debounce timer
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    triggerBackup(filename);
  }, DEBOUNCE_DELAY);
});

function triggerBackup(triggeringFile) {
  console.log(`🚀 [Auto-Sync] Preparando respaldo automático por cambios en: ${triggeringFile}`);
  
  // 1. Check if there are actual unstaged/staged changes
  exec('git status --porcelain', (err, stdout, stderr) => {
    if (err) {
      console.error('❌ [Auto-Sync] Error al verificar git status:', err);
      return;
    }
    
    if (!stdout.trim()) {
      console.log('✅ [Auto-Sync] Sin cambios pendientes para respaldar.');
      return;
    }

    console.log('📦 [Auto-Sync] Detectados los siguientes cambios para subir:');
    console.log(stdout);

    // 2. Perform git stage, commit, and push
    const commitMessage = `Respaldo automático: ${new Date().toLocaleString('es-ES')}`;
    const remoteUrl = `https://${USER}:${TOKEN}@github.com/${USER}/${REPO}.git`;
    
    console.log('⏳ [Auto-Sync] Ejecutando commit y push...');

    const gitCmd = `git add . && git commit -m "${commitMessage}" && git push "${remoteUrl}" main`;

    exec(gitCmd, (gitErr, gitStdout, gitStderr) => {
      if (gitErr) {
        console.error('❌ [Auto-Sync] Error al respaldar en GitHub:', gitStderr || gitErr.message);
        return;
      }
      
      console.log('✨ [Auto-Sync] ¡Respaldo completado con éxito en GitHub!');
      console.log(`   Mensaje: "${commitMessage}"`);
    });
  });
}

// Handle termination gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 [Auto-Sync] Deteniendo vigilante de archivos...');
  watcher.close();
  process.exit(0);
});
