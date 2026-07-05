/**
 * Leftover Chef - Recipes & Ingredients Database
 * This file contains the pre-populated ingredient list with nutritional profiles,
 * curated Thermomix TM5/TM6 compatible recipes, and matching scoring logic.
 */

// Category translations and icons
const CATEGORIES = {
  vegetables: { name: 'Verduras y Hortalizas', icon: '🥦' },
  proteins: { name: 'Carnes, Pescados y Legumbres', icon: '🍗' },
  dairy: { name: 'Lácteos y Huevos', icon: '🥚' },
  pantry: { name: 'Despensa y Condimentos', icon: '🧂' },
  fruits: { name: 'Frutas', icon: '🍎' }
};

// Base ingredient database with nutritional facts per 100g, accessory zones, and shelf life in days
const INGREDIENT_DATABASE = [
  // Vegetables
  { id: 'cebolla', name: 'Cebolla', category: 'vegetables', kcal: 40, protein: 1.1, carbs: 9.3, fat: 0.1, shelfDays: 21, zone: 'vaso' },
  { id: 'ajo', name: 'Ajo', category: 'vegetables', kcal: 149, protein: 6.4, carbs: 33, fat: 0.5, shelfDays: 60, zone: 'vaso' },
  { id: 'tomate', name: 'Tomate', category: 'vegetables', kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2, shelfDays: 4, zone: 'vaso' },
  { id: 'zanahoria', name: 'Zanahoria', category: 'vegetables', kcal: 41, protein: 0.9, carbs: 9.6, fat: 0.2, shelfDays: 14, zone: 'varoma_base' },
  { id: 'calabacin', name: 'Calabacín', category: 'vegetables', kcal: 17, protein: 1.2, carbs: 3.1, fat: 0.3, shelfDays: 4, zone: 'varoma_base' },
  { id: 'pimiento', name: 'Pimiento (Verde/Rojo)', category: 'vegetables', kcal: 20, protein: 0.9, carbs: 4.6, fat: 0.2, shelfDays: 5, zone: 'vaso' },
  { id: 'patata', name: 'Patata', category: 'vegetables', kcal: 77, protein: 2.0, carbs: 17, fat: 0.1, shelfDays: 30, zone: 'cestillo' },
  { id: 'champiñon', name: 'Champiñones / Setas', category: 'vegetables', kcal: 22, protein: 3.1, carbs: 3.3, fat: 0.3, shelfDays: 3, zone: 'vaso' },
  { id: 'brocoli', name: 'Brócoli', category: 'vegetables', kcal: 34, protein: 2.8, carbs: 6.6, fat: 0.4, shelfDays: 3, zone: 'varoma_base' },
  { id: 'espinacas', name: 'Espinacas', category: 'vegetables', kcal: 23, protein: 2.9, carbs: 3.6, fat: 0.4, shelfDays: 2, zone: 'varoma_base' },
  { id: 'calabaza', name: 'Calabaza', category: 'vegetables', kcal: 26, protein: 1.0, carbs: 6.5, fat: 0.1, shelfDays: 20, zone: 'varoma_base' },

  // Proteins
  { id: 'pollo', name: 'Pechuga de Pollo', category: 'proteins', kcal: 165, protein: 31, carbs: 0, fat: 3.6, shelfDays: 3, zone: 'varoma_bandeja' },
  { id: 'ternera', name: 'Carne de Ternera', category: 'proteins', kcal: 250, protein: 26, carbs: 0, fat: 15, shelfDays: 3, zone: 'varoma_bandeja' },
  { id: 'cerdo', name: 'Magro de Cerdo', category: 'proteins', kcal: 242, protein: 27, carbs: 0, fat: 14, shelfDays: 3, zone: 'varoma_bandeja' },
  { id: 'salmon', name: 'Salmón', category: 'proteins', kcal: 208, protein: 20, carbs: 0, fat: 13, shelfDays: 2, zone: 'varoma_bandeja' },
  { id: 'gambas', name: 'Gambas / Langostinos', category: 'proteins', kcal: 85, protein: 20, carbs: 0, fat: 0.5, shelfDays: 2, zone: 'varoma_bandeja' },
  { id: 'tofu', name: 'Tofu', category: 'proteins', kcal: 76, protein: 8.0, carbs: 1.9, fat: 4.8, shelfDays: 10, zone: 'cestillo' },
  { id: 'garbanzos', name: 'Garbanzos Cocidos', category: 'proteins', kcal: 164, protein: 8.9, carbs: 27, fat: 2.6, shelfDays: 180, zone: 'cestillo' },
  { id: 'lentejas', name: 'Lentejas Cocidas', category: 'proteins', kcal: 116, protein: 9.0, carbs: 20, fat: 0.4, shelfDays: 180, zone: 'cestillo' },

  // Dairy & Eggs
  { id: 'leche', name: 'Leche', category: 'dairy', kcal: 42, protein: 3.4, carbs: 5.0, fat: 1.0, shelfDays: 7, zone: 'vaso' },
  { id: 'queso_rallado', name: 'Queso Rallado (Parmesano/Gouda)', category: 'dairy', kcal: 389, protein: 26, carbs: 1.3, fat: 30, shelfDays: 14, zone: 'vaso' },
  { id: 'huevo', name: 'Huevos', category: 'dairy', kcal: 155, protein: 13, carbs: 1.1, fat: 11, shelfDays: 14, zone: 'cestillo' },
  { id: 'mantequilla', name: 'Mantequilla', category: 'dairy', kcal: 717, protein: 0.9, carbs: 0.1, fat: 81, shelfDays: 45, zone: 'vaso' },
  { id: 'nata', name: 'Nata para cocinar', category: 'dairy', kcal: 196, protein: 2.7, carbs: 4.0, fat: 19, shelfDays: 7, zone: 'vaso' },
  { id: 'yogur', name: 'Yogur Natural', category: 'dairy', kcal: 59, protein: 3.5, carbs: 4.7, fat: 3.3, shelfDays: 10, zone: 'vaso' },

  // Pantry & Condiments
  { id: 'aceite', name: 'Aceite de Oliva', category: 'pantry', kcal: 884, protein: 0, carbs: 0, fat: 100, shelfDays: 365, staple: true, zone: 'vaso' },
  { id: 'arroz', name: 'Arroz Redondo / Carnaroli', category: 'pantry', kcal: 360, protein: 6.6, carbs: 80, fat: 0.6, shelfDays: 180, zone: 'vaso' },
  { id: 'pasta', name: 'Pasta (Tallarines/Macarrones)', category: 'pantry', kcal: 350, protein: 12, carbs: 75, fat: 1.5, shelfDays: 180, zone: 'vaso' },
  { id: 'tomate_triturado', name: 'Tomate Triturado / Frito', category: 'pantry', kcal: 38, protein: 1.5, carbs: 7.5, fat: 0.2, shelfDays: 90, zone: 'vaso' },
  { id: 'caldo', name: 'Caldo de Verduras / Pollo', category: 'pantry', kcal: 15, protein: 0.5, carbs: 3.0, fat: 0.2, shelfDays: 90, zone: 'vaso' },
  { id: 'harina', name: 'Harina de Trigo', category: 'pantry', kcal: 364, protein: 10, carbs: 76, fat: 1.0, shelfDays: 180, staple: true, zone: 'vaso' },
  { id: 'sal', name: 'Sal', category: 'pantry', kcal: 0, protein: 0, carbs: 0, fat: 0, shelfDays: 365, staple: true, zone: 'vaso' },
  { id: 'pimienta', name: 'Pimienta Negra', category: 'pantry', kcal: 251, protein: 10, carbs: 64, fat: 3.3, shelfDays: 365, staple: true, zone: 'vaso' }
];

