# Spec: Saturn Simulator — línea base y habilitación del siguiente incremento

| Campo | Valor |
|---|---|
| Estado | **Aprobada** — 2026-11-16, aprobación humana explícita |
| Fecha | 2026-11-16 |
| Commit analizado | `587e9ad` · rama `main` · árbol de trabajo limpio (53 commits) |
| Alcance | Análisis del repositorio. **Sin cambios de código**: este documento es el único artefacto nuevo |
| Autor | Análisis automatizado (agente) sobre el código y su ejecución real |

> **Regla del flujo:** Plan → Tasks → Implement no comienzan hasta que este documento se apruebe. Las cifras de este documento son reproducibles con los comandos de §3.

## Resumen

- El proyecto es un **observatorio 3D de Saturno** (Three.js + GLSL + Express) con una decena de módulos de simulación, 6 misiones históricas, instrumento óptico emulado, estudio de texturas por IA y UI bilingüe ES/EN.
- La base es sólida: matemática aislada y documentada, **106 pruebas en 26 archivos que pasan (2,1 s)** y build de producción correcto (**911,54 kB JS / 243,14 kB gzip**).
- El riesgo principal no está en el código de física, sino en **operación y presupuesto de recursos**: el despliegue configurado (GitHub Pages, estático) no puede servir el API de texturas; la carga inicial es de ~38 MB bloqueantes y las texturas decodificadas suman ~416 MB RGBA.
- Hay deuda de ingeniería acotada y barata de cerrar: **sin lint, sin typecheck, sin pruebas en CI**, duplicación de 18,2 MB de modelos y contenido de misiones solo en español.
- Este documento fija el contrato **tal como está** y deja 6 candidatos de siguiente incremento sin planificar, para que el humano elija uno.

---

## 0. Supuestos (corrígeme antes de planificar)

1. **Producción = GitHub Pages**, porque `deploy.yml` publica únicamente `dist/`. El servidor Express existe, pero si no es el destino real, el hallazgo H-01 baja de severidad.
2. El **siguiente incremento no está definido**. Esta spec describe el sistema actual y propone candidatos; no elige por ti.
3. La arquitectura se mantiene: **cliente Three.js + servidor Express de una ruta**, sin base de datos, sin cuentas, sin persistencia de usuario.
4. **No se añaden dependencias** ni se modifican `src/math/*` (prohibido en `README.md:20`) sin aprobación explícita.
5. El producto es **divulgación educativa**, no efemérides de precisión (ver §10.3). Las posiciones son plausibles, no certificadas.

→ Si alguna es incorrecta, dímelo y ajusto el documento antes de cualquier plan.

---

## 1. Objetivo

Construir un simulador visualmente riguroso del sistema de Saturno — atmósfera, anillos y lunas — con tres ejes de producto:

1. **Rigor óptico y geométrico**: esferoide oblato real, sombras analíticas por ray-tracing en GLSL, dispersión Mie en los anillos, escala Tierra–Saturno derivada de datos NASA.
2. **Exploración histórica**: seis misiones (Pioneer 11, Voyager 1/2, Cassini–Huygens, Huygens, Gran Final) con trayectoria, hitos y cámara de instrumento óptico.
3. **Laboratorio interactivo**: máquina del tiempo, captura tipo archivo JPL y generación de texturas con IA sobre los cuerpos.

**Propósito de esta spec** (el incremento actual): establecer la línea base verificable del sistema — qué hace, cómo se ejecuta, dónde están sus límites — y habilitar una decisión informada sobre el próximo incremento. **Éxito =** un ingeniero o agente puede entender, ejecutar y extender el proyecto sin leer 6.000 líneas, y el humano puede elegir el siguiente corte con criterios explícitos.

**Usuario objetivo:** persona interesada en astronomía y visualización científica; en móvil de gama media y escritorio; en español o inglés.

---

## 2. Stack técnico (versiones verificadas en ejecución)

| Capa | Tecnología | Versión |
|---|---|---|
| Runtime | Node.js | 26.13.0 local · 20 en CI |
| Bundler | Vite | 8.3.8 (declarado `^8.3.6`) |
| Render | three.js | 0.187 |
| Animación de cámara | GSAP | 3.15.1 |
| Servidor | Express | 5.3.0 |
| IA de imágenes | `@google/genai` | 3.3.0 · modelo `gemini-nano-banana-2.1` |
| Pruebas | Vitest | 5.1.0 |
| Shaders | GLSL (`vite-plugin-glsl`) | `.vert` / `.frag` |
| Lenguaje | JavaScript ESM en cliente; TypeScript en servidor | `tsconfig` strict, `noEmit` |

