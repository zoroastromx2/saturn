# Tareas: `i18n-missions`

Plan: [`plan.md`](plan.md) · Spec: [`../../SPEC-i18n-missions.md`](../../SPEC-i18n-missions.md) · Estado: **completado** (2026-11-16) · Orden: T1 → T2 → T3 → T4 → T5

---

- [x] **T1 — Helper y datos localizados**
  - `src/core/LocalizedText.js`: `resolveLocalized(value, language)` (string pasa tal cual; fallback `language → es → en`).
  - `HistoricalMissions.js`: `name`, `description` y `milestones[].title` como `{ es, en }`.
  - **Aceptación:** los 6 nombres, 6 descripciones y 18 hitos tienen `es` y `en` no vacíos; ningún valor numérico cambia.
  - **Verificar:** `npx vitest run tests/LocalizedText.test.js` · `node -e` de paridad
  - **Archivos:** `src/core/LocalizedText.js`, `src/data/HistoricalMissions.js`

- [x] **T2 — `MissionSimulator` reactivo al idioma**
  - `badge.textContent` y `dataset.detail` usan `resolveLocalized(..., getLanguage())`.
  - `refreshLanguage()` recorre `milestoneBadges` y reetiqueta.
  - **Aceptación:** cambiar idioma con misión activa no reconstruye la curva y actualiza todos los badges.
  - **Verificar:** `npx vitest run tests/HistoricalMissions.test.js`
  - **Archivos:** `src/core/MissionSimulator.js`

- [x] **T3 — `main.js`, selector e i18n**
  - Panel de misión, HUD de instrumento y snapshot usan texto localizado.
  - `languagechange` actualiza descripción y llama a `missionSim.refreshLanguage()`.
  - `<option>` con `data-i18n="mission.option.*"`; 6 claves × 2 en `Localization.js`.
  - **Aceptación:** ES→EN cambia selector, panel, badges e instrumento sin recargar.
  - **Verificar:** `npm run build` · preview con cambio de idioma
  - **Archivos:** `src/main.js`, `src/core/Localization.js`, `index.html`

- [x] **T4 — Pruebas**
  - `LocalizedText.test.js`: string, `{es,en}`, fallback, objeto vacío.
  - `HistoricalMissions.test.js`: paridad de los 30 campos y referencias a `title.es`.
  - **Aceptación:** ≥ 117 pruebas verdes.
  - **Verificar:** `npx vitest run`
  - **Archivos:** `tests/LocalizedText.test.js`, `tests/HistoricalMissions.test.js`

- [x] **T5 — Documentación y verificación**
  - SPEC: H-07 cerrado; README si procede.
  - **Aceptación:** `npm run verify` verde; sin usos de `description`/`title` como string en `src/`.
  - **Verificar:** `npm run verify` · `git grep -nE "milestone\.title[^.]|mission\.description[^.]" src`
  - **Archivos:** `SPEC.md`, `README.md`, `tasks/i18n-missions/todo.md`

---

## Definición de hecho

- [x] 6 nombres + 6 descripciones + 18 hitos con `es`/`en`
- [x] El selector se traduce con `data-i18n`
- [x] `refreshLanguage()` actualiza badges vivos
- [x] Snapshot y HUD de instrumento usan el idioma activo
- [x] ≥ 117 pruebas y gates verdes
- [x] Redacción española intacta

