# Tareas: `quality-gates`

Plan: [`plan.md`](plan.md) · Spec: [`../SPEC.md`](../SPEC.md) · Estado: **completado** (2026-11-16) · Orden de ejecución: T1 → T2 → T3 → T4 → T5 → T6

Cada tarea se completó y se verificó antes de empezar la siguiente.

---

- [x] **T1 — Toolchain y scripts**
  - Instaladas como `devDependencies`: ESLint 10.15, `@eslint/js` 10.0, `globals` 17.14, Prettier 3.10, `eslint-config-prettier` 10.1, TypeScript 7.0, `@types/node` 26.6. `@types/express` movido a `devDependencies`.
  - Scripts: `lint`, `lint:fix`, `format`, `format:check`, `typecheck`, `verify`. `engines.node: ">=22.18.0"`.
  - **Verificación:** `npm ls` sin dependencias inválidas; versiones resueltas; seis scripts presentes.

- [x] **T2 — `tsconfig` y typecheck del servidor**
  - `tsconfig.json` con `strict`, `noEmit`, `NodeNext`, `allowImportingTsExtensions`, `allowJs`/`checkJs:false`.
  - **Resultado:** 0 errores de tipo sin tocar lógica; se comprobó que el checker detecta errores reales con un archivo sonda temporal.
  - **Verificación:** `npm run typecheck` exit 0; `npx vitest run` 106/106.

- [x] **T3 — ESLint flat config y corrección de hallazgos**
  - `eslint.config.js` con `js.configs.recommended`, globals por zona, `no-unused-vars` ajustado y `eslint-config-prettier/flat`.
  - **3 hallazgos corregidos, ninguno semántico:** comentario en `catch` vacío (`AssetFetcher`), constante muerta `FORWARD` (`MissionSimulator`), asignación inútil de `payload` (`TextureStudioController`).
  - **Verificación:** `npm run lint` 0 errores/0 warnings; 106/106; build OK.

- [x] **T4 — Prettier: configuración y reformateo base**
  - `.prettierrc.json` (`singleQuote`, `printWidth 100`, `trailingComma none`, LF) y `.prettierignore` (assets, lockfiles, shaders, Markdown, `index.html`).
  - **Desviación justificada del plan:** `index.html` quedó excluido. Prettier partía cierres de etiqueta (`</span\n>`), válido pero ilegible; se restauró el HTML original.
  - **Añadido no previsto:** `.gitattributes` (`* text=auto eol=lf`) para que el formato LF sea estable en Windows y en CI.
  - **Verificación:** `format:check` 0; 106/106; bundle **byte a byte idéntico** al de T3 (`index-DaYShK33.js`, 911.548 B).

- [x] **T5 — CI con gates de calidad**
  - `.github/workflows/deploy.yml`: Node 22.18.0 y gates `format:check → lint → typecheck → test → build` antes de subir el artefacto.
  - **Verificación:** YAML parseado por Prettier; orden revisado; sin secretos nuevos.

- [x] **T6 — Documentación y verificación final**
  - README con requisitos, comandos reales y sección de calidad; SPEC actualizada (H-02 y H-05 cerrados, estado del incremento, comandos).
  - **Verificación:** `npm run verify` exit 0.

---

## Definición de hecho del incremento

- [x] `npm run verify` exit 0 (lint → format:check → typecheck → test → build)
- [x] 106/106 pruebas; bundle 911.548 B (−0,002 % respecto a 911.570 B)
- [x] `engines` declarado y CI en Node ≥ 22.18
- [x] Cero cambios en `src/math/**` y en la lógica de shaders
- [x] Sin cambios de comportamiento observable (mismo bundle tras el formateo)
