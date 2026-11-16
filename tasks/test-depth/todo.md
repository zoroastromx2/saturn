# Tareas: `test-depth` (fase A)

Plan: [`plan.md`](plan.md) · Spec: [`../../SPEC-test-depth.md`](../../SPEC-test-depth.md) · Estado: **completado** (2026-11-16) · Orden: T1 → T2 → T3 → T4 → T5

---

- [x] **T1 — `SaturnSimulator`**
  - Stub de `document` para `CSS2DObject`.
  - Casos: nombres `Saturn`/`Rings`; geometría con `polRadius/eqRadius`; uniforms del planeta y de los anillos exactos; 6 ranuras de sombra; error en la séptima; radio escrito en `moonShadowRadii`; audio adjunto con buffer y nulo sin él.
  - **Aceptación:** ≥ 8 casos verdes.
  - **Verificar:** `npx vitest run tests/SaturnSimulator.test.js`
  - **Archivos:** `tests/SaturnSimulator.test.js`

- [x] **T2 — `Localization`**
  - Paridad de claves ES/EN por lectura estática; valores no vacíos.
  - `t()` con fallback a la clave; `setLanguage` actualiza `textContent`, `aria-label`, `placeholder`, `lang`, título y emite `languagechange`; idioma desconocido se ignora.
  - **Aceptación:** paridad exacta y 0 valores vacíos.
  - **Verificar:** `npx vitest run tests/Localization.test.js`
  - **Archivos:** `tests/Localization.test.js`

- [x] **T3 — Contrato GLSL ↔ materiales**
  - Parser de `uniform` (incluye arrays) y `varying`, con pruebas propias.
  - Inventario: todo `.vert`/`.frag` tiene importador.
  - Cobertura: uniforms del GLSL ⊆ claves de `material.uniforms` (lista blanca de Three).
  - Paridad de varyings vert/frag por par.
  - **Aceptación:** 6 pares + pase vintage cubiertos; sin excepciones amplias.
  - **Verificar:** `npx vitest run tests/ShaderContract.test.js`
  - **Archivos:** `tests/ShaderContract.test.js`, `tests/glslParser.test.js` (si se separa)

- [x] **T4 — Shaders huérfanos**
  - Borrar `src/shaders/titan.vert`, `titan.frag`, `ering.frag`.
  - **Aceptación:** sin referencias; build idéntico; inventario verde.
  - **Verificar:** `git grep -n "titan\\.frag\\|titan\\.vert\\|ering\\.frag"` · `npm run build`
  - **Archivos:** los tres shaders

- [x] **T5 — Verificación y documentación**
  - `SPEC.md`: H-08 parcialmente cerrado (fase A) y siguiente fase documentada.
  - **Aceptación:** `npm run verify` con ≥ 140 pruebas; bundle sin cambios.
  - **Verificar:** `npm run verify` · `git status --short`
  - **Archivos:** `SPEC.md`, `README.md`, `tasks/test-depth/todo.md`

---

## Definición de hecho

- [x] ≥ 140 pruebas y gates verdes
- [x] Contrato de uniforms y varyings en verde
- [x] Inventario sin shaders huérfanos
- [x] Cero dependencias nuevas
- [x] Bundle idéntico
- [x] H-08 marcado como parcialmente cerrado