// Dictionary of culinary ingredient swaps
const INGREDIENT_SWAPS = {
  nata: [
    { id: 'yogur', name: 'Yogur Natural (Sustituto Ligero)', tip: 'Añadir al final sin hervir para mantener su textura cremosa' },
    { id: 'leche', name: 'Leche con Mantequilla (50/50)', tip: 'Emulsionar 2 min a 80°C vel 4' }
  ],
  mantequilla: [
    { id: 'aceite', name: 'Aceite de Oliva Virgen Extra', tip: 'Usar 80% de la cantidad indicada en la receta' }
  ],
  pollo: [
    { id: 'tofu', name: 'Tofu firme en trozos (Opción Vegana)', tip: 'Marinar previamente con ajo y especias' },
    { id: 'champiñon', name: 'Champiñones laminados gruesos', tip: 'Sofreír 4 min a 120°C vel cuchara ↺' }
  ],
  arroz: [
    { id: 'pasta', name: 'Pasta corta (maravilla / fideos)', tip: 'Mismo tiempo a 100°C vel 1 ↺' },
    { id: 'calabacin', name: 'Falso Arroz de Calabacín', tip: 'Triturar 4 seg vel 5 y cocinar al vapor 5 min' }
  ],
  leche: [
    { id: 'yogur', name: 'Yogur diluido en agua', tip: 'Mezclar suavemente en vel 3' }
  ],
  queso_rallado: [
    { id: 'pan_rallado', name: 'Pan rallado tostado con ajo y perejil', tip: 'Espolvorear al servir para dar crujiente' }
  ]
};

