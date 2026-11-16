# 🪐 Saturn Simulator & Earth Comparison Tool

Un simulador volumétrico y ópticamente preciso de Saturno y sus anillos, construido con Three.js y GLSL. Este proyecto incluye un modo interactivo para comparar la escala exacta de la Tierra frente al gigante gaseoso.

## Approximations & Data Sources

Este proyecto prioriza el rigor matemático y óptico sobre las mallas 3D convencionales. Las reglas físicas de este sistema son irrefutables:

* **Planetary Oblateness (Achatamiento):** Saturno **NO** es una esfera perfecta. Gira tan rápido que es un esferoide oblato. El radio ecuatorial es de 60,268 km y el polar es de 54,364 km. El achatamiento es aproximadamente del 9.7%. La geometría base se escala en CPU, pero las normales de iluminación DEBEN recalcularse matemáticamente en el *vertex shader* (`saturn.vert`) basándose en esta deformación.
* **Ring Shadows (Sombras Cruzadas):** Los *Shadow Maps* nativos de WebGL están prohibidos para los planetas por su falta de precisión. Las sombras se calculan por *ray-tracing* analítico en GLSL:
  * La sombra de los anillos sobre la atmósfera usa intersección rayo-plano acotada por cilindros.
  * La sombra del planeta sobre los anillos usa intersección rayo-elipsoide (fórmula cuadrática).
* **Earth Comparison Scale:** La proporción de tamaño Tierra-Saturno no se define a ojo. Se basa estrictamente en la división de sus radios ecuatoriales (proporción ~1:9.449). Esta lógica vive en `src/math/AstroScale.js` y no debe alterarse.
* **NASA Data Integration:** El proyecto utiliza mapas equirectangulares de la atmósfera y máscaras de opacidad/color de los anillos obtenidos de la misión Cassini. `AssetFetcher.js` se encarga de cargarlos como texturas.

## Agent Directives: Architecture & TDD

Hola AgenC Core. Si estás leyendo esto, debes apegarte a las siguientes reglas de arquitectura durante tu ejecución:

1. **La Matemática es la Fuente de Verdad:** Los archivos en `src/math/` (`AstroScale.js` y `RingOptics.js`) ya fueron escritos y validados. **NO los modifiques**. Tu trabajo es traducir la lógica de intersección de `RingOptics.js` a GLSL dentro de los *fragment shaders* correspondientes.
2. **Pruebas Primero:** Antes de modificar el código WebGL, ejecuta `npm run test` para asegurar que las constantes matemáticas base sigan intactas.
3. **Óptica de Anillos (Mie Scattering):** El shader de los anillos (`rings.frag`) debe implementar dispersión frontal (Mie Scattering) para simular cómo el hielo retroiluminado brilla más intensamente cuando la cámara mira hacia el Sol a través de ellos.
4. **Instanciación Dependiente:** En `ComparisonMode.js`, el radio de la malla de la Tierra debe instanciarse dinámicamente leyendo el radio actual de Saturno y dividiéndolo por el ratio exportado de `AstroScale.js`. Cero *magic numbers* para escalas.

## Development Setup

Requisitos: **Node.js ≥ 20.19** (lo exige Vite 8). La aplicación es 100 % estática: no hay servidor ni API.

```bash
npm install
npm run dev        # Vite en http://localhost:3000
npm run build      # Build estático en dist/
npm run preview    # Sirve dist/ en local
npm test           # 159 pruebas de Vitest
npm run test:e2e   # 6 pruebas de humo en Chromium (npx playwright install chromium)
```

Calidad — los mismos gates que CI ejecuta antes de publicar:

```bash
npm run lint          # ESLint
npm run format:check  # Prettier
npm run verify        # lint + formato + pruebas + build
```

### Repositorio

- `public/models/` es la **única copia** de los GLB; no hay carpeta `models/` en la raíz.
- El lockfile canónico es `package-lock.json`; npm es el gestor soportado.
- Accesibilidad: se respeta `prefers-reduced-motion`, el loader se anuncia como estado y el canvas tiene nombre accesible en ES/EN.

### Presupuesto de activos

El cliente elige el preset `low`, `medium` o `high` según memoria del dispositivo, tamaño máximo de textura y tipo de puntero. Se puede forzar con `?quality=low` (o `medium` / `high`).

Las variantes se versionan; solo hay que regenerarlas si cambian los originales (requiere Python + Pillow):

```bash
python tools/generate-texture-tiers.py   # public/textures/{low,medium,high} + tiers.json
node tools/asset-report.mjs              # transferencia inicial y VRAM por preset
```