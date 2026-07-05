# Leftover Chef 🍳

**Leftover Chef** es una aplicación web móvil-primero diseñada para ayudarte a crear deliciosas recetas para la **Thermomix** en base a fotos del interior de tu refrigerador. La aplicación detecta los ingredientes disponibles, calcula perfiles nutricionales completos e integra un asistente de cocina interactivo con comandos de voz manos libres.

---

## ✨ Características Premium

### 1. Escaneo Inteligente Multi-Foto 📸
Sube una o varias fotos del interior de tu refrigerador. El escáner ejecuta una animación secuencial de láser en canvas y dibuja cajas de selección computacionales sobre los ingredientes detectados, agrupando los elementos encontrados en tiempo real.

### 2. Distribución en Niveles (Varoma Stack) 🥘
Visualiza exactamente dónde se cocinan los ingredientes en tu Thermomix. La app mapea de forma dinámica la distribución física en cuatro niveles:
- **Bandeja Varoma** (vegetales finos, pollo, pescados)
- **Recipiente Varoma** (vegetales densos)
- **Cestillo interior** (patatas, arroz, huevos, legumbres)
- **Vaso de Mezclas** (salsas, cebolla, caldos, condimentos)

### 3. Asistente Manos Libres por Voz 🎤
Cocina de forma limpia y cómoda. En el **Modo Cocina**, activa el micrófono y controla el paso a paso mediante órdenes de voz:
- *"Siguiente"* / *"Avanzar"* para ir al siguiente paso.
- *"Atrás"* / *"Anterior"* para retroceder de paso.
- *"Repetir"* para que la app lea de nuevo la instrucción (Text-to-Speech).
- *"Pausar"* / *"Iniciar"* para controlar los temporizadores de cocción.

### 4. Calculador de Sostenibilidad 🌱
Mide tu contribución ecológica al reducir el desperdicio de alimentos:
- Gramos de comida rescatados.
- Emisiones de CO₂ evitadas.
- Dinero estimado ahorrado.

### 5. Progressive Web App (PWA) 📱
La aplicación es instalable en dispositivos móviles o computadoras. Su Service Worker integrado almacena en caché local las dependencias para garantizar un funcionamiento **100% offline** en la encimera de tu cocina.

### 6. Respaldos Automáticos (Auto-Sync) 🔄
Vigila en segundo plano los cambios del proyecto en tu carpeta local `scratch` y los sube automáticamente a GitHub en un intervalo de 5 segundos tras realizar cualquier modificación.

---

## 🚀 Cómo Iniciar el Proyecto

### 1. Iniciar el Servidor Web Local
Ejecuta el servidor estático nativo de Node.js en el puerto 3000:
```bash
npm start
```
Abre en tu navegador la URL: `http://localhost:3000`.

### 2. Iniciar el Vigilante de Auto-Sync
Para mantener tus cambios respaldados en GitHub de forma automática mientras editas, inicia el vigilante:
```bash
npm run watch-sync
```

---

## ⚙️ Configuración del Token de GitHub
El vigilante de respaldos automáticos lee las credenciales del archivo local `.env` (excluido en `.gitignore` para mayor seguridad):
```ini
GITHUB_TOKEN=tu_token_aqui
GITHUB_USER=tu_usuario
GITHUB_REPO=leftover-chef
```