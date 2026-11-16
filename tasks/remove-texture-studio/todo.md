# Tareas: `remove-texture-studio`

Plan: [`plan.md`](plan.md) · Spec: [`../../SPEC-remove-texture-studio.md`](../../SPEC-remove-texture-studio.md) · Estado: **completado** (2026-11-16) · Orden: S1 → S2 → S3 → S4 → S5

---

- [x] **S1 — Cliente y pruebas**
  - Borrados `src/core/TextureStudioController.js`, `src/core/TexturePromptCatalog.js` y `tests/TextureStudio.test.js`.
  - Retiradas las 3 pruebas de overrides GLB que usaban el controlador (`TitanModel`, `EnceladusModel`, `MimasModel`), conservando sus pruebas de geometría y encuadre.
  - Quitados de `main.js`: imports, declaración, instanciación y el bloque de handlers (178 líneas).
  - **Verificación:** 95/95 pruebas; build OK; sin referencias a `TextureStudio` en `src/`.

- [x] **S2 — UI, i18n y estilos**
  - Sección del HUD eliminada (69 líneas de `index.html`).
  - 19 claves `textureStudio.*` × 2 idiomas eliminadas.
  - 108 líneas de CSS eliminadas (bloque principal + variantes de tema claro); se reparó la lista `:disabled` al quitar los botones.
  - **Verificación:** sin referencias `texture-*` en HTML, CSS ni i18n; build OK.

- [x] **S3 — Servidor, toolchain y dependencias**
  - Borrados `server.ts`, `server/`, `tsconfig.json`, `.env.example`.
  - Desinstalados `@google/genai`, `express`, `@types/express`, `typescript`, `@types/node`.
  - `dev` → `vite`; `start` y `typecheck` eliminados; `verify` sin typecheck; `engines.node >= 20.19.0`.
  - CI sin paso "Typecheck"; `metadata.json` sin capacidad de servidor.
  - **Verificación:** `npm ci --dry-run` OK; lint verde; build OK.

- [x] **S4 — Documentación**
  - README: requisitos de Vite, `dev`/`build`/`preview`/`test`, gates sin typecheck.
  - SPEC: stack, comandos, estructura, pruebas, mapa de capacidades y preguntas actualizados; H-01 y H-04 cerrados por eliminación.
  - **Verificación:** `grep -rin "gemini\|textures/generate" README.md SPEC.md` sin coincidencias.

- [x] **S5 — Verificación final**
  - `npm run verify` verde; `npm run preview` sirve `dist/` sin la sección; `npm run dev` arranca Vite.
  - Bundle: 898.316 B (antes 911.548) y 0 coincidencias de `textures/generate`.
  - **Archivos:** `tasks/remove-texture-studio/todo.md`

---

## Definición de hecho

- [x] 95/95 pruebas y gates verdes (lint, formato, pruebas, build)
- [x] Sin referencias a `textureStudio`, `TextureStudio`, `textures/generate` ni `GEMINI` en código
- [x] `npm run dev` arranca Vite; `npm run preview` sirve `dist/`
- [x] Bundle menor y sin la cadena del API
- [x] H-01 y H-04 cerrados por eliminación en `SPEC.md`
- [x] Sin dependencias de servidor ni secretos
