# Plan: `quality-gates`

| Campo | Valor |
|---|---|
| Módulo | `quality-gates` (traza a `SPEC.md` §9 y §11) |
| Spec de referencia | `SPEC.md` — aprobada el 2026-11-16 |
| Estado | **Aprobado y ejecutado** (2026-11-16) |
| Producción | GitHub Pages (estático): el plan **no** añade despliegue de servidor |
| Alcance | Lint + formato + typecheck + CI con pruebas. **Sin cambios de comportamiento** |

---

## 1. Objetivo

Que cualquier cambio que rompa pruebas, tipos, estilo o formato falle automáticamente —en local y en CI— antes de publicar. Cierra **H-02** (CI no ejecuta pruebas) y **H-05** (sin lint/typecheck/`engines`).

## 2. Alcance

**Dentro:** configuración de ESLint, Prettier y TypeScript; scripts npm; `engines`; pipeline de CI; corrección mecánica de los hallazgos; README actualizado.

**Fuera:** umbral de cobertura y E2E (`test-depth`), jsdom, i18n de misiones, presupuesto de assets, `deploy-api`, cualquier cambio en `src/math/**` o en la lógica de los shaders.

## 3. Decisiones técnicas

| id | Decisión | Motivo | Coste asumido |
|---|---|---|---|
| D1 | **ESLint 9 en flat config, solo JavaScript.** TypeScript queda cubierto por `tsc` | Evita `typescript-eslint` (2 archivos TS no lo justifican) y deja los tipos en una sola fuente | El servidor no recibe reglas de estilo de ESLint, solo de tipos y Prettier |
| D2 | **Prettier como única fuente de formato**, con `eslint-config-prettier` desactivando solapamientos | El repo ya mezcla comillas simples y dobles; un formateador elimina la discusión | Un reformateo inicial amplio |
| D3 | **Reformateo en un paso aislado**, sin ediciones manuales | Permite revisar "solo formato" sin lógica mezclada | Excepción consciente a la regla de ≤5 archivos por tarea |
| D4 | **`tsconfig` solo para el servidor**: `noEmit`, `strict`, `allowImportingTsExtensions`, `allowJs` + `checkJs:false` | `server/textureHandler.ts` importa `src/core/TexturePromptCatalog.js`; el cliente no se migra | Tipado débil en ese import JS |
| D5 | **Node ≥ 22.18 declarado** y CI sube de 20 a 22.18+ | `node server.ts` depende del type stripping nativo; Vite 8 ya exige ≥20.19/≥22.12 | CI deja de probar Node 20 (irrelevante: solo compila) |
| D6 | **CI en el mismo job, antes de subir el artefacto**: install → format:check → lint → typecheck → test → build | Un fallo corta el job y nunca se publica | Pipeline algo más lento (~+25 s) |
| D7 | **`npm run verify`** como comando único local | Un solo comando para "¿está todo bien?" y para documentar | Ninguno |

## 4. Secuencia

```
T1 toolchain ─→ T2 tsconfig/typecheck ─→ T3 eslint ─→ T4 prettier ─→ T5 CI ─→ T6 docs
```

T2 y T3 son independientes entre sí, pero ambos editan `package.json`; se serializan para evitar conflictos. T4 va después de T3 para no reformatear dos veces. T5 necesita T2–T4 ya verdes.

## 5. Puntos de verificación

| CP | Tras | Comprobación | Criterio |
|---|---|---|---|
| CP1 | T1 | `npm ls eslint prettier typescript @types/node`; `npm run` | Sin dependencias inválidas; scripts presentes |
| CP2 | T2 | `npm run typecheck` + `npx vitest run` | `tsc` exit 0, 106/106 pruebas |
| CP3 | T3 | `npm run lint` + `npx vitest run` + `npm run build` | Lint 0 errores; 106/106; bundle 911,57 kB ±1 % |
| CP4 | T4 | `npm run format:check` + `git diff --stat` + pruebas + build | Formato limpio; diff solo cosmético; bundle ±1 % |
| CP5 | T5 | Revisión del YAML y `npx prettier --check .github/workflows/deploy.yml` | YAML válido; orden de gates correcto |
| CP6 | T6 | `npm run verify` + `git status` | Exit 0; solo archivos previstos |

## 6. Riesgos y mitigación

| Riesgo | Prob. | Mitigación |
|---|---|---|
| El reformateo esconde un cambio lógico | Media | T4 es un paso aislado sin ediciones manuales; se valida con 106 pruebas, build y tamaño de bundle |
| `engines` rompe el CI si sigue en Node 20 | Alta | T5 sube CI a Node 22.18 en el mismo cambio; `npm ci` no usa `engine-strict` |
| Un hallazgo de lint exige cambiar lógica | Baja | Solo se permiten borrados de código muerto o renombrados; cualquier cambio semántico **detiene la tarea** y se consulta |
| Los tipos de `@google/genai` no incluyen `imageConfig` | Media | Se ajusta la llamada o se usa un cast mínimo documentado; si revela un desajuste real de API, se reporta antes de tocar comportamiento |
| Prettier toca GLSL o tablas Markdown | Baja | `src/shaders/**` y `**/*.md` excluidos |

## 7. Criterios de éxito

1. `npm run verify` termina con exit 0.
2. Siguen pasando **106/106** pruebas y el bundle se mantiene en **911,57 kB ±1 %**.
3. El pipeline ejecuta los cinco gates antes de publicar; un fallo impide el despliegue.
4. `server.ts` y `server/**` compilan bajo `strict` sin `any` ni `@ts-ignore` nuevos.
5. `engines.node` declarado y CI en Node ≥ 22.18.
6. `src/math/**` y la lógica de los shaders quedan intactas.

## 8. Impacto estimado

5 archivos nuevos de configuración (`eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `tsconfig.json`, y `tasks/todo.md` como artefacto de seguimiento), 4 editados (`package.json`, `deploy.yml`, `README.md`, `SPEC.md`), ≤10 archivos con correcciones de lint y ~40 reformateados mecánicamente. **Cero cambios en archivos de simulación.**

## 9. Nota operativa

No se hará `commit` ni `push` sin instrucción explícita. La verificación del pipeline real requiere publicar, algo que queda a tu decisión; en local se valida con los mismos comandos en el mismo orden.
