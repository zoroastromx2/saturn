# Spec: `e2e` — fase B, smoke con navegador real

| Campo | Valor |
|---|---|
| Módulo | `test-depth` fase B (traza a `SPEC.md` H-08 y H-14 parcial) |
| Estado | **Aprobada e implementada** — 2026-11-16 |
| Cierra | **H-08**: `main.js` y compilación real de shaders |
| Dependencia nueva | `@playwright/test` (solo desarrollo y CI) |
| No toca | Código de runtime, assets, física ni presets |

---

## 1. Objetivo

Ejecutar la app real en Chromium y fallar el pipeline si no arranca, si un shader no compila o si una interacción básica se rompe.

## 2. Alcance

Seis pruebas en `e2e/`:

| Prueba | Qué verifica |
|---|---|
| `boot` (2) | Arranque sin `pageerror` ni `console.error`; los 12 shaders compilan; el HUD de FPS se actualiza |
| `quality` | Con `?quality=low`, **todas** las peticiones a `/textures/` son del preset low y no se descarga audio |
| `i18n` | ES→EN cambia el selector y la descripción de misión; EN→ES los restaura |
| `mission` | Elegir Pioneer 11 crea 3 badges y muestra su descripción |
| `a11y` | `reducedMotion: reduce` deja la transición en ~0; loader y canvas con su semántica |

Infraestructura:

- `playwright.config.js` con `webServer` (`vite build && vite preview :4173`), 1 worker, reintento único en CI, traza y captura solo al fallar.
- CI: instala Chromium y ejecuta `npm run test:e2e` **antes** de publicar; si falla, no hay deploy.
- Artefacto `playwright-report/` solo en fallo (7 días).

**Fuera**

- Capturas comparadas y umbrales visuales (fase C).
- Cobertura de líneas de `main.js` (se cubre el comportamiento, no las ramas).
- Matriz de navegadores (solo Chromium).
- Pruebas de rendimiento o de VRAM.

## 3. Criterios de éxito

1. `npm run test:e2e` verde en local (**6/6**, ~1,5 min) y en CI.
2. `npm run verify` sigue en 159/159 unitarias.
3. Un error de consola, un shader roto o un preset mal aplicado hacen fallar el pipeline.
4. CI no publica si el smoke falla.
5. Sin cambios en el bundle ni en el comportamiento.

## 4. Límites

- **Always:** servidor de preview propio, sin depender de Pages; 1 worker para evitar carreras de WebGL.
- **Ask first:** añadir más navegadores, pruebas visuales o una suite E2E mayor.
- **Never:** usar la web publicada como entorno de test; aceptar tests con `skip`; relajar el filtro de errores sin justificarlo.

## 5. Riesgos

| Riesgo | Mitigación |
|---|---|
| CI con WebGL por software emite avisos | Solo se consideran `console.error` y `pageerror`, no warnings |
| Flakiness por carga de assets | Espera explícita a `#loader` oculto + 4-5 s de fase 1; 1 reintento en CI |
| Tiempo de CI (~3 min) | Aceptado; browser cacheado por Playwright |
| Fallo de red al instalar Chromium | `--with-deps` en el runner; el step es reproducible |

## 6. Resultado

- 6/6 pruebas verdes en local con Chromium (1,5 min).
- 159 unitarias intactas.
- Bundle sin cambios.