// Curated Thermomix TM5/TM6 Compatible Recipes
const PRESETS_RECIPES = [
  {
    id: 'crema_verduras',
    title: 'Crema Sedosa de Verduras de la Huerta',
    subtitle: 'El clásico reconfortante y saludable en 25 minutos',
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&q=80&w=800',
    prepTime: 25,
    portions: 4,
    diet: ['vegetarian', 'gluten-free', 'vegan'],
    difficulty: 'Fácil',
    // Ingredients needed with their quantities
    requiredIngredients: [
      { id: 'calabacin', amount: 300, display: '300g de Calabacín' },
      { id: 'zanahoria', amount: 150, display: '150g de Zanahoria' },
      { id: 'patata', amount: 150, display: '150g de Patata (pelada)' },
      { id: 'cebolla', amount: 100, display: '100g de Cebolla' },
      { id: 'aceite', amount: 30, display: '30g de Aceite de Oliva' },
      { id: 'caldo', amount: 400, display: '400g de Caldo o Agua' },
      { id: 'sal', amount: 5, display: '1 cucharadita de Sal' }
    ],
    // Optional/Staple items
    optionalIngredients: [
      { id: 'leche', display: '50g de Leche para suavizar (opcional)' },
      { id: 'queso_rallado', display: 'Queso rallado o quesitos para mantecar (opcional)' }
    ],
    // Cumulative nutrition for the whole recipe (will be split by portions)
    nutrition: {
      kcal: 680,     // ~170 kcal por ración
      protein: 12,   // ~3g por ración
      carbs: 76,     // ~19g por ración
      fat: 34        // ~8.5g por ración
    },
    // Thermomix step-by-step instructions
    steps: [
      {
        step: 1,
        text: 'Poner en el vaso la cebolla cortada en cuartos y el aceite de oliva.',
        tmSettings: { time: '4 seg', temp: 'Sin temp', speed: '5', reverse: false, accessory: 'Cuchilla' },
        speechText: 'Paso 1. Introduce la cebolla en cuartos y treinta gramos de aceite de oliva en el vaso. Cierra la tapa y tritura cuatro segundos a velocidad cinco.'
      },
      {
        step: 2,
        text: 'Sofreír las verduras iniciales para potenciar su sabor.',
        tmSettings: { time: '5 min', temp: '120°C / Varoma', speed: '1', reverse: false, accessory: 'Cuchilla' },
        speechText: 'Paso 2. Sofreímos. Programa cinco minutos a ciento veinte grados, o temperatura Varoma si tienes la TM5, a velocidad uno.',
        timer: 300 // 5 minutes in seconds
      },
      {
        step: 3,
        text: 'Añadir el calabacín troceado, la zanahoria en rodajas gruesas y la patata troceada.',
        tmSettings: { time: '4 seg', temp: 'Sin temp', speed: '4', reverse: false, accessory: 'Cuchilla' },
        speechText: 'Paso 3. Incorpora el calabacín, la zanahoria y la patata. Trocea cuatro segundos a velocidad cuatro.'
      },
      {
        step: 4,
        text: 'Verter el agua o caldo de verduras y la cucharadita de sal. Colocar el cubilete en la tapa.',
        tmSettings: { time: '20 min', temp: '100°C', speed: '1', reverse: false, accessory: 'Cubilete' },
        speechText: 'Paso 4. Vierte el caldo o agua y añade la cucharadita de sal. Programa veinte minutos a cien grados, velocidad uno. El aroma inundará tu cocina.',
        timer: 1200
      },
      {
        step: 5,
        text: 'Esperar 2 minutos a que baje ligeramente la temperatura. Añadir la leche o quesitos si se desea. Sujetar firmemente el cubilete con un paño de cocina y triturar.',
        tmSettings: { time: '1 min', temp: 'Triturar', speed: 'Progresiva 5-10', reverse: false, accessory: 'Cubilete' },
        speechText: 'Paso 5. Para el triturado perfecto y sedoso, espera a que baje un poco la temperatura. Sujeta firmemente el cubilete con la mano y tritura un minuto a velocidad progresiva de cinco a diez. ¡Cuidado con el vapor caliente!',
        timer: 60
      },
      {
        step: 6,
        text: 'Servir caliente en cuencos. Se puede decorar con un hilo de aceite de oliva crudo y unos costrones de pan.',
        tmSettings: { time: 'Servir', temp: 'Listo', speed: 'Listo', reverse: false, accessory: 'Plato' },
        speechText: '¡Tu crema está lista! Sírvela caliente. Puedes decorar con un hilo de aceite de oliva crudo o pimienta negra recién molida. ¡Buen provecho!'
      }
    ]
  },
  {
    id: 'risotto_champiñones',
    title: 'Risotto Cremoso de Champiñones y Parmesano',
    subtitle: 'El auténtico arroz italiano, perfecto y sin remover a mano',
    image: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?auto=format&fit=crop&q=80&w=800',
    prepTime: 30,
    portions: 3,
    diet: ['vegetarian', 'gluten-free'],
    difficulty: 'Media',
    requiredIngredients: [
      { id: 'arroz', amount: 250, display: '250g de Arroz para risotto (Carnaroli/Arborio)' },
      { id: 'champiñon', amount: 200, display: '200g de Champiñones cortados en láminas' },
      { id: 'cebolla', amount: 80, display: '80g de Cebolla' },
      { id: 'ajo', amount: 6, display: '2 dientes de Ajo' },
      { id: 'aceite', amount: 30, display: '30g de Aceite de Oliva' },
      { id: 'caldo', amount: 650, display: '650g de Caldo de verduras caliente' },
      { id: 'queso_rallado', amount: 50, display: '50g de Queso Parmesano rallado' },
      { id: 'mantequilla', amount: 20, display: '20g de Mantequilla fría' }
    ],
    optionalIngredients: [
      { id: 'pimienta', display: 'Pimienta negra molida al gusto' }
    ],
    nutrition: {
      kcal: 1440,    // ~480 kcal por ración
      protein: 30,   // ~10g por ración
      carbs: 216,    // ~72g por ración
      fat: 48        // ~16g por ración
    },
    steps: [
      {
        step: 1,
        text: 'Introducir en el vaso la cebolla, el ajo y el aceite de oliva. Picar.',
        tmSettings: { time: '3 seg', temp: 'Sin temp', speed: '5', reverse: false, accessory: 'Cuchilla' },
        speechText: 'Paso 1. Añade ochenta gramos de cebolla, los dos dientes de ajo y treinta gramos de aceite de oliva en el vaso. Cierra e inicia el picado durante tres segundos a velocidad cinco.'
      },
      {
        step: 2,
        text: 'Sofreír los aromáticos en la base del vaso.',
        tmSettings: { time: '3 min', temp: '120°C / Varoma', speed: '1', reverse: false, accessory: 'Cuchilla' },
        speechText: 'Paso 2. Sofreímos. Programa tres minutos a ciento veinte grados, o Varoma en la TM5, a velocidad uno.',
        timer: 180
      },
      {
        step: 3,
        text: 'Añadir los champiñones en láminas y sofreír ligeramente para que suelten sus jugos aromáticos.',
        tmSettings: { time: '3 min', temp: '120°C / Varoma', speed: 'cuchara', reverse: true, accessory: 'Giro Inverso ↺' },
        speechText: 'Paso 3. Agrega los doscientos gramos de champiñones laminados. Programa tres minutos a ciento veinte grados, velocidad cuchara con giro inverso activado, para no romper los champiñones.',
        timer: 180
      },
      {
        step: 4,
        text: 'Añadir el arroz para nacararlo (rehogarlo). Esto sella el grano y asegura la liberación correcta de almidón.',
        tmSettings: { time: '3 min', temp: '120°C / Varoma', speed: '1', reverse: true, accessory: 'Giro Inverso ↺' },
        speechText: 'Paso 4. Incorpora los doscientos cincuenta gramos de arroz. Sofreímos para nacarar el grano. Programa tres minutos a ciento veinte grados, velocidad uno con giro inverso activado.',
        timer: 180
      },
      {
        step: 5,
        text: 'Agregar el caldo de verduras caliente y una pizca de sal. En lugar del cubilete, colocar el cestillo sobre la tapa para favorecer la evaporación sin salpicaduras.',
        tmSettings: { time: '13 min', temp: '100°C', speed: '1', reverse: true, accessory: 'Cestillo sobre tapa' },
        speechText: 'Paso 5. Vierte los seiscientos cincuenta gramos de caldo caliente y sal al gusto. En lugar del cubilete, coloca el cestillo boca abajo sobre la tapa. Esto permite que el vapor escape de forma segura y el caldo reduzca perfectamente. Programa trece minutos a cien grados, velocidad uno con giro inverso.',
        timer: 780
      },
      {
        step: 6,
        text: 'Verter el arroz inmediatamente en una fuente llana. Añadir el queso Parmesano rallado y la mantequilla fría. Mezclar suavemente con la espátula para "mantecar" el arroz y dejar reposar 2 minutos antes de servir.',
        tmSettings: { time: '2 min', temp: 'Reposo', speed: 'Espátula', reverse: false, accessory: 'Fuente honda' },
        speechText: 'Paso final. Vierte el risotto en una fuente. Añade la mantequilla fría y el queso Parmesano rallado. Mezcla enérgicamente pero con cuidado usando la espátula. Este proceso liga la salsa y le da esa cremosidad espectacular. Deja reposar dos minutos y sirve de inmediato. ¡Delicioso!'
      }
    ]
  },
  {
    id: 'pollo_vapor_tomate',
    title: 'Pollo al Vapor con Brócoli y Salsa Rustica de Tomate',
    subtitle: 'Cocina en niveles (Varoma) limpia, saludable y súper sabrosa',
    image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&q=80&w=800',
    prepTime: 35,
    portions: 3,
    diet: ['gluten-free', 'low-carb'],
    difficulty: 'Media',
    requiredIngredients: [
      { id: 'pollo', amount: 450, display: '450g de Pechuga de pollo en tiras o filetes' },
      { id: 'brocoli', amount: 250, display: '250g de Ramilletes de Brócoli' },
      { id: 'patata', amount: 200, display: '200g de Patata cortada en rodajas de 1 cm' },
      { id: 'tomate_triturado', amount: 400, display: '400g de Tomate triturado en conserva' },
      { id: 'cebolla', amount: 100, display: '100g de Cebolla' },
      { id: 'ajo', amount: 6, display: '2 dientes de Ajo' },
      { id: 'aceite', amount: 35, display: '35g de Aceite de Oliva' }
    ],
    optionalIngredients: [
      { id: 'sal', display: 'Sal y pimienta para condimentar el pollo' },
      { id: 'pimienta', display: 'Especias al gusto (orégano, tomillo)' }
    ],
    nutrition: {
      kcal: 1110,    // ~370 kcal por ración
      protein: 108,  // ~36g por ración
      carbs: 60,     // ~20g por ración
      fat: 45        // ~15g por ración
    },
    steps: [
      {
        step: 1,
        text: 'Poner en el vaso el ajo, la cebolla y 20g de aceite de oliva. Picar.',
        tmSettings: { time: '5 seg', temp: 'Sin temp', speed: '5', reverse: false, accessory: 'Cuchilla' },
        speechText: 'Paso 1. Introduce los dos dientes de ajo, cien gramos de cebolla y veinte gramos de aceite de oliva en el vaso. Tritura cinco segundos a velocidad cinco.'
      },
      {
        step: 2,
        text: 'Sofreír la base de la salsa aromática.',
        tmSettings: { time: '3 min', temp: '120°C / Varoma', speed: '1', reverse: false, accessory: 'Cuchilla' },
        speechText: 'Paso 2. Programa tres minutos a ciento veinte grados, velocidad uno, para sofreír la cebolla y el ajo.',
        timer: 180
      },
      {
        step: 3,
        text: 'Añadir el tomate triturado y una cucharadita de sal al vaso. Introducir el cestillo dentro del vaso y colocar las patatas en rodajas dentro del cestillo.',
        tmSettings: { time: 'Montar', temp: 'Sin temp', speed: 'Manual', reverse: false, accessory: 'Cestillo interior' },
        speechText: 'Paso 3. Vierte el tomate triturado y sal en el vaso. Ahora introduce el cestillo metálico en el vaso y acomoda las patatas cortadas en rodajas de un centímetro dentro del cestillo.'
      },
      {
        step: 4,
        text: 'Colocar las tiras de pollo (salpimentadas y aderezadas con especias) y los ramilletes de brócoli repartidos en el recipiente Varoma y la bandeja superior. Asegurarse de dejar libres algunas ranuras centrales para el paso del vapor. Tapar el Varoma.',
        tmSettings: { time: 'Montar', temp: 'Sin temp', speed: 'Manual', reverse: false, accessory: 'Varoma completo' },
        speechText: 'Paso 4. Coloca el pollo condimentado y el brócoli en el recipiente Varoma y su bandeja intermedia. Deja siempre algunos huecos libres en el centro para que el vapor fluya con fuerza hacia arriba. Tapa el Varoma herméticamente.'
      },
      {
        step: 5,
        text: 'Colocar el Varoma en su posición sobre la tapa del vaso. Programar la cocción multinivel a temperatura Varoma.',
        tmSettings: { time: '25 min', temp: 'Varoma', speed: '1', reverse: false, accessory: 'Varoma acoplado' },
        speechText: 'Paso 5. Encaja el Varoma sobre la tapa del vaso. Programamos veinticinco minutos a temperatura Varoma, velocidad uno. El calor del tomate cocinándose abajo generará el vapor perfecto para cocinar el pollo y las patatas arriba de forma súper limpia.',
        timer: 1500
      },
      {
        step: 6,
        text: 'Retirar el Varoma con cuidado de no quemarse con el vapor. Extraer el cestillo con la espátula. Servir el pollo, brócoli y patatas en platos, y regar generosamente con la salsa de tomate concentrada del vaso.',
        tmSettings: { time: 'Servir', temp: 'Listo', speed: 'Listo', reverse: false, accessory: 'Espátula para cestillo' },
        speechText: '¡Plato completo terminado! Retira el Varoma de lado para evitar el golpe de vapor. Extrae el cestillo usando la muesca de la espátula. Sirve las patatas, el brócoli y las jugosas tiras de pollo en los platos y salsea con el riquísimo tomate del vaso. ¡Una delicia saludable y sin apenas manchar!'
      }
    ]
  }
];

