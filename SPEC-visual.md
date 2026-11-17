# Spec: `visual` — fase C, regresión visual determinista

| Campo | Valor |
|---|---|
| Módulo | `test-depth` fase C (traza a `SPEC.md` H-14) |
| Estado | **Aprobada e implementada** — 2026-11-16 |
| Cierra | **H-14**: regresión visual |
| Dependencia | `@playwright/test` (ya presente) |
| No toca | Física, datos, presets ni comportamiento por defecto |

---

## 1. Objetivo

Detectar cambios de encuadre, color o geometría comparando capturas del canvas contra baselines versionados, de forma reproducible en Windows y en CI Linux.

## 2. Cómo se consigue el determinismo

| Fuente de azar | Solución |
|---|---|
| 15.000 rocas del anillo F y 5.000 partículas de Encélado con `Math.random` | `src/core/Random.js` (mulberry32) + `?e2e=1&seed=…` |
| Tiempo orbital y fecha simulada | En modo E2E: `timeScale = 0` y fecha fija `2026-11-16T12:00Z` |
| Pluma de Encélado animándose | Una emisión sembrada y luego `frozen = true` |
| Grano del post-proceso y transiciones | `reducedMotion: 'reduce'` (heredado de `a11y`) |
| GPU distinta entre Windows y Linux | SwiftShader forzado por flags de Chromium |
| Fuentes del HUD | Se captura **solo el canvas**, nunca el DOM |
| Escala de píxeles | `deviceScaleFactor: 1` |

El modo E2E se activa solo con `?e2e=1`; la app normal no cambia.

## 3. Escenas

| Escena | Viewport | Acción |
|---|---|---|
| `default` | 1280×720 | ninguna |
| `titan` | 1280×720 | foco en Titán |
| `mission-pioneer` | 1280×720 | seleccionar Pioneer 11 |
| `instrument` | 1280×720 | misión + vista de instrumento |
| `mobile` | 390×844 | ninguna |

Todas usan `?quality=low&e2e=1`, esperan `window.__E2E_READY__` y comparan con `maxDiffPixelRatio: 0.01`.

## 4. Política de capturas

1. Las baselines viven en `e2e/visual/__screenshots__/*.png` y **se versionan** (~3,0 MB).
2. Se actualizan **solo** con `npm run test:visual -- --update-snapshots`, revisando el diff visual, y en un commit explícito.
3. **Nunca** se actualizan en CI: si fallan, el deploy se detiene y el reporte adjunta esperado/actual/diferencia.
4. La plantilla de rutas no incluye plataforma ni proyecto (`__screenshots__/{arg}.png`), para compartir baseline entre Windows y Linux.
5. El umbral es 1 % de píxeles; un cambio perceptible debe superarlo.

## 5. Criterios de éxito

1. `npm run test:visual` → **5/5** en local y en CI.
2. Repetir la suite dos veces seguidas da el mismo resultado (sin falsos positivos).
3. `npm run verify` sigue verde con **163** unitarias.
4. CI ejecuta visual después del smoke y **antes** de publicar.
5. La app normal no cambia (bundle sin diferencias funcionales).

## 6. Límites

- **Always:** capturas solo del canvas; mismo Chromium de Playwright en todos los entornos.
- **Ask first:** ampliar escenas o viewports, subir el umbral, cambiar la semilla o la fecha fija.
- **Never:** aceptar capturas nuevas sin revisarlas; actualizar baselines en CI; capturar el HUD con fuentes del sistema.

## 7. Riesgos

| Riesgo | Mitigación |
|---|---|
| Diferencias de rasterizado entre SO | SwiftShader forzado + mismo build de Chromium |
| Peso de las baselines | 3,0 MB y solo cinco escenas |
| Flakiness por carga de assets | `__E2E_READY__` + espera de 500 ms |
| Cambios intencionales bloqueando el deploy | Actualización local guiada y revisada |

## 8. Resultado

- **5/5** capturas estables en local (54 s) y **11/11** E2E+visual en conjunto.
- Determinismo verificado repitiendo la suite.
- Regresión de la pluma y del anillo F ya no es aleatoria entre ejecuciones.

