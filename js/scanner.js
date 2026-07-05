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

  /**
   * Gemini Multimodal API call
   * Converts all images in queue to base64, constructs request payload,
   * sends it client-side to Google AI Studio endpoint, and yields a Thermomix recipe.
   */
  async runGeminiAIScan(apiKey, dietaryFilters, targetModel, onProgress, onSuccess, onError) {
    if (this.images.length === 0) {
      onError('Por favor, selecciona o toma al menos una foto de tu nevera.');
      return;
    }

    try {
      onProgress('Procesando imágenes y convirtiendo formato...');
      
      // 1. Prepare base64 images
      const imageParts = this.images.map(img => {
        const base64Data = img.dataUrl.split(',')[1];
        const mimeType = img.file.type;
        return {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        };
      });

      onProgress('Conectando con Google Gemini...');

      // 2. Formulate optimized culinary instruction prompt
      const systemPrompt = `Actúa como un chef experto con estrellas Michelin y especialista en cocina de Thermomix (modelos TM5 y TM6).
Analiza detalladamente las fotos provistas del interior del refrigerador.
Identifica todos los ingredientes visibles (vegetales, carnes, lácteos, salsas, etc.).

Tu tarea es crear una receta espectacular y detallada para preparar en Thermomix basándote principalmente en estos ingredientes encontrados.
Puedes dar por hecho que el usuario cuenta en su despensa con condimentos básicos o indispensables: aceite de oliva, ajo, cebolla, sal, pimienta, harina y agua.

La receta generada DEBE ser 100% compatible con los modelos TM5 y TM6.
Elige un título sugerente y un subtítulo moderno.
Indica las porciones (e.g. 3 raciones), la dificultad (Fácil, Media, Alta), el tiempo total de preparación (e.g., 30 minutos).
Detalla si el plato cumple de forma natural con estas dietas: ${dietaryFilters.join(', ') || 'ninguna en particular'}.

Asegúrate de calcular de forma realista el valor nutricional total por ración individual para esta receta:
- Calorías (kcal)
- Proteínas (g)
- Carbohidratos (g)
- Grasas (g)

Escribe los pasos de preparación paso a paso. Para CADA paso obligatoriamente debes proveer la configuración detallada de la Thermomix, que consiste en:
- time: Tiempo del paso (e.g. "5 seg", "12 min", "Sofreír", "Listo").
- temp: Temperatura en grados o Varoma (e.g. "Sin temp", "100°C", "120°C", "Varoma").
- speed: Velocidad de las cuchillas (e.g. "vel 1", "vel 5", "vel cuchara", "vel 1.5", "Listo").
- reverse: Un booleano indicando si el giro inverso está activado (true) o desactivado (false). Es vital activarlo para no destrozar carnes, arroces o verduras al cocinar.
- accessory: El accesorio a colocar en ese paso (e.g., "Cuchillas", "Mariposa", "Cestillo en vaso", "Cestillo sobre tapa", "Varoma completo", "Espátula").
- speechText: Un texto breve y ameno que sirva para que el lector de voz de la app lea las instrucciones amigablemente al usuario en la cocina mientras cocina.
- timer: Un entero opcional que indique los segundos que debe contar el temporizador integrado para ese paso en caso de aplicar (e.g., 5 minutos = 300).

DEBES responder ÚNICAMENTE con un objeto JSON válido que siga exactamente la siguiente estructura sin rodeos, sin bloques markdown de código triples, solo el string JSON:
{
  "detectedIngredients": ["zanahoria", "cebolla", "pollo"], // Lista de IDs de ingredientes detectados (usa en lo posible IDs de la base de datos de Leftover Chef: calabacin, tomate, champiñon, brocoli, patata, pollo, ternera, salmon, gambas, tofu, huevo, leche, queso_rallado)
  "title": "Título de la Receta",
  "subtitle": "Subtítulo ameno",
  "prepTime": 30,
  "portions": 3,
  "diet": ["vegetarian", "gluten-free"], // Tags aplicables en minúscula
  "difficulty": "Fácil",
  "requiredIngredients": [
    { "id": "zanahoria", "amount": 150, "display": "150g de Zanahoria cortada en rodajas" }
  ],
  "optionalIngredients": [
    { "id": "pimienta", "display": "Pimienta negra recién molida al gusto" }
  ],
  "nutrition": {
    "kcal": 380,
    "protein": 12,
    "carbs": 55,
    "fat": 14
  },
  "steps": [
    {
      "step": 1,
      "text": "Poner la cebolla y el ajo en el vaso y picar.",
      "tmSettings": {
        "time": "5 seg",
        "temp": "Sin temp",
        "speed": "5",
        "reverse": false,
        "accessory": "Cuchilla"
      },
      "speechText": "Paso 1. Añade la cebolla y el ajo en el vaso. Cierra la tapa y pica cinco segundos a velocidad cinco.",
      "timer": 5
    }
  ]
}`;

      // 3. Make fetch call to Gemini 2.5 Flash API endpoint
      // Using gemini-2.5-flash as the default model due to its high speed, intelligence and robust JSON output formatting.
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: systemPrompt },
                ...imageParts
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error?.message || `Error del servidor HTTP ${response.status}`);
      }

      onProgress('Descifrando recetas culinarias generadas...');

      const result = await response.json();
      const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!rawText) {
        throw new Error('La inteligencia artificial de Gemini no devolvió ninguna receta válida.');
      }

      // Parse JSON from Gemini
      let recipeData;
      try {
        recipeData = JSON.parse(rawText.trim());
      } catch (jsonErr) {
        console.error("Fallo al parsear respuesta JSON de Gemini. Respuesta cruda:", rawText);
        // Try extracting JSON if wrapped inside markdown code blocks
        const match = rawText.match(/\{[\s\S]*\}/);
        if (match) {
          recipeData = JSON.parse(match[0]);
        } else {
          throw new Error('Error al interpretar los datos culinarios. Reintente el escaneo.');
        }
      }

      // Add standard model fallback elements
      recipeData.id = 'gemini_' + Date.now();
      recipeData.image = 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800'; // Sleek fallback kitchen cover
      
      onSuccess(recipeData);

    } catch (error) {
      console.error("Error en conexión con la API de Gemini:", error);
      onError(error.message || 'Error de red inesperado al conectar con Gemini.');
    }
  }
}

window.FridgeScanner = FridgeScanner;