- No hay framework de UI: el DOM es `index.html` (417 líneas) manipulado a mano.
- Calidad: ESLint 10 (flat config, JavaScript), Prettier 3.10, TypeScript 7 con `tsc --noEmit`, y `engines.node >= 22.18.0`.
- Dos lockfiles versionados: `package-lock.json` y `bun.lock` (H-06, pendiente).

---

## 3. Comandos (ejecutados, no supuestos)

```bash
npm install                # lockfile canónico para CI: package-lock.json
npm run dev                # node server.ts → Express + Vite middleware en :3000
npm run start              # idéntico a dev
npm run build              # vite build → dist/
npm run preview            # vite preview
npx vitest run             # 26 archivos · 106 pruebas · ~2,1 s

# Gates de calidad (desde 2026-11-16)
npm run lint               # ESLint 10 (flat config, JavaScript)
npm run format:check       # Prettier 3
npm run typecheck          # tsc --noEmit (servidor, strict)
npm run verify             # los cinco gates + build
```

Salidas medidas el 2026-11-16:

| Comando | Resultado |
|---|---|
| `npx vitest run` | **26/26 archivos, 106/106 pruebas OK**, exit 0 |
| `npm run build` | `index.html 27,01 kB` · `css 29,73 kB` · `js 911,54 kB` (gzip 243,14 kB), ~1 s |
| `dist/` | 38,0 MB en total (modelos 18,2 MB + texturas ~14 MB + audio 1,4 MB + resto) |

**Calidad (desde 2026-11-16):** `lint`, `format:check`, `typecheck` y `verify` existen y CI los ejecuta antes de publicar. Sigue faltando `test:coverage` y `test:e2e` (ver `test-depth`).

**Requisito de Node declarado:** `engines.node: ">=22.18.0"`; CI pasó a Node 22.18.0. El servidor depende del *type stripping* nativo de TypeScript.

---

## 4. Estructura del proyecto

```
index.html                 Shell DOM: HUD, navegación, tiempo, estadísticas, instrumento
server.ts                  Express 5: /api/health, /api/textures/generate, estáticos en prod
server/textureHandler.ts   Gemini: prompt, reintentos 429/503, mapeo de errores, key en servidor
src/main.js                Orquestación (1.304 líneas): bootstrap, wiring del HUD, reloj, tick
src/core/                  Simuladores y controladores (28 archivos, 4.130 líneas)
  SaturnSimulator            Planeta + anillos, registro de sombras de lunas (6 ranuras)
  MoonSimulatorBase           Base Kepleriana: geometría, material, etiqueta, sombra
  Titan/Enceladus/Mimas/      Lunas principales (GLB cuando existe, esfera procedural si no)
  Tethys/Dione/Rhea/Iapetus
  FRing/DiffuseRings          Anillo F instanciado (15.000 rocas) + G/E volumétricos
  MinorMoonsSimulator         135 lunas irregulares instanciadas desde JSON
  MissionSimulator          Trayectorias Catmull-Rom, hitos, sondas GLB, cámara de instrumento
  CameraController          Foco con GSAP, aterrizaje en superficie, bloqueo de instrumento
  SolarLensFlare            Oclusión Sol por Saturno/lunas/anillos + ghosts y streak
  StarfieldSimulator        Fondo galáctico 8K con exposición reactiva al Sol
  SunSimulator              Disco solar anclado al far plane
  Telemetry/Stats/OrbitPaths/TimeHistory/SnapshotExporter/Localization
  TextureStudioController   Overrides de textura con baseline y restauración
  TexturePromptCatalog      Catálogo de 8 objetivos + prompts + validación
src/math/                  FUENTE DE VERDAD (no modificar sin aprobación)
  AstroScale                 Constantes NASA, oblateness, ratio Tierra–Saturno, ápsides
  KeplerOrbit                Ecuación de Kepler (Newton) y muestreo de órbitas
  RingOptics                 Intersección rayo-plano y rayo-elipsoide
  TimeScale                  Mapeo slider [0..100] ↔ multiplicador [0..100]
src/shaders/               16 archivos GLSL + VintageOpticsShader.js (post-proceso)
src/data/HistoricalMissions.js   6 misiones: control points, hitos, instrumentos
src/assets/               Restos de plantilla Vite, sin referencias
tests/                    26 archivos, 2.351 líneas, entorno node
public/                   Texturas, audio, GLB, minor_moons.json, iconos
models/                   Copia idéntica de public/models (18,2 MB) — redundante
dist/                     Build de producción (ignorado por git)
```

