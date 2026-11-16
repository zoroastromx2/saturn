# Plan: `test-depth` fase C (visual)

| Campo | Valor |
|---|---|
| Módulo | `test-depth` fase C |
| Spec | [`../../SPEC-visual.md`](../../SPEC-visual.md) — aprobada |
| Estado | **Completado** (2026-11-16) |
| Alcance | Determinismo + capturas comparadas en CI |
| Dependencia nueva | Ninguna (`@playwright/test` ya estaba) |

---

## 1. Decisiones

| id | Decisión | Motivo |
|---|---|---|
| D1 | RNG sembrado (mulberry32) en anillo F y pluma | Sin esto no hay dos capturas iguales |
| D2 | Modo `?e2e=1` con tiempo congelado y fecha fija | Evita que la órbita cambie entre ejecuciones |
| D3 | Pluma con una emisión y `frozen` | Mantiene la forma y quita el movimiento |
| D4 | SwiftShader forzado por flags | Mismo rasterizador en Windows y Linux |
| D5 | Captura solo del canvas | Las fuentes del HUD difieren entre sistemas |
| D6 | Baselines versionadas con plantilla sin plataforma | Un único baseline para todos los entornos |
| D7 | Umbral 0,2 % de píxeles | Tolera ruido mínimo sin ocultar cambios reales |

## 2. Secuencia

```
V1 Random + pluma ─→ V2 modo E2E ─→ V3 config visual ─→ V4 escenas ─→ V5 baselines ─→ V6 CI y docs
```

## 3. Puntos de verificación

| CP | Tras | Comprobación | Criterio |
|---|---|---|---|
| CP1 | V1 | `npx vitest run tests/Random.test.js` | Secuencia reproducible |
| CP2 | V2 | `?e2e=1` en preview | `__E2E_READY__` y tiempo congelado |
| CP3 | V3 | `npx playwright test --project=visual --list` | 5 escenas detectadas |
| CP4 | V5 | `--update-snapshots` y luego test normal | 5/5 y repetición estable |
| CP5 | V6 | `npx playwright test` completo | 11/11 |
| CP6 | CI | Run de main | Visual verde antes del deploy |

## 4. Riesgos

| Riesgo | Mitigación |
|---|---|
| Rasterizado distinto en Linux | SwiftShader + mismo Chromium |
| Capturas grandes | 5 escenas, ~3,2 MB |
| Falsos positivos por timing | `__E2E_READY__`, espera 500 ms, reintento único en CI |
| Cambios visuales legítimos | Actualización local revisada y commit explícito |

## 5. Impacto

**Nuevos:** `src/core/Random.js`, `tests/Random.test.js`, `e2e/visual/visual.spec.js`, 5 baselines, `SPEC-visual.md`.
**Editados:** `FRingSimulator`, `EnceladusSimulator`, `main.js` (modo E2E), `playwright.config.js`, `package.json`, `deploy.yml`, `SPEC.md`, `README.md`.
**Unitarias:** 159 → 163. **E2E:** 6 → 11 (5 visuales).
