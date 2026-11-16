# Spec: Saturn Simulator — línea base y habilitación del siguiente incremento

| Campo | Valor |
|---|---|
| Estado | **Aprobada** — 2026-11-16, aprobación humana explícita |
| Fecha | 2026-11-16 |
| Commit analizado | `587e9ad` · rama `main` · árbol de trabajo limpio (53 commits) |
| Alcance | Documento vivo: línea base del sistema y registro de incrementos aplicados |
| Autor | Análisis automatizado (agente) sobre el código y su ejecución real |

> **Regla del flujo:** Plan → Tasks → Implement no comienzan hasta que este documento se apruebe. Las cifras de este documento son reproducibles con los comandos de §3.

## Resumen

- El proyecto es un **observatorio 3D de Saturno** (Three.js + GLSL) con una decena de módulos de simulación, 6 misiones históricas, instrumento óptico emulado y UI bilingüe ES/EN. Es una **app 100 % estática**: sin servidor ni API.
- La base es sólida: matemática aislada y documentada, **163 pruebas unitarias en 36 archivos (~1,7 s) y 11 pruebas E2E/visuales en Chromium**, con build correcto (**906,28 kB JS / 240,72 kB gzip**).
- El presupuesto está acotado: **1,08–2,26 MB** de carga inicial y **32–278 MB** de VRAM según preset; modelos y audio no bloquean el primer frame.
- La deuda restante es acotada: cobertura de `main.js`, compilación real de shaders y E2E visual.
- El documento registra los incrementos aplicados y los candidatos vivos de §11.

---

## 0. Supuestos vigentes

1. **Producción = GitHub Pages (estático).** No hay servidor ni API: se publica `dist/`.
2. El **siguiente incremento** se elige de §11; los ya aplicados se registran aquí.
3. La arquitectura es **cliente Three.js 100 % estático**, sin base de datos, cuentas ni persistencia de usuario.
4. **No se añaden dependencias** ni se modifican `src/math/*` (prohibido en `README.md:20`) sin aprobación explícita.
5. El producto es **divulgación educativa**, no efemérides de precisión (ver §10.3). Las posiciones son plausibles, no certificadas.

→ Si algún supuesto cambió, dímelo y ajusto el documento antes de cualquier plan.

---

## 1. Objetivo

Construir un simulador visualmente riguroso del sistema de Saturno — atmósfera, anillos y lunas — con tres ejes de producto:

1. **Rigor óptico y geométrico**: esferoide oblato real, sombras analíticas por ray-tracing en GLSL, dispersión Mie en los anillos, escala Tierra–Saturno derivada de datos NASA.
2. **Exploración histórica**: seis misiones (Pioneer 11, Voyager 1/2, Cassini–Huygens, Huygens, Gran Final) con trayectoria, hitos y cámara de instrumento óptico.
3. **Laboratorio interactivo**: máquina del tiempo y captura tipo archivo JPL.

**Propósito de esta spec** (el incremento actual): establecer la línea base verificable del sistema — qué hace, cómo se ejecuta, dónde están sus límites — y habilitar una decisión informada sobre el próximo incremento. **Éxito =** un ingeniero o agente puede entender, ejecutar y extender el proyecto sin leer 6.000 líneas, y el humano puede elegir el siguiente corte con criterios explícitos.

**Usuario objetivo:** persona interesada en astronomía y visualización científica; en móvil de gama media y escritorio; en español o inglés.

---

## 2. Stack técnico (versiones verificadas en ejecución)

| Capa | Tecnología | Versión |
|---|---|---|
| Runtime | Node.js | 26.13.0 local · 22.18.0 en CI |
| Bundler | Vite | 8.3.8 (declarado `^8.3.6`) |
| Render | three.js | 0.187 |
| Animación de cámara | GSAP | 3.15.1 |
| Pruebas | Vitest | 5.1.0 |
| E2E | Playwright | 1.65 |
| Shaders | GLSL (`vite-plugin-glsl`) | `.vert` / `.frag` |
| Lenguaje | JavaScript ESM | sin TypeScript |
| Servidor | ninguno | aplicación estática |