/**
 * Calculates a match score (0-100) for a preset recipe based on a list of available ingredient IDs.
 * Categorizes ingredients into "matching", "missing but required", and "staples missing".
 */
function calculateRecipeMatch(recipe, availableIds) {
  const reqIngs = recipe.requiredIngredients;
  const availableSet = new Set(availableIds.map(id => id.toLowerCase()));
  
  let matchedCount = 0;
  let missingRequired = [];
  let missingStaples = [];
  
  reqIngs.forEach(req => {
    const dbItem = INGREDIENT_DATABASE.find(item => item.id === req.id);
    const isStaple = dbItem ? !!dbItem.staple : false;
    
    if (availableSet.has(req.id)) {
      matchedCount++;
    } else {
      if (isStaple) {
        missingStaples.push(req);
      } else {
        missingRequired.push(req);
      }
    }
  });

  // Calculate score based primarily on non-staple required ingredients
  const nonStapleReqs = reqIngs.filter(req => {
    const dbItem = INGREDIENT_DATABASE.find(item => item.id === req.id);
    return dbItem ? !dbItem.staple : true;
  });

  const matchedNonStaple = nonStapleReqs.filter(req => availableSet.has(req.id)).length;
  
  let score = 0;
  if (nonStapleReqs.length > 0) {
    score = Math.round((matchedNonStaple / nonStapleReqs.length) * 100);
  } else {
    // If only staples are in the recipe (rare), match rate on all items
    score = Math.round((matchedCount / reqIngs.length) * 100);
  }

  // Boost score slightly if they have optional ingredients!
  let extraMatches = 0;
  recipe.optionalIngredients.forEach(opt => {
    if (availableSet.has(opt.id)) {
      extraMatches++;
    }
  });
  score = Math.min(100, score + (extraMatches * 5));

  return {
    score,
    matchedCount,
    totalRequired: reqIngs.length,
    missingRequired,
    missingStaples
  };
}