Direcciones de dependencia (sin ciclos): `assets` → `astro-core` → `scene-render` → `moons` → `missions` → `optical-instrument`; `ui-shell` consume todos.

---

## 5. Estilo de código

Un ejemplo real vale más que tres párrafos:

```js
// src/math/AstroScale.js — estilo del proyecto
export function calculateOblateness(radiusEq, radiusPolar) {
  if (radiusEq <= 0) throw new Error("El radio ecuatorial debe ser mayor a cero.");
  return (radiusEq - radiusPolar) / radiusEq;
}
```

Convenciones observadas:

- **ESM siempre**; sin `require`, sin *barrel files*. Exportaciones nombradas (única excepción: el objeto de shader de post-proceso).
- **2 espacios**, punto y coma, comillas simples en `src/core/` y dobles en `src/math/` (sin formateador que lo unifique).
- **Comentarios y mensajes de error en español**; identificadores en inglés. Los shaders documentan la fórmula física en el propio GLSL.
- **Constantes de dominio arriba del módulo** en `UPPER_SNAKE_CASE` (`ASTEROID_COUNT`, `MAX_TIME_HISTORY`, `TRANSITION_DURATION`). Los *magic numbers* de física están prohibidos por `README.md:23`.
- **Inyección por constructor** para todo lo que se prueba: `assets`, `fetchImpl`, `storage`, `createTextureFromUrl`, `textureLoader`. Es la razón por la que las 106 pruebas corren sin navegador.
- **Sin estado global** salvo el orquestador `main.js`, que asume el rol de composición y por eso es el archivo con menor cobertura.
- **Precisión y color**: albedo en `SRGBColorSpace`; alpha, normales y AO en `LinearSRGBColorSpace` (`AssetFetcher.js:119-137`).

---

## 6. Estrategia de pruebas

| Aspecto | Estado actual |
|---|---|
| Runner | Vitest 5.1, `environment: node`, `globals: true`, `include: tests/**/*.test.js` |
| Volumen | 26 archivos · 106 pruebas · 2.351 líneas · ~2,14 s |
| Técnica | Stubs manuales de DOM (`globalThis.document = {…}`), dobles inyectados; **sin jsdom** y **sin `vi.mock`** (0 usos) |
| Foco real | Matemática (12 pruebas en `AstroScale`, 6 en `KeplerOrbit`, 3 en `RingOptics`), carga resiliente de assets, normalización de GLB, controladores con estado |
| Cobertura | Sin umbral, sin `@vitest/coverage`, sin informe |
| CI | **No ejecuta pruebas** (`.github/workflows/deploy.yml` solo instala y compila) |
| E2E / visual | Inexistentes |
| Shaders | Solo aserciones sobre el texto fuente (`VintageOpticsShader.test.js`, 1 prueba); **nunca se compilan** en CI |

Puntos ciegos concretos: `main.js` (1.304 líneas de orquestación), `SaturnSimulator` (uniformes y registro de sombras), `Localization` (paridad ES/EN), compilación de los 16 shaders e interacción de HUD/misiones.

Criterio propuesto para el próximo incremento que toque código: **toda lógica nueva entra con prueba; todo bug se reproduce primero con una prueba roja.**

---

## 7. Límites

### Always
- Ejecutar `npx vitest run` antes de tocar shaders o cualquier archivo de `src/math/` (`README.md:21`).
- Ejecutar `npm run verify` antes de entregar cualquier cambio.
- Tratar `src/math/*` como fuente de verdad: si un cambio es imprescindible, primero se actualiza esta spec y sus pruebas.
- Mantener paridad ES/EN en `Localization.js` (hoy: 119 claves por idioma, 0 faltantes para las 102 claves usadas).
- Respetar los espacios de color (albedo sRGB; datos lineales).
- Actualizar `README.md` y esta spec cuando cambien comandos o comportamiento.
- Verificar el build (`npm run build`) antes de proponer un entregable.

