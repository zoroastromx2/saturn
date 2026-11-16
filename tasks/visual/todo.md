# Tareas: `test-depth` fase C (visual)

Spec: [`../../SPEC-visual.md`](../../SPEC-visual.md) · Plan: [`plan.md`](plan.md) · Estado: **completado** (2026-11-16)

---

- [x] **V1 — Aleatoriedad sembrada y pluma congelable**
  - `Random.js` (mulberry32) y sustitución en anillo F y pluma.
  - `EnceladusSimulator.frozen` para detener la emisión.
  - **Verificación:** `tests/Random.test.js` (4 casos).

- [x] **V2 — Modo E2E en la app**
  - `?e2e=1` siembra RNG, fija fecha, congela tiempo, emite pluma una vez y expone `window.__E2E_READY__`.
  - **Verificación:** capturas estables en dos ejecuciones.

- [x] **V3 — Proyecto visual de Playwright**
  - `snapshotPathTemplate` sin plataforma; SwiftShader; `deviceScaleFactor: 1`; reduced motion.
  - **Verificación:** `--list` muestra 5 escenas.

- [x] **V4 — Escenas**
  - default, titán, misión Pioneer 11, instrumento y móvil.
  - **Verificación:** 5/5.

- [x] **V5 — Baselines**
  - Generadas y versionadas en `e2e/visual/__screenshots__/` (~3,2 MB); repetición estable.
  - **Verificación:** `npm run test:visual` → 5/5 (54 s).

- [x] **V6 — CI, documentación y verificación**
  - Paso visual antes de publicar; README y SPEC actualizados.
  - **Verificación:** suite completa 11/11 y `npm run verify` 163/163.

---

## Definición de hecho

- [x] 5 capturas estables y versionadas
- [x] 11/11 E2E+visual en local
- [x] 163/163 unitarias
- [x] CI ejecuta visual antes del deploy
- [x] App normal sin cambios (modo E2E solo con `?e2e=1`)
- [x] H-14 cerrado
