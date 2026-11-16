# Tareas: `a11y`

Plan: [`plan.md`](plan.md) · Spec: [`../../SPEC-a11y.md`](../../SPEC-a11y.md) · Estado: **completado** (2026-11-16) · Orden: T1 → T2 → T3 → T4 → T5

---

- [x] **T1 — Detección de movimiento reducido**
  - `src/core/ReducedMotion.js`: `prefersReducedMotion(query?)`, `transitionDuration(base, reduced)` y suscripción al cambio.
  - **Aceptación:** 4 casos (activo, inactivo, sin `matchMedia`, duración 0/base).
  - **Verificar:** `npx vitest run tests/ReducedMotion.test.js`
  - **Archivos:** `src/core/ReducedMotion.js`, `tests/ReducedMotion.test.js`

- [x] **T2 — Cámara instantánea con movimiento reducido**
  - `CameraController` recibe la preferencia y usa duración 0 en foco, aterrizaje y zoom de instrumento; escucha cambios.
  - **Aceptación:** el encuadre final es el mismo; `onComplete` sigue ejecutándose.
  - **Verificar:** `npx vitest run tests/CameraController.test.js`
  - **Archivos:** `src/core/CameraController.js`, `tests/CameraController.test.js`

- [x] **T3 — CSS y post-proceso**
  - Regla `@media (prefers-reduced-motion: reduce)` en `style.css`.
  - `main.js`: con la preferencia activa, `vintageOpticsPass.uniforms.uTime` no avanza; los anillos siguen animándose.
  - **Aceptación:** sin transiciones visibles; grano estático; órbita intacta.
  - **Verificar:** `npm run build` · preview con la preferencia emulada
  - **Archivos:** `src/style.css`, `src/main.js`

- [x] **T4 — Loader, canvas e i18n**
  - Loader con `role="status"`, `aria-live="polite"`, `aria-atomic="true"`; progreso limitado a pasos de 5 %.
  - Canvas con `role="img"`, `data-i18n-aria-label="canvas.ariaLabel"` y texto de respaldo.
  - 2 claves nuevas ES/EN en `Localization.js`.
  - **Aceptación:** nodos con semántica correcta y etiqueta en ambos idiomas.
  - **Verificar:** `tests/A11yMarkup.test.js`
  - **Archivos:** `index.html`, `src/main.js`, `src/core/Localization.js`, `tests/A11yMarkup.test.js`

- [x] **T5 — Documentación y verificación**
  - SPEC: H-13 cerrado; README con nota de accesibilidad si procede.
  - **Aceptación:** `npm run verify` verde con ≥ 123 pruebas.
  - **Verificar:** `npm run verify` · `git status --short`
  - **Archivos:** `SPEC.md`, `README.md`, `tasks/a11y/todo.md`

---

## Definición de hecho

- [x] Movimiento reducido desactiva transiciones y grano; la órbita sigue
- [x] Cámara instantánea y encuadre idéntico
- [x] Loader anunciable con progreso limitado
- [x] Canvas con nombre accesible en ES/EN y fallback
- [x] ≥ 123 pruebas y gates verdes
- [x] Aspecto por defecto sin cambios

