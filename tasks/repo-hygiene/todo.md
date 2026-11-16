# Tareas: `repo-hygiene`

Plan: [`plan.md`](plan.md) · Spec: [`../../SPEC-repo-hygiene.md`](../../SPEC-repo-hygiene.md) · Estado: **completado** (2026-11-16) · Orden: T1 → T2 → T3 → T4

---

- [x] **T1 — Eliminar los modelos duplicados**
  - `git rm -r models/` (7 GLB, 17,4 MB). `public/models/` queda intacto.
  - **Aceptación:** `git ls-files 'models/*'` vacío; `git grep` solo encuentra rutas resueltas contra `public/`; build idéntico.
  - **Verificar:** `git ls-files models` · `npm run build` · `Get-ChildItem dist\models`
  - **Archivos:** `models/*` (borrados)

- [x] **T2 — Un solo lockfile**
  - `git rm bun.lock`; npm queda como gestor canónico.
  - **Aceptación:** `npm ci --dry-run` OK; CI sigue usando `npm ci`.
  - **Verificar:** `npm ci --dry-run` · `git ls-files | Select-String 'lock'`
  - **Archivos:** `bun.lock` (borrado)

- [x] **T3 — Archivos muertos**
  - `git rm src/counter.js src/assets/hero.png src/assets/javascript.svg src/assets/vite.svg public/assets/aistudio/image_7a4811fe.png` y la carpeta vacía.
  - **Aceptación:** sin referencias; 113/113 pruebas; `npm run build` sin cambios.
  - **Verificar:** `git grep -E "counter|hero|javascript\.svg|vite\.svg|aistudio"` · `npx vitest run`
  - **Archivos:** los cinco anteriores

- [x] **T4 — Verificación y documentación**
  - README: `public/models/` como fuente única y npm como gestor.
  - SPEC: H-06 y H-12 cerrados; actualizar §2 y §4 si procede.
  - **Aceptación:** `npm run verify` verde; payload ≤ 43 MB; `asset-report` con las mismas cifras.
  - **Verificar:** `npm run verify` · `node tools/asset-report.mjs` · `git ls-files` · `git status --short`
  - **Archivos:** `README.md`, `SPEC.md`, `tasks/repo-hygiene/todo.md`

---

## Definición de hecho

- [x] Sin `models/` raíz ni `bun.lock` en `git ls-files`
- [x] Sin referencias a los archivos eliminados
- [x] Payload versionado ≤ 43 MB
- [x] `npm run verify` verde con 113/113
- [x] Bundle sin cambios (`index-CORwDyOw.js`, 902,02 kB)
- [x] H-06 y H-12 cerrados en `SPEC.md`