### Ask first
- Modificar `src/math/` (prohibido por README).
- Añadir dependencias, cambiar de gestor de paquetes o eliminar uno de los dos lockfiles.
- Cambiar el contrato de `/api/textures/generate` (objetivos, resoluciones, modelo, formato de respuesta).
- Sustituir texturas/modelos o alterar el presupuesto de memoria gráfica.
- Cambiar el destino de despliegue o la política de CI.

### Never
- Commitear `GEMINI_API_KEY` u otro secreto (`.env.example` está vacío; `.gitignore` cubre `*.local`).
- Introducir escalas *ad hoc* en `ComparisonMode.js` o `main.js`.
- Volver a *shadow maps* de WebGL para planetas (`README.md:10`).
- Borrar o silenciar pruebas para "dejar el build en verde".
- Editar `node_modules/`, `dist/` o `saturn-15-nov-2026-3-25-11-a-m/` (los dos últimos ya están ignorados).

---

## 8. Criterios de éxito de esta spec

- [x] Cubre las seis áreas: objetivo, stack, comandos, estructura, estilo y pruebas.
- [x] Los límites Always / Ask first / Never están definidos y trazados a evidencia del repo.
- [x] Las cifras son reproducibles con §3 (26/106 pruebas, 911,54 kB JS, 38,0 MB dist).
- [x] Existe mapa de capacidades con ids estables y dirección de dependencias (§9).
- [x] Los hallazgos citan archivo y línea, no impresiones.
- [x] **El humano aprueba esta spec** (2026-11-16).
- [ ] El humano elige un candidato de §11 o declara otro objetivo.

---

## 9. Mapa de capacidades (as-is)

| id | Responsabilidad | Depende de |
|---|---|---|
| `assets` | Descarga con concurrencia acotada, reintentos, respaldos; GLB, audio, JSON de lunas | — |
| `astro-core` | Constantes NASA, escalas, Kepler, óptica de anillos, mapeo temporal | — |
| `scene-render` | Bootstrap WebGL, Saturno + anillos, post-proceso, fondo galáctico, Sol, lens flare | `assets`, `astro-core` |
| `moons` | 7 lunas principales, 135 irregulares, anillos F/G/E, plumas de Encélado | `astro-core`, `scene-render` |
| `missions` | Trayectorias, hitos, sondas GLB, ventana temporal, encuadre | `astro-core`, `scene-render`, `moons` |
| `optical-instrument` | Cámara bloqueada, WAC/NAC, emulación vintage, HUD de instrumento | `missions`, `scene-render` |
| `capture` | Snapshot con pie JPL (misión, instrumento, rango, ángulo de fase) | `scene-render`, `missions` |
| `texture-studio` | Catálogo de prompts, generación Gemini, override y restauración | `scene-render`, `moons`, servidor |
| `ui-shell` | DOM, tema, i18n, telemetría, estadísticas, historial, accesibilidad | todos |
| `delivery` | Express, Vite, GitHub Actions, despliegue | build |

Orden de construcción vigente: `assets` + `astro-core` → `scene-render` → `moons` → `missions` → `optical-instrument` → `ui-shell`.

---

## 10. Hallazgos

### 10.1 Fortalezas (mantener)

1. **La física está aislada y probada.** `src/math/` no importa Three.js; 21 pruebas cubren constantes, Kepler y óptica. Es el activo más valioso del repo.
2. **Sombras correctas por diseño.** Ray-tracing analítico en lugar de shadow maps evita el *z-fighting* a escala planetaria y está documentado en el GLSL (`saturn.frag:117-149`, `rings.frag:43-59`).
3. **Carga resiliente.** Reintentos con `?retry=N`, respaldos por textura y degradación a sonda procedural si un GLB falla; la app no se cae por un asset ausente (`AssetFetcher.js`).
4. **Accesibilidad por encima de la media.** `aria-pressed`, `aria-live`, `focus-visible` en 13 selectores, etiquetas en español/inglés, `prefers-color-scheme` y layout móvil con `pointer: coarse`.
5. **i18n sin huecos.** 119 claves × 2 idiomas; las 102 claves usadas existen en ambos.
6. **Rendimiento consciente.** Instancing (15.000 rocas, 135 lunas), raymarch con calidad por distancia (`rings.frag:119-123`), escala táctica de sondas por legibilidad, anisotropía tomada del renderer.
7. **Trazabilidad de assets.** Créditos CC-BY de los 7 modelos visibles en la UI con enlaces a las licencias.

