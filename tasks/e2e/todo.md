# Tareas: `test-depth` fase B (E2E)

Spec: [`../../SPEC-e2e.md`](../../SPEC-e2e.md) · Plan: [`plan.md`](plan.md) · Estado: **completado** (2026-11-16)

---

- [x] **P1 — Dependencia y configuración**
  - `@playwright/test` 1.65; `playwright.config.js` con `webServer` de preview y artefactos al fallar.
  - **Verificación:** `npx playwright --version`.

- [x] **P2 — Specs E2E**
  - `boot` (2), `quality`, `i18n`, `mission`, `a11y`.
  - **Verificación:** `npx playwright test` → **6/6** en local (1,5 min).

- [x] **P3 — CI**
  - Instalación de Chromium y `npm run test:e2e` antes de publicar; reporte como artefacto en fallo.
  - **Verificación:** revisión de `.github/workflows/deploy.yml`.

- [x] **P4 — Verificación**
  - `npm run verify` con 159/159 unitarias; bundle intacto (905,88 kB).
  - **Verificación:** `npm run verify`.

- [x] **P5 — Documentación**
  - SPEC, README y este registro.
  - **Verificación:** `git status --short`.

---

## Definición de hecho

- [x] 6/6 E2E verdes en local
- [x] 159/159 unitarias y gates verdes
- [x] CI ejecuta E2E antes de publicar
- [x] Sin cambios de runtime ni de bundle
- [x] H-08 cerrado