- No hay framework de UI: el DOM es `index.html` (348 líneas) manipulado a mano.
- Calidad: ESLint 10 (flat config), Prettier 3.10 y `engines.node >= 20.19.0`.
- Un único lockfile: `package-lock.json` (npm).

---

## 3. Comandos (ejecutados, no supuestos)

```bash
npm install                # lockfile canónico para CI: package-lock.json
npm run dev                # Vite en http://localhost:3000
npm run build              # vite build → dist/
npm run preview            # sirve dist/ en local
npx vitest run             # 36 archivos · 163 pruebas · ~1,6 s
npm run test:e2e           # 6 pruebas E2E en Chromium · ~1,5 min
npm run test:visual        # 5 capturas de regresión visual · ~1 min
node tools/asset-report.mjs # presupuesto de activos por preset

# Gates de calidad (desde 2026-11-16)
npm run lint               # ESLint 10 (flat config)
npm run format:check       # Prettier 3
npm run verify             # lint + formato + pruebas + build
```

Salidas medidas el 2026-11-16:

| Comando | Resultado |
|---|---|
| `npx vitest run` | **36/36 archivos, 163/163 pruebas OK**, exit 0 |
| `npm run build` | `index.html 22,56 kB` · `css 28,33 kB` · `js 906,28 kB` (gzip 240,72 kB), ~1 s |
| `npm run test:e2e` | **6/6 pruebas**, Chromium 1.65 (local: 1,5 min) |
| `npm run test:visual` | **5/5 capturas** estables (local: 54 s) |
| `dist/` | 43,3 MB (incluye los tres presets; cada usuario descarga solo el suyo) |

**Calidad (desde 2026-11-16):** `lint`, `format:check` y `verify` existen y CI los ejecuta antes de publicar. No hay `typecheck` porque no queda TypeScript. Siguen faltando `test:coverage` y `test:e2e` (ver `test-depth`).

**Requisito de Node declarado:** `engines.node: ">=20.19.0"` (lo exige Vite 8); CI usa Node 22.18.0.

---

## 4. Estructura del proyecto