### 10.2 Brechas y deuda

| ID | Sev. | Hallazgo | Evidencia | Impacto |
|---|---|---|---|---|
| H-01 | S2 | El despliegue configurado no puede servir el API de texturas: se publica solo `dist/` estático, pero `/api/textures/generate` vive en Express | `.github/workflows/deploy.yml:43-46` vs `server.ts:17` | El Estudio de texturas falla con 404 en el sitio publicado (asumiendo GH Pages) |
| H-02 | S2 | CI no ejecuta pruebas ni lint; el verde del pipeline solo prueba que compila | `deploy.yml:34-38` | Regresiones de física/UI llegan a `main` sin freno |
| H-03 | S2 | Carga inicial bloqueante de ~38 MB y ~416 MB de texturas RGBA decodificadas (sin mips): 2 texturas de 8192×4096 (128 MB cada una) | `main.js:237`, `AssetFetcher.loadAllAssets`, dimensiones medidas | Arranque lento en 4G y riesgo real de OOM en GPU móvil/iGPU |
| H-04 | S2 | Endpoint de generación sin autenticación, sin rate limit y sin cuota por cliente | `textureHandler.ts:105-181` | Abuso del API key de Gemini y coste económico directo |
| H-05 | S3 | No hay `lint`, `format` ni `typecheck`; `server.ts` es TypeScript sin `tsconfig` (nunca se comprueba) y no hay `engines` | `package.json:6-12` | Errores de tipo y estilo solo aparecen en runtime; requisito de Node invisible (Node 20 en CI) |
| H-06 | S3 | `models/` duplica byte a byte `public/models/` (7 GLB, 18,2 MB) y ambos están versionados; además hay dos lockfiles | hashes SHA-256 idénticos; `git ls-files` | Repo de 53,3 MB de payload / 32,6 MB de `.git`; revisiones y clones más caros |
| H-07 | S3 | El contenido de misiones (descripciones e hitos) está solo en español, mientras la UI es bilingüe | `HistoricalMissions.js:21,42,171…` | Quien use la UI en inglés recibe media interfaz en español |
| H-08 | S3 | Cobertura con puntos ciegos: `main.js`, `SaturnSimulator`, `Localization` y compilación de shaders no se prueban | 26 archivos de test listados | Un error GLSL o un `uniform` mal cableado no lo detecta nadie hasta abrir el navegador |
| H-09 | S3 | Acoplamiento por conteo exacto: las lunas menores solo se crean si el JSON tiene exactamente 135 entradas | `main.js:274` | Si el catálogo cambia de tamaño, las 135 lunas irregulares desaparecen sin aviso |
| H-10 | S3 | No hay `LICENSE` para el código; las licencias CC-BY de modelos viven solo en la UI | raíz del repo; `index.html:296-305` | Ambigüedad legal para reutilización o publicación |
| H-11 | S4 | Deriva de documentación: README dice que `npm run dev` "inicia Vite" (realmente arranca Express); el comentario de `RING_OUTER_EDGE` dice "Anillo F" pero 136.775 km es el borde exterior del anillo A (el F está a 140.180 km) | `README.md:29-30`, `AstroScale.js:88-89` | Onboarding y futuras decisiones de física sobre datos mal etiquetados |
| H-12 | S4 | Archivos muertos: `src/counter.js` (plantilla Vite), `src/assets/{hero.png,javascript.svg,vite.svg}`, `public/assets/aistudio/image_7a4811fe.png` | sin referencias en `src/`, `index.html` ni CSS | Ruido y falsos positivos en búsquedas/auditorías |
| H-13 | S4 | Accesibilidad incompleta: sin `prefers-reduced-motion` (hay animaciones GSAP y ruido de shader), el loader es un `div` sin rol ni progreso, el `<canvas>` no tiene etiqueta | `style.css` (sin consulta de movimiento), `index.html:21-23,415` | Usuarios con sensibilidad al movimiento y lectores de pantalla pierden contexto |
| H-14 | S4 | Sin E2E ni regresión visual pese a ser un producto eminentemente visual | `tests/` | Cambios de encuadre, color o shader se validan a ojo |

