/**
 * Shared Gemini scan prompt + response parser.
 * Used by the browser scanner and the Node proxy so the API key never
 * has to live in the client when GEMINI_API_KEY is set on the server.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (typeof root === 'object') {
    root.LeftoverGemini = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const MODEL = 'gemini-2.5-flash';
  const MAX_IMAGES = 4;
  const ALLOWED_MIME = {
    'image/jpeg': true,
    'image/jpg': true,
    'image/png': true,
    'image/webp': true
  };

  function buildGeminiScanPrompt(dietaryFilters, targetModel) {
    const diets = Array.isArray(dietaryFilters) && dietaryFilters.length
      ? dietaryFilters.join(', ')
      : 'ninguna en particular';
    const model = targetModel || 'TM6';
    return `Actúa como un chef experto con estrellas Michelin y especialista en cocina de Thermomix (modelos TM5 y TM6, objetivo ${model}).
Analiza detalladamente las fotos provistas del interior del refrigerador.
Identifica todos los ingredientes visibles (vegetales, carnes, lácteos, salsas, etc.).

Tu tarea es crear una receta espectacular y detallada para preparar en Thermomix basándote principalmente en estos ingredientes encontrados.
Puedes dar por hecho que el usuario cuenta en su despensa con condimentos básicos o indispensables: aceite de oliva, ajo, cebolla, sal, pimienta, harina y agua.

La receta generada DEBE ser 100% compatible con los modelos TM5 y TM6.
Elige un título sugerente y un subtítulo moderno.
Indica las porciones (e.g. 3 raciones), la dificultad (Fácil, Media, Alta), el tiempo total de preparación (e.g., 30 minutos).
Detalla si el plato cumple de forma natural con estas dietas: ${diets}.

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
{"detectedIngredients":["zanahoria","cebolla","pollo"],"title":"Título de la Receta","subtitle":"Subtítulo ameno","prepTime":30,"portions":3,"diet":["vegetarian","gluten-free"],"difficulty":"Fácil","requiredIngredients":[{"id":"zanahoria","amount":150,"display":"150g de Zanahoria cortada en rodajas"}],"optionalIngredients":[{"id":"pimienta","display":"Pimienta negra recién molida al gusto"}],"nutrition":{"kcal":380,"protein":12,"carbs":55,"fat":14},"steps":[{"step":1,"text":"Poner la cebolla y el ajo en el vaso y picar.","tmSettings":{"time":"5 seg","temp":"Sin temp","speed":"5","reverse":false,"accessory":"Cuchilla"},"speechText":"Paso 1. Añade la cebolla y el ajo en el vaso. Cierra la tapa y pica cinco segundos a velocidad cinco.","timer":5}]}`;
  }

  function normalizeImages(images) {
    if (!Array.isArray(images)) return [];
    return images.slice(0, MAX_IMAGES).map((img) => {
      const mimeType = String((img && (img.mimeType || img.mime)) || 'image/jpeg').toLowerCase();
      let data = String((img && img.data) || '');
      const comma = data.indexOf(',');
      if (data.startsWith('data:') && comma !== -1) {
        data = data.slice(comma + 1);
      }
      return { mimeType, data };
    }).filter((img) => img.data && ALLOWED_MIME[img.mimeType]);
  }

  function buildGeminiRequestBody(images, dietaryFilters, targetModel) {
    const normalized = normalizeImages(images);
    const prompt = buildGeminiScanPrompt(dietaryFilters, targetModel);
    return {
      contents: [{
        parts: [
          { text: prompt },
          ...normalized.map((img) => ({
            inlineData: { data: img.data, mimeType: img.mimeType === 'image/jpg' ? 'image/jpeg' : img.mimeType }
          }))
        ]
      }],
      generationConfig: { responseMimeType: 'application/json' }
    };
  }

  function parseGeminiRecipeResponse(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      throw new Error('La inteligencia artificial de Gemini no devolvió ninguna receta válida.');
    }
    const trimmed = rawText.trim();
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      const match = trimmed.match(/\{[\s\S]*\}/);
      if (!match) {
        throw new Error('Error al interpretar los datos culinarios. Reintente el escaneo.');
      }
      return JSON.parse(match[0]);
    }
  }

  return {
    MODEL,
    MAX_IMAGES,
    ALLOWED_MIME,
    buildGeminiScanPrompt,
    normalizeImages,
    buildGeminiRequestBody,
    parseGeminiRecipeResponse
  };
});