/**
 * Fallback AI-like local recipe generator when the user has custom/scanned ingredients
 * that don't perfectly align with presets, creating a fully dynamic cooking instruction set.
 */
function generateProceduralRecipe(availableIds, dietaryFilters = []) {
  const availableItems = INGREDIENT_DATABASE.filter(item => availableIds.includes(item.id));
  if (availableItems.length === 0) return null;

  // Split ingredients by category
  const veggies = availableItems.filter(i => i.category === 'vegetables');
  const proteins = availableItems.filter(i => i.category === 'proteins');
  const dairies = availableItems.filter(i => i.category === 'dairy');
  const pantries = availableItems.filter(i => i.category === 'pantry');

  // Decide recipe direction based on available ingredients
  let title = 'Salteado al Vapor Express Thermomix';
  let subtitle = 'Plato único personalizado con tus ingredientes frescos';
  let diet = ['gluten-free'];
  let difficulty = 'Fácil';
  let prepTime = 20;
  let portions = 2;
  
  let requiredIngredients = [];
  let steps = [];

  // Construct required ingredients list
  availableItems.forEach(item => {
    requiredIngredients.push({
      id: item.id,
      amount: item.category === 'vegetables' ? 150 : (item.category === 'proteins' ? 200 : 50),
      display: `${item.category === 'vegetables' ? '150g' : (item.category === 'proteins' ? '200g' : '50g/ml')} de ${item.name}`
    });
  });

  // Ensure olive oil and salt are in ingredients
  if (!availableIds.includes('aceite')) {
    requiredIngredients.push({ id: 'aceite', amount: 20, display: '20g de Aceite de Oliva (Esencial)' });
  }
  if (!availableIds.includes('sal')) {
    requiredIngredients.push({ id: 'sal', amount: 5, display: '1 pizca de Sal' });
  }

  // Calculate customized nutrition dynamically based on amounts
  let totalKcal = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  requiredIngredients.forEach(req => {
    const dbItem = INGREDIENT_DATABASE.find(item => item.id === req.id);
    if (dbItem) {
      const factor = req.amount / 100;
      totalKcal += dbItem.kcal * factor;
      totalProtein += dbItem.protein * factor;
      totalCarbs += dbItem.carbs * factor;
      totalFat += dbItem.fat * factor;
    }
  });

  // Check dietary properties
  const hasMeat = availableItems.some(i => i.category === 'proteins' && ['pollo', 'ternera', 'cerdo'].includes(i.id));
  const hasFish = availableItems.some(i => i.id === 'salmon' || i.id === 'gambas');
  const hasDairy = availableItems.some(i => i.category === 'dairy');

  if (!hasMeat && !hasFish) {
    diet.push('vegetarian');
    if (!hasDairy) {
      diet.push('vegan');
    }
  }

  // Apply dietary filters to customize naming/flow slightly
  if (dietaryFilters.includes('low-carb') || dietaryFilters.includes('keto')) {
    title = 'Bowl Cetogénico Multiverduras y Proteína';
    subtitle = 'Alto en proteínas y grasas saludables, bajo en carbohidratos';
  } else if (veggies.length > 3 && proteins.length === 0) {
    title = 'Minestrone de Verduras y Hierbas Aromáticas';
    subtitle = 'Una sopa/crema rústica llena de vitaminas';
    prepTime = 25;
  } else if (proteins.length > 0 && veggies.length > 0) {
    const mainProtein = proteins[0].name;
    const mainVeggie = veggies[0].name;
    title = `${mainProtein} Guisado con Toque de ${mainVeggie}`;
    subtitle = 'Un guiso reconfortante y equilibrado hecho al Varoma';
    prepTime = 30;
  }

  // Step 1: Aromatics chopping
  const aromaticVeggies = veggies.filter(v => ['cebolla', 'ajo', 'pimiento'].includes(v.id));
  const aromaticNames = aromaticVeggies.map(v => v.name).join(' y ') || 'Cebolla';
  steps.push({
    step: 1,
    text: `Picar los aromáticos: Introducir en el vaso ${aromaticNames} junto con 20g de aceite de oliva.`,
    tmSettings: { time: '5 seg', temp: 'Sin temp', speed: '5', reverse: false, accessory: 'Cuchillas' },
    speechText: `Paso 1. Introduce ${aromaticNames} en trozos y veinte gramos de aceite de oliva en el vaso. Tritura cinco segundos a velocidad cinco.`
  });

  // Step 2: Sauté aromatics
  steps.push({
    step: 2,
    text: 'Sofreír las verduras base con el aceite.',
    tmSettings: { time: '3 min', temp: '120°C / Varoma', speed: '1', reverse: false, accessory: 'Cuchillas' },
    speechText: 'Paso 2. Sofreímos. Programa tres minutos a ciento veinte grados, velocidad uno.',
    timer: 180
  });

  // Step 3: Add main vegetables and chop
  const otherVeggies = veggies.filter(v => !['cebolla', 'ajo', 'pimiento'].includes(v.id));
  if (otherVeggies.length > 0) {
    const otherNames = otherVeggies.map(v => v.name).join(', ');
    steps.push({
      step: 3,
      text: `Incorporar al vaso: ${otherNames} troceados en tamaños similares.`,
      tmSettings: { time: '4 seg', temp: 'Sin temp', speed: '4', reverse: false, accessory: 'Cuchillas' },
      speechText: `Paso 3. Añade al vaso el ${otherNames}. Trocea cuatro segundos a velocidad cuatro.`
    });
  }

  // Step 4: Add proteins or cook steam
  if (proteins.length > 0) {
    const protNames = proteins.map(p => p.name).join(' y ');
    steps.push({
      step: steps.length + 1,
      text: `Añadir el ${protNames} salpimentado en tiras al vaso (o en el cestillo si son pescados/gambas). Añadir 100g de agua o caldo.`,
      tmSettings: { time: '12 min', temp: '100°C', speed: 'cuchara', reverse: true, accessory: 'Giro Inverso ↺' },
      speechText: `Paso 4. Incorpora el ${protNames} cortado en dados o tiras salpimentadas. Añade cien gramos de agua o caldo de verduras. Programa doce minutos a cien grados, velocidad cuchara con giro inverso para mimar los trozos de proteína.`,
      timer: 720
    });
  } else {
    // Cook vegetables alone
    steps.push({
      step: steps.length + 1,
      text: 'Añadir 150g de agua o caldo al vaso para cocinar las verduras.',
      tmSettings: { time: '10 min', temp: '100°C', speed: '1', reverse: true, accessory: 'Giro Inverso ↺' },
      speechText: 'Paso 4. Vierte ciento cincuenta gramos de agua o caldo y añade sal. Cocinamos las verduras programando diez minutos a cien grados, velocidad uno con giro inverso.',
      timer: 600
    });
  }

  // Step 5: Dairy/Staple bindings (cream/cheese)
  if (dairies.length > 0) {
    const dairyNames = dairies.map(d => d.name).join(' o ');
    steps.push({
      step: steps.length + 1,
      text: `Para ligar y dar cremosidad, añadir ${dairyNames} y mezclar suavemente.`,
      tmSettings: { time: '1 min', temp: '90°C', speed: '1.5', reverse: true, accessory: 'Giro Inverso ↺' },
      speechText: `Paso 5. Agrega el ${dairyNames} para ligar todos los jugos. Programa un minuto a noventa grados, velocidad uno y medio, giro inverso.`,
      timer: 60
    });
  }

  // Final serving step
  steps.push({
    step: steps.length + 1,
    text: 'Retirar el vaso, verter en una fuente templada y espolvorear con especias al gusto. Servir inmediatamente.',
    tmSettings: { time: 'Servir', temp: 'Listo', speed: 'Listo', reverse: false, accessory: 'Plato' },
    speechText: '¡Tu plato personalizado de Leftover Chef está terminado! Sírvelo caliente y disfruta de esta deliciosa receta saludable hecha a tu medida. ¡Buen provecho!'
  });

  return {
    id: 'procedural_custom',
    title,
    subtitle,
    image: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&q=80&w=800',
    prepTime: '20-25 min',
    portions: '2-3 personas',
    difficulty: 'Fácil',
    diet,
    requiredIngredients,
    optionalIngredients: [],
    modelCompatibility: ['TM5', 'TM6'],
    matchingIngredients: availableIds,
    missingIngredients: [],
    nutrition: {
      kcal: Math.round(totalKcal),
      protein: Math.round(totalProtein),
      carbs: Math.round(totalCarbs),
      fat: Math.round(totalFat)
    },
    steps
  };
}

