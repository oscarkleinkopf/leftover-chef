/**
 * Leftover Chef - Fridge Photo Scanner & Gemini AI Client
 * Handles Canvas-based scanning animations, mock object detection,
 * and client-side integrations with Google AI Studio Gemini API.
 */

class FridgeScanner {
  constructor() {
    this.images = []; // Holds file or dataURLs of loaded images
    this.canvas = document.getElementById('scan-canvas');
    this.ctx = this.canvas?.getContext('2d');
    this.beam = document.getElementById('scanning-beam');
    this.container = document.getElementById('scan-container');
    this.statusText = document.getElementById('scanning-status');
    this.isScanning = false;
    this.animationId = null;
    this.cameraStream = null;
  }

  // Load photos into the queue
  addImages(fileList) {
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.images.push({
            file: file,
            dataUrl: e.target.result,
            id: 'img_' + Math.random().toString(36).substr(2, 9)
          });
          // Dispatch event to update thumbnails in app.js
          window.dispatchEvent(new CustomEvent('images-updated'));
        };
        reader.readAsDataURL(file);
      }
    }
  }

  removeImage(id) {
    this.images = this.images.filter(img => img.id !== id);
    window.dispatchEvent(new CustomEvent('images-updated'));
  }

  clearAll() {
    this.images = [];
    this.stopScanAnimation();
    if (this.container) this.container.classList.add('hidden');
    window.dispatchEvent(new CustomEvent('images-updated'));
  }

  // Helper to scan a single image index and return a promise when complete
  scanImageIndex(index, total) {
    return new Promise((resolve) => {
      const imgObj = new Image();
      imgObj.src = this.images[index].dataUrl;
      
      imgObj.onload = () => {
        const centerShift_x = (this.canvas.width - imgObj.width * (Math.min(this.canvas.width / imgObj.width, this.canvas.height / imgObj.height))) / 2;
        const centerShift_y = (this.canvas.height - imgObj.height * (Math.min(this.canvas.width / imgObj.width, this.canvas.height / imgObj.height))) / 2;
        const fittedWidth = imgObj.width * (Math.min(this.canvas.width / imgObj.width, this.canvas.height / imgObj.height));
        const fittedHeight = imgObj.height * (Math.min(this.canvas.width / imgObj.width, this.canvas.height / imgObj.height));
        
        let scanLineY = 0;
        let scanDirection = 1;
        const startTime = Date.now();
        const scanDuration = 2500; // 2.5 seconds per photo

        // Define distinct visual target boxes per image index
        let ingredientsToDetect = [];
        let returnedIds = [];

        if (index === 0) {
          ingredientsToDetect = [
            { label: 'Zanahoria', color: '#f97316', x: 0.2, y: 0.25, w: 0.15, h: 0.3, id: 'zanahoria' },
            { label: 'Calabacín', color: '#10b981', x: 0.45, y: 0.2, w: 0.18, h: 0.35, id: 'calabacin' },
            { label: 'Cebolla', color: '#a855f7', x: 0.7, y: 0.5, w: 0.15, h: 0.18, id: 'cebolla' }
          ];
          returnedIds = ['zanahoria', 'calabacin', 'cebolla'];
        } else if (index === 1) {
          ingredientsToDetect = [
            { label: 'Pechuga de Pollo', color: '#f43f5e', x: 0.3, y: 0.3, w: 0.25, h: 0.3, id: 'pollo' },
            { label: 'Huevos', color: '#fbbf24', x: 0.65, y: 0.45, w: 0.18, h: 0.2, id: 'huevo' }
          ];
          returnedIds = ['pollo', 'huevo'];
        } else if (index === 2) {
          ingredientsToDetect = [
            { label: 'Arroz Carnaroli', color: '#38bdf8', x: 0.25, y: 0.35, w: 0.2, h: 0.3, id: 'arroz' },
            { label: 'Tomate Triturado', color: '#ef4444', x: 0.55, y: 0.25, w: 0.16, h: 0.4, id: 'tomate_triturado' }
          ];
          returnedIds = ['arroz', 'tomate_triturado'];
        } else {
          ingredientsToDetect = [
            { label: 'Champiñones', color: '#a1a1aa', x: 0.4, y: 0.4, w: 0.2, h: 0.2, id: 'champiñon' }
          ];
          returnedIds = ['champiñon'];
        }

        const tick = () => {
          if (!this.isScanning) {
            resolve([]);
            return;
          }
          
          const elapsed = Date.now() - startTime;
          
          // 1. Render base photo on canvas
          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
          this.ctx.drawImage(imgObj, 0, 0, imgObj.width, imgObj.height, 
                             centerShift_x, centerShift_y, fittedWidth, fittedHeight);
          
          // 2. Animate scanning beam line
          scanLineY += 4 * scanDirection;
          if (scanLineY >= this.canvas.height || scanLineY <= 0) {
            scanDirection *= -1;
          }

          // 3. Draw surrounding overlay reticle
          this.ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
          this.ctx.lineWidth = 1;
          this.ctx.strokeRect(centerShift_x, centerShift_y, fittedWidth, fittedHeight);

          // 4. Reveal bounding targeting boxes
          ingredientsToDetect.forEach((box, idx) => {
            const revealTime = (scanDuration / ingredientsToDetect.length) * idx;
            if (elapsed > revealTime) {
              const bx = centerShift_x + (box.x * fittedWidth);
              const by = centerShift_y + (box.y * fittedHeight);
              const bw = box.w * fittedWidth;
              const bh = box.h * fittedHeight;

              this.ctx.strokeStyle = box.color;
              this.ctx.lineWidth = 2;
              this.ctx.shadowBlur = 8;
              this.ctx.shadowColor = box.color;
              this.ctx.strokeRect(bx, by, bw, bh);
              
              // Draw corners
              const retLen = 8;
              this.ctx.beginPath();
              this.ctx.moveTo(bx - 2, by - 2 + retLen);
              this.ctx.lineTo(bx - 2, by - 2);
              this.ctx.lineTo(bx - 2 + retLen, by - 2);
              
              this.ctx.moveTo(bx + bw + 2 - retLen, by - 2);
              this.ctx.lineTo(bx + bw + 2, by - 2);
              this.ctx.lineTo(bx + bw + 2, by - 2 + retLen);
              
              this.ctx.moveTo(bx - 2, by + bh + 2 - retLen);
              this.ctx.lineTo(bx - 2, by + bh + 2);
              this.ctx.lineTo(bx - 2 + retLen, by + bh + 2);
              
              this.ctx.moveTo(bx + bw + 2 - retLen, by + bh + 2);
              this.ctx.lineTo(bx + bw + 2, by + bh + 2);
              this.ctx.lineTo(bx + bw + 2, by + bh + 2 - retLen);
              this.ctx.stroke();

              this.ctx.shadowBlur = 0;

              // Draw tag label
              this.ctx.fillStyle = box.color;
              this.ctx.font = 'bold 10px Inter, sans-serif';
              const textWidth = this.ctx.measureText(`${box.label} [OK]`).width;
              this.ctx.fillRect(bx, by - 18, textWidth + 10, 18);
              this.ctx.fillStyle = '#0b0f19';
              this.ctx.fillText(`${box.label} [OK]`, bx + 5, by - 5);
            }
          });

          // 5. Update Status Text with photo indexes
          const percentDone = Math.round((elapsed / scanDuration) * 100);
          this.statusText.innerText = `📸 Analizando Imagen ${index + 1} de ${total} (${percentDone}%) ...`;

          if (elapsed < scanDuration) {
            this.animationId = requestAnimationFrame(tick);
          } else {
            resolve(returnedIds);
          }
        };

        this.animationId = requestAnimationFrame(tick);
      };
    });
  }

  // Start the visual computer-vision laser scan animation
  async startScanAnimation(onCompleteCallback) {
    if (this.images.length === 0) return;
    this.isScanning = true;
    
    if (this.container) this.container.classList.remove('hidden');
    if (this.beam) this.beam.classList.remove('hidden');

    const containerWidth = this.container.clientWidth;
    const containerHeight = 350;
    this.canvas.width = containerWidth;
    this.canvas.height = containerHeight;

    const allDetectedIds = new Set(['ajo', 'aceite', 'sal']); // default base stables

    // Sequential loop over images in queue
    for (let i = 0; i < this.images.length; i++) {
      if (!this.isScanning) break;
      const detected = await this.scanImageIndex(i, this.images.length);
      detected.forEach(id => allDetectedIds.add(id));
    }

    this.stopScanAnimation();
    if (this.isScanning) {
      onCompleteCallback(Array.from(allDetectedIds));
    }
  }

  stopScanAnimation() {
    this.isScanning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.beam) this.beam.classList.add('hidden');
    if (this.container) this.container.classList.add('hidden');
  }

  addDataUrlImage(dataUrl, mimeType = 'image/jpeg') {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return null;
    const image = {
      file: { type: mimeType },
      dataUrl,
      id: 'img_' + Math.random().toString(36).substr(2, 9)
    };
    this.images.push(image);
    window.dispatchEvent(new CustomEvent('images-updated'));
    return image.id;
  }

  async startLiveCamera(videoEl, constraints = { video: { facingMode: { ideal: 'environment' } }, audio: false }) {
    this.stopLiveCamera();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Este navegador no permite cámara en vivo. Usa HTTPS o localhost.');
    }
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.cameraStream = stream;
    if (videoEl) {
      videoEl.srcObject = stream;
      await videoEl.play().catch(() => {});
    }
    return stream;
  }

  stopLiveCamera(videoEl) {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach((track) => track.stop());
      this.cameraStream = null;
    }
    if (videoEl) {
      videoEl.srcObject = null;
    }
  }

  captureLiveFrame(videoEl, quality = 0.82) {
    if (!videoEl || !videoEl.videoWidth) {
      throw new Error('La cámara aún no tiene imagen. Espera un segundo e inténtalo de nuevo.');
    }
    const canvas = document.createElement('canvas');
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoEl, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    return this.addDataUrlImage(dataUrl, 'image/jpeg');
  }

  /**
   * Gemini scan: uses the local /api/gemini-scan proxy when available so the
   * API key stays on the server. Falls back to a browser key for GitHub Pages.
   */
  async runGeminiAIScan(apiKey, dietaryFilters, targetModel, onProgress, onSuccess, onError, options = {}) {
    if (this.images.length === 0) {
      onError('Por favor, selecciona o toma al menos una foto de tu nevera.');
      return;
    }

    const helper = (typeof window !== 'undefined' && window.LeftoverGemini) || null;
    const useProxy = !!options.useProxy;

    try {
      onProgress('Procesando imágenes y convirtiendo formato...');

      const images = this.images.map((img) => ({
        mimeType: (img.file && img.file.type) || 'image/jpeg',
        data: img.dataUrl
      }));

      onProgress(useProxy ? 'Conectando con el proxy de Leftover Chef...' : 'Conectando con Google Gemini...');

      let rawText;
      if (useProxy) {
        const response = await fetch('./api/gemini-scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images, dietaryFilters, targetModel })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error || `Error del proxy HTTP ${response.status}`);
        }
        rawText = payload.rawText || (payload.recipe ? JSON.stringify(payload.recipe) : '');
        if (payload.recipe) {
          payload.recipe.id = payload.recipe.id || ('gemini_' + Date.now());
          payload.recipe.image = payload.recipe.image || 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800';
          onSuccess(payload.recipe);
          return;
        }
      } else {
        if (!apiKey) {
          throw new Error('Falta la clave de Gemini y el proxy del servidor no está configurado.');
        }
        const body = helper
          ? helper.buildGeminiRequestBody(images, dietaryFilters, targetModel)
          : {
            contents: [{
              parts: [
                { text: 'Analiza las fotos del refrigerador y responde con JSON de receta Thermomix.' },
                ...images.map((img) => ({
                  inlineData: {
                    data: String(img.data).split(',')[1] || img.data,
                    mimeType: img.mimeType
                  }
                }))
              ]
            }],
            generationConfig: { responseMimeType: 'application/json' }
          };
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${(helper && helper.MODEL) || 'gemini-2.5-flash'}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (!response.ok) {
          const errJson = await response.json().catch(() => ({}));
          throw new Error(errJson.error?.message || `Error del servidor HTTP ${response.status}`);
        }
        const result = await response.json();
        rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      }

      onProgress('Descifrando recetas culinarias generadas...');
      if (!rawText) {
        throw new Error('La inteligencia artificial de Gemini no devolvió ninguna receta válida.');
      }
      const recipeData = helper
        ? helper.parseGeminiRecipeResponse(rawText)
        : JSON.parse(rawText.trim());
      recipeData.id = 'gemini_' + Date.now();
      recipeData.image = 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800';
      onSuccess(recipeData);
    } catch (error) {
      console.error('Error en conexión con la API de Gemini:', error);
      onError(error.message || 'Error de red inesperado al conectar con Gemini.');
    }
  }

  // Parses receipt text lines against the ingredient database
  parseReceiptText(text) {
    if (!text || typeof text !== 'string') return [];
    const normalized = text.toLowerCase();
    const foundIngredients = [];

    const db = window.INGREDIENT_DATABASE || [];
    db.forEach(item => {
      const nameLower = item.name.toLowerCase();
      if (normalized.includes(nameLower) || normalized.includes(item.id)) {
        foundIngredients.push(item.id);
      }
    });

    return [...new Set(foundIngredients)];
  }
}

window.FridgeScanner = FridgeScanner;
