# Tareas: `h11`

Spec: [`../../SPEC-h11.md`](../../SPEC-h11.md) · Estado: **completado** (2026-11-16)

---

- [x] **T1 — Corregir el comentario de `RING_OUTER_EDGE`**
  - "Anillo F" → "anillo A (el F tiene su propia constante)".
  - **Aceptación:** valor `136775.0` intacto; 12/12 pruebas de `AstroScale`; bundle sin cambios.
  - **Verificar:** `npx vitest run tests/AstroScale.test.js` · `npm run verify` · `git diff src/math/AstroScale.js`
  - **Archivos:** `src/math/AstroScale.js`

---

## Definición de hecho

- [x] Solo cambia el comentario (una línea)
- [x] 128/128 pruebas y gates verdes
- [x] Bundle idéntico (`index-DCvHMjJN.js`, 905,88 kB)
- [x] H-11 cerrado en `SPEC.md`