```
index.html                 Shell DOM: HUD, navegación, tiempo, estadísticas, instrumento
src/main.js                Orquestación (1.231 líneas): bootstrap, wiring del HUD, reloj, tick
src/core/                  Simuladores y controladores (32 archivos, 3.980 líneas)
  QualityTier              Preset low/medium/high y rutas por variante
  LoadProgress             Progreso de carga por bytes
  EnvironmentProbe         Entorno PBR reducido (512×256)
  LocalizedText            Resolución de textos {es,en} con fallback
  ReducedMotion            Preferencia de movimiento reducido y duración 0
  Random                   Aleatoriedad sembrada (mulberry32) para capturas
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
src/math/                  FUENTE DE VERDAD (no modificar sin aprobación)
  AstroScale                 Constantes NASA, oblateness, ratio Tierra–Saturno, ápsides
  KeplerOrbit                Ecuación de Kepler (Newton) y muestreo de órbitas
  RingOptics                 Intersección rayo-plano y rayo-elipsoide
  TimeScale                  Mapeo slider [0..100] ↔ multiplicador [0..100]
src/shaders/               12 GLSL en uso + VintageOpticsShader.js (post-proceso)
src/data/HistoricalMissions.js   6 misiones: control points, hitos, instrumentos
src/assets/               Restos de plantilla Vite, sin referencias
tests/                    36 archivos, 2.741 líneas, entorno node
e2e/                      6 pruebas de humo + 5 capturas visuales (Playwright)
public/                   Texturas base + tiers low/medium/high, audio, GLB, minor_moons.json
tools/                    asset-report.mjs y generate-texture-tiers.py
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
- **Inyección por constructor** para todo lo que se prueba: `assets`, `fetchImpl`, `storage`, `textureLoader`. Es la razón por la que las 95 pruebas corren sin navegador.
- **Sin estado global** salvo el orquestador `main.js`, que asume el rol de composición y por eso es el archivo con menor cobertura.
- **Precisión y color**: albedo en `SRGBColorSpace`; alpha, normales y AO en `LinearSRGBColorSpace` (`AssetFetcher.js:119-137`).

---

## 6. Estrategia de pruebas

| Aspecto | Estado actual |
|---|---|
| Runner | Vitest 5.1, `environment: node`, `globals: true`, `include: tests/**/*.test.js` |
| Volumen | 36 archivos · 163 pruebas · 2.741 líneas · ~1,7 s |
| Técnica | Stubs manuales de DOM (`globalThis.document = {…}`), dobles inyectados; **sin jsdom** y **sin `vi.mock`** (0 usos) |
| Foco real | Matemática (12 pruebas en `AstroScale`, 6 en `KeplerOrbit`, 3 en `RingOptics`), carga resiliente de assets, normalización de GLB, controladores con estado |
| Cobertura | Sin umbral, sin `@vitest/coverage`, sin informe |
| CI | **Ejecuta formato, lint, pruebas, build y E2E** antes de publicar (`.github/workflows/deploy.yml`) |
| E2E / visual | **11 pruebas**: 6 de humo y 5 capturas comparadas con umbral de 0,2 % |
| Shaders | Solo aserciones sobre el texto fuente (`VintageOpticsShader.test.js`, 1 prueba); **nunca se compilan** en CI |

Puntos ciegos concretos: `main.js` (1.191 líneas de orquestación), `SaturnSimulator` (uniformes y registro de sombras), `Localization` (paridad ES/EN), compilación de los 16 shaders e interacción de HUD/misiones.

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
- Sustituir texturas/modelos o alterar el presupuesto de memoria gráfica.
- Cambiar el destino de despliegue o la política de CI.

### Never
- Commitear secretos o credenciales personales.
- Introducir escalas *ad hoc* en `ComparisonMode.js` o `main.js`.
- Volver a *shadow maps* de WebGL para planetas (`README.md:10`).
- Borrar o silenciar pruebas para "dejar el build en verde".
- Editar `node_modules/`, `dist/` o `saturn-15-nov-2026-3-25-11-a-m/` (los dos últimos ya están ignorados).

---

## 8. Criterios de éxito de esta spec

- [x] Cubre las seis áreas: objetivo, stack, comandos, estructura, estilo y pruebas.
- [x] Los límites Always / Ask first / Never están definidos y trazados a evidencia del repo.
- [x] Las cifras son reproducibles con §3 (25/95 pruebas, 898,31 kB JS, 38,0 MB dist).
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
| `ui-shell` | DOM, tema, i18n, telemetría, estadísticas, historial, accesibilidad | todos |
| `delivery` | Vite, GitHub Actions, despliegue estático | build |

Orden de construcción vigente: `assets` + `astro-core` → `scene-render` → `moons` → `missions` → `optical-instrument` → `ui-shell`.

---

## 10. Hallazgos

### 10.1 Fortalezas (mantener)

1. **La física está aislada y probada.** `src/math/` no importa Three.js; 21 pruebas cubren constantes, Kepler y óptica. Es el activo más valioso del repo.
2. **Sombras correctas por diseño.** Ray-tracing analítico en lugar de shadow maps evita el *z-fighting* a escala planetaria y está documentado en el GLSL (`saturn.frag:117-149`, `rings.frag:43-59`).
3. **Carga resiliente.** Reintentos con `?retry=N`, respaldos por textura y degradación a sonda procedural si un GLB falla; la app no se cae por un asset ausente (`AssetFetcher.js`).
4. **Accesibilidad por encima de la media.** `aria-pressed`, `aria-live`, `focus-visible` en 13 selectores, movimiento reducido, canvas con nombre accesible, etiquetas en español/inglés, `prefers-color-scheme` y layout móvil con `pointer: coarse`.
5. **i18n sin huecos.** 106 claves × 2 idiomas; 89 en uso, incluido el contenido de misión localizado.
6. **Rendimiento consciente.** Instancing (15.000 rocas, 135 lunas), raymarch con calidad por distancia (`rings.frag:119-123`), escala táctica de sondas por legibilidad, anisotropía tomada del renderer.
7. **Trazabilidad de assets.** Créditos CC-BY de los 7 modelos visibles en la UI con enlaces a las licencias.

### 10.2 Brechas y deuda

| ID | Sev. | Hallazgo | Evidencia | Impacto |
|---|---|---|---|---|
| H-01 | S2 | ~~El despliegue no puede servir el API de texturas~~ **Cerrado por eliminación** | — | Ya no existe el Estudio de texturas ni el endpoint |
| H-02 | S2 | CI no ejecuta pruebas ni lint; el verde del pipeline solo prueba que compila | `deploy.yml:34-38` | Regresiones de física/UI llegan a `main` sin freno |
| H-03 | S2 | ~~Carga inicial de ~38 MB y ~416 MB de texturas~~ **Cerrado por `asset-budget`**: 1,08–2,26 MB iniciales y 32–278 MB de VRAM según preset | `tools/asset-report.mjs` | El primer frame ya no espera modelos ni audio |
| H-04 | S2 | ~~Endpoint de generación sin autenticación ni cuota~~ **Cerrado por eliminación** | — | El endpoint ya no existe |
| H-05 | S3 | No hay `lint`, `format` ni `typecheck`; `server.ts` es TypeScript sin `tsconfig` (nunca se comprueba) y no hay `engines` | `package.json:6-12` | Errores de tipo y estilo solo aparecen en runtime; requisito de Node invisible (Node 20 en CI) |
| H-06 | S3 | ~~`models/` duplicaba `public/models/`; dos lockfiles~~ **Cerrado por `repo-hygiene`**: una sola copia y npm como único gestor | `git ls-files` | Payload 60,4 → 42,8 MB; `.git` sigue igual (historial) |
| H-07 | S3 | ~~Contenido de misión solo en español~~ **Cerrado por `i18n-missions`**: nombres, descripciones e hitos en `{es,en}` | `HistoricalMissions.js` | 30 campos localizados con prueba de paridad |
| H-08 | S3 | ~~Cobertura con puntos ciegos~~ **Cerrado por `test-depth` (fases A y B)**: contrato GLSL, `SaturnSimulator`, `Localization` y smoke E2E que compila shaders y ejercita `main.js` | `e2e/`, `tests/ShaderContract.test.js` | Un shader roto o un fallo de arranque detienen el deploy |
| H-09 | S3 | Acoplamiento por conteo exacto: las lunas menores solo se crean si el JSON tiene exactamente 135 entradas | `main.js:274` | Si el catálogo cambia de tamaño, las 135 lunas irregulares desaparecen sin aviso |
| H-10 | S3 | No hay `LICENSE` para el código; las licencias CC-BY de modelos viven solo en la UI | raíz del repo; `index.html:296-305` | Ambigüedad legal para reutilización o publicación |
| H-11 | S4 | ~~El comentario de `RING_OUTER_EDGE` decía "Anillo F"~~ **Cerrado por `h11`**: 136.775 km es el borde exterior del anillo A | `AstroScale.js:88` | Etiqueta correcta; el valor no cambió |
| H-12 | S4 | ~~Archivos muertos: `src/counter.js`, restos de `src/assets/` y PNG de AI Studio~~ **Cerrado por `repo-hygiene`** | — | Árbol sin huérfanos |
| H-13 | S4 | ~~Accesibilidad incompleta: sin `prefers-reduced-motion`, loader sin semántica y canvas sin etiqueta~~ **Cerrado por `a11y`** | `tests/A11yMarkup.test.js` | Movimiento reducido, `role="status"` y canvas etiquetado |
| H-14 | S4 | ~~Sin E2E ni regresión visual~~ **Cerrado por `test-depth` (fase C)**: 5 capturas deterministas en CI | `e2e/visual/` | Cambios de encuadre o color detienen el deploy |

**Cerrados por `quality-gates` (2026-11-16): H-02 y H-05.** **Cerrados por `remove-texture-studio` (2026-11-16): H-01 y H-04** (la función y el endpoint ya no existen). **Cerrado por `asset-budget` (2026-11-16): H-03.** **Cerrados por `repo-hygiene` (2026-11-16): H-06 y H-12.** **Cerrado por `i18n-missions` (2026-11-16): H-07.** **Cerrado por `a11y` (2026-11-16): H-13.** **Cerrado por `h11` (2026-11-16): H-11.** **Cerrado por `test-depth` (fases A y B) (2026-11-16): H-08.** **Cerrado por `test-depth` (fase C) (2026-11-16): H-14.**

### 10.3 Límites de dominio que deben declararse en el producto

No son bugs; son decisiones que conviene explicitar para no vender precisión inexistente:

- **Dirección solar fija** `(1, 0.35, 0.35)` (`SaturnSimulator.js:30`): la estación de Saturno y, por tanto, la geometría de las sombras de los anillos, es estática. Un ciclo estacional real dura 29,5 años.
- **Órbitas keplerianas de elementos medios** con `meanAnomalyEpoch = 0`: posiciones plausibles y estables, **no efemérides**. No cuadran con JPL Horizons.
- **Trayectorias de misión dibujadas a mano** con splines Catmull-Rom (`HistoricalMissions.js`): la cronología es histórica, la geometría es estilizada.
- **Escala táctica de sondas**: los modelos se agrandan ~10⁷ veces para ser visibles (2,9 unidades ≈ 29.000 km); es intencional, pero invalida cualquier lectura de tamaño de la sonda.
- **Sombras entre lunas**: cada luna proyecta sobre Saturno y los anillos, pero las lunas no se sombrean entre sí ni entre planetas.

---

## 11. Candidatos de siguiente incremento (sin planificar)

**Aplicados (2026-11-16):** `quality-gates`, `remove-texture-studio`, `asset-budget`, `repo-hygiene`, `i18n-missions`, `a11y`, `h11` y `test-depth` (fases A, B y C). **Producción:** GitHub Pages (estático). `deploy-api` quedó descartado: sin función de IA no hay API que desplegar.

**Siguiente (2026-11-16):** sin deuda abierta de los 14 hallazgos. Los candidatos de §11 quedan como mejoras opcionales.

Elige **uno** de los candidatos restantes. Los demás quedan fuera de alcance hasta nueva spec.

| id | Objetivo | Entregable | Verificación | Riesgo |
|---|---|---|---|---|
| `quality-gates` | Que la calidad sea automática | ESLint + Prettier; CI corre `test` + `lint` + `build` | Pipeline verde; `npm run lint` sin errores; 0 regresiones en 95 pruebas | Medio: ruido inicial de lint en 6.000 líneas |
| `asset-budget` | Arranque rápido y estable en móvil | Carga progresiva, variantes 2K por capacidad, GLB diferidos, progreso real en el loader | LCP y transferencia inicial medidos; VRAM < presupuesto; ≥ 30 fps en gama media | Alto: toca carga, texturas y loader |
| `i18n-missions` | UI 100 % coherente en ambos idiomas | Descripciones e hitos de misión localizados por clave | Prueba de paridad ES/EN sobre `MISSIONS`; revisión visual en EN | Bajo |
| `repo-hygiene` | Repo pequeño y sin ruido | Eliminar duplicados y archivos muertos, un solo lockfile, `LICENSE`, README corregido | `git ls-files` sin duplicados; build idéntico; README verificado | Bajo |
| `test-depth` | Cubrir los puntos ciegos reales | Pruebas de `SaturnSimulator`, `Localization`, orquestación y validación GLSL; umbral de cobertura | Cobertura mínima acordada y CI que la exige | Medio: el DOM real exige jsdom o E2E |

---

## 12. Preguntas abiertas

1. **¿Dónde se publica de verdad?** → **Respondida (2026-11-16): GitHub Pages, estático.** H-01 cerrado por eliminación.
2. **¿Cuál es el próximo incremento?** → **Respondidas (2026-11-16): `quality-gates` y `remove-texture-studio`.**
3. **¿Qué presupuesto de rendimiento aceptamos?** → **Respondida (2026-11-16):** ver `SPEC-asset-budget.md` §4 (≤ 4 MB / 60 MB en móvil; ≤ 8 MB / 120 MB en escritorio).
4. **¿Licencia del código?** MIT, Apache-2.0 o propietaria. Y ¿se mantiene la política CC-BY con atribución en UI?
5. **¿Se permite tocar `src/math/`?** El README lo prohíbe; si el próximo trabajo lo requiere, hay que autorizar la excepción.
6. **¿Idioma canónico?** Hoy el español es el idioma por defecto y el contenido de misiones solo existe en español.
7. **¿Hay requisito de funcionamiento offline/PWA?** Hoy todo depende de red; no hay backend que cachear.

---

*Este documento se actualiza antes que el código. Si una decisión cambia, cambia aquí primero.*

