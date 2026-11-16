# Plan: `test-depth` fase B (E2E)

| Campo | Valor |
|---|---|
| Módulo | `test-depth` fase B |
| Spec | [`../../SPEC-e2e.md`](../../SPEC-e2e.md) — aprobada |
| Estado | **Completado** (2026-11-16) |
| Alcance | Smoke E2E en Chromium dentro de CI |
| Dependencia | `@playwright/test` 1.65 (dev) |

---

## 1. Decisiones

| id | Decisión | Motivo |
|---|---|---|
| D1 | Playwright Test, no Vitest browser mode | Trazas, reintentos y `webServer` ya resueltos |
| D2 | `vite preview` como servidor de pruebas | Prueba el build real, no el dev server |
| D3 | 1 worker, sin paralelismo | Evita dos contextos WebGL compitiendo |
| D4 | Solo `console.error`/`pageerror` como fallo | Los avisos de software WebGL son ruido |
| D5 | E2E antes de publicar, con artefacto al fallar | Un shader roto no llega a producción |

## 2. Secuencia

```
P1 dependencia y config ─→ P2 specs ─→ P3 CI ─→ P4 verificación local ─→ P5 docs
```

## 3. Puntos de verificación

| CP | Tras | Comprobación | Criterio |
|---|---|---|---|
| CP1 | P1 | `npx playwright --version` | 1.65.x instalado |
| CP2 | P2 | `npx playwright test` | 6/6 en local |
| CP3 | P3 | Revisión de `deploy.yml` | Chromium + E2E antes de `upload-pages-artifact` |
| CP4 | P4 | `npm run verify` | 159/159 unitarias y bundle intacto |
| CP5 | P5 | Push | CI verde y deploy solo tras E2E |

## 4. Riesgos

| Riesgo | Mitigación |
|---|---|
| WebGL software en CI | Solo errores, no warnings; reintento único |
| Flakiness de carga | Espera a loader oculto + margen de fase 1 |
| Coste de CI | ~3 min; browser cacheado |

## 5. Impacto

**Nuevos:** `playwright.config.js`, 5 specs en `e2e/`, `SPEC-e2e.md`.
**Editados:** `package.json` (script), `eslint.config.js` (globals), `.gitignore`, `deploy.yml`, `SPEC.md`, `README.md`.
**Runtime:** 0 líneas. **Bundle:** sin cambios.
