const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT_DIR = path.resolve(__dirname, '../../');
const htmlContent = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
const recipesJs = fs.readFileSync(path.join(ROOT_DIR, 'js', 'recipes.js'), 'utf8');
const scannerJs = fs.readFileSync(path.join(ROOT_DIR, 'js', 'scanner.js'), 'utf8');
const appJs = fs.readFileSync(path.join(ROOT_DIR, 'js', 'app.js'), 'utf8');

function setupEnvironment(initialLocalStorage = {}) {
  const dom = new JSDOM(htmlContent, {
    url: 'http://localhost/',
    runScripts: 'dangerously',
    resources: 'usable'
  });

  const { window } = dom;
  
  // Mock localStorage
  const storage = { ...initialLocalStorage };
  window.localStorage = {
    getItem: (key) => (key in storage ? storage[key] : null),
    setItem: (key, val) => { storage[key] = String(val); },
    removeItem: (key) => { delete storage[key]; },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
  };

  // Mock Audio & Canvas HTML API methods missing in JSDOM
  window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  window.HTMLMediaElement.prototype.pause = () => {};
  window.HTMLCanvasElement.prototype.getContext = () => ({
    drawImage: () => {},
    clearRect: () => {},
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    putImageData: () => {},
    beginPath: () => {},
    arc: () => {},
    stroke: () => {},
    fill: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} })
  });

  // Evaluate scripts in window context
  window.eval(recipesJs);
  window.eval(scannerJs);

  return { dom, window, storage };
}

console.log('Test setup ready.');