**Cerrados por `quality-gates` (2026-11-16): H-02 y H-05.**

### 10.3 Límites de dominio que deben declararse en el producto

No son bugs; son decisiones que conviene explicitar para no vender precisión inexistente:

- **Dirección solar fija** `(1, 0.35, 0.35)` (`SaturnSimulator.js:30`): la estación de Saturno y, por tanto, la geometría de las sombras de los anillos, es estática. Un ciclo estacional real dura 29,5 años.
- **Órbitas keplerianas de elementos medios** con `meanAnomalyEpoch = 0`: posiciones plausibles y estables, **no efemérides**. No cuadran con JPL Horizons.
- **Trayectorias de misión dibujadas a mano** con splines Catmull-Rom (`HistoricalMissions.js`): la cronología es histórica, la geometría es estilizada.
- **Escala táctica de sondas**: los modelos se agrandan ~10⁷ veces para ser visibles (2,9 unidades ≈ 29.000 km); es intencional, pero invalida cualquier lectura de tamaño de la sonda.
- **Sombras entre lunas**: cada luna proyecta sobre Saturno y los anillos, pero las lunas no se sombrean entre sí ni entre planetas.

---

## 11. Candidatos de siguiente incremento (sin planificar)

**Seleccionado e implementado (2026-11-16):** `quality-gates`. **Producción confirmada:** GitHub Pages (estático); `deploy-api` sigue como deuda abierta (H-01).

Elige **uno**. Los demás quedan fuera de alcance hasta nueva spec.

| id | Objetivo | Entregable | Verificación | Riesgo |
|---|---|---|---|---|
| `quality-gates` | Que la calidad sea automática | ESLint + Prettier + `tsconfig` del servidor; CI corre `test` + `lint` + `build` | Pipeline verde; `npm run lint` sin errores; 0 regresiones en 106 pruebas | Medio: ruido inicial de lint en 6.000 líneas |
| `deploy-api` | Que el Estudio de texturas funcione (o falle con elegancia) en producción | Host con Node o *fallback* que detecta `/api/health` y deshabilita la sección | URL publicada: health 200 + generación real, o sección oculta sin errores de consola | Medio: coste de hosting y secretos |
| `asset-budget` | Arranque rápido y estable en móvil | Carga progresiva, variantes 2K por capacidad, GLB diferidos, progreso real en el loader | LCP y transferencia inicial medidos; VRAM < presupuesto; ≥ 30 fps en gama media | Alto: toca carga, texturas y loader |
| `i18n-missions` | UI 100 % coherente en ambos idiomas | Descripciones e hitos de misión localizados por clave | Prueba de paridad ES/EN sobre `MISSIONS`; revisión visual en EN | Bajo |
| `repo-hygiene` | Repo pequeño y sin ruido | Eliminar duplicados y archivos muertos, un solo lockfile, `LICENSE`, README corregido | `git ls-files` sin duplicados; build idéntico; README verificado | Bajo |
| `test-depth` | Cubrir los puntos ciegos reales | Pruebas de `SaturnSimulator`, `Localization`, orquestación y validación GLSL; umbral de cobertura | Cobertura mínima acordada y CI que la exige | Medio: el DOM real exige jsdom o E2E |

---

## 12. Preguntas abiertas

1. **¿Dónde se publica de verdad?** → **Respondida (2026-11-16): GitHub Pages, estático.** H-01 queda confirmado como deuda abierta.
2. **¿Cuál es el próximo incremento?** → **Respondida (2026-11-16): `quality-gates`.**
3. **¿Qué presupuesto de rendimiento aceptamos?** (p. ej. LCP < 3 s en 4G, < 300 MB de VRAM, 30 fps mínimos en móvil de gama media).
4. **¿Licencia del código?** MIT, Apache-2.0 o propietaria. Y ¿se mantiene la política CC-BY con atribución en UI?
5. **¿Se permite tocar `src/math/`?** El README lo prohíbe; si el próximo trabajo lo requiere, hay que autorizar la excepción.
6. **¿Idioma canónico?** Hoy el español es el idioma por defecto y el contenido de misiones solo existe en español.
7. **¿Hay requisito de funcionamiento offline/PWA?** Hoy todo depende de red y del servidor para IA.

---

*Este documento se actualiza antes que el código. Si una decisión cambia, cambia aquí primero.*