/**
 * Generates a structured 3-Day Zero-Waste Meal Plan
 * Returns 6 distinct meals (3 Days x Lunch & Dinner)
 */
function generateWeeklyMealPlan(availableIds) {
  const matches = findMatchingRecipes(availableIds);
  const plan = [];

  const days = ['Día 1', 'Día 2', 'Día 3'];
  const types = [
    { name: '☀️ Almuerzo Principal' },
    { name: '🌙 Cena Cero Desperdicio' }
  ];

  let recipeIndex = 0;

  days.forEach((day, dIdx) => {
    types.forEach((type, tIdx) => {
      let selectedRecipe = null;
      if (matches[recipeIndex]) {
        selectedRecipe = matches[recipeIndex].recipe;
        recipeIndex++;
      } else {
        // Procedural fallback meal
        selectedRecipe = generateProceduralRecipe(availableIds);
      }

      plan.push({
        id: `plan_d${dIdx + 1}_t${tIdx + 1}`,
        dayNumber: dIdx + 1,
        dayLabel: day,
        mealType: type.name,
        recipe: selectedRecipe,
        savedGrams: Math.floor(Math.random() * 180 + 120)
      });
    });
  });

  return plan;
}

// Exports for modular frontend usage
window.INGREDIENT_DATABASE = INGREDIENT_DATABASE;
window.CATEGORIES = CATEGORIES;
window.PRESETS_RECIPES = PRESETS_RECIPES;
window.calculateRecipeMatch = calculateRecipeMatch;
window.generateProceduralRecipe = generateProceduralRecipe;
window.generateWeeklyMealPlan = generateWeeklyMealPlan;
