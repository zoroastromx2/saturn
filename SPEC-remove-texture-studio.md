# Spec: `remove-texture-studio`

| Campo | Valor |
|---|---|
| Módulo | `remove-texture-studio` (traza a `SPEC.md` §9 `texture-studio` y H-01/H-04) |
| Spec padre | `SPEC.md` — aprobada el 2026-11-16 |
| Estado | **Aprobada e implementada** — 2026-11-16 |
| Decisión de producto | Eliminar la generación de texturas por IA (opción B, 2026-11-16) |
| Cierra | **H-01** (API inexistente en Pages) y **H-04** (endpoint sin auth) por eliminación |

---

## 1. Objetivo

Dejar el proyecto como **aplicación 100 % estática**: sin Estudio de texturas, sin endpoint de generación, sin servidor Express y sin dependencia de Gemini. Lo que se publica es exactamente lo que se puede ejecutar, y desaparecen dos hallazgos que solo existían por esa función.

## 2. Por qué

- La función **no puede funcionar en el único destino de publicación** (Pages estático) y requiere una clave que hoy no existe.
- El endpoint era **público, sin autenticación ni cuota** (H-04): riesgo de coste si algún día se exponía.
- Se mantenían **~1.700 líneas, un servidor completo y dos dependencias** para una capacidad no desplegable.
- Eliminarla cierra H-01 y H-04 sin escribir infraestructura.

## 3. Alcance

**Dentro**

1. Sección "Estudio de texturas" del HUD, sus estilos y sus claves i18n.
2. `TextureStudioController`, `TexturePromptCatalog` y todo el cableado en `main.js`.
3. `server.ts`, `server/textureHandler.ts`, el endpoint `/api/*`, Express y `@google/genai`.
4. Herramientas que solo existían por el servidor: `tsconfig.json`, `typescript`, `@types/node`, script `typecheck` y su paso en CI.
5. `tests/TextureStudio.test.js` (8 pruebas) y el umbral de pruebas (106 → 98).
6. `metadata.json`, `.env.example`, README y las secciones afectadas de `SPEC.md`.

**Fuera**

- Cualquier otra función: render, anillos, lunas, misiones, instrumento, snapshots, telemetría, i18n general.
- Texturas base, modelos GLB, audio y assets.
- Los gates de formato, lint, pruebas y build (se conservan).

## 4. Inventario de eliminación

| Elemento | Ubicación | Tamaño aprox. |
|---|---|---|
| Sección del HUD | `index.html` `<details class="texture-studio-section">` | ~68 líneas |
| Estilos | `src/style.css` bloques `.texture-*` (2 zonas) | ~105 líneas |
| i18n | `src/core/Localization.js` claves `textureStudio.*` | ~20 claves × 2 |
| Cliente | `src/core/TextureStudioController.js` | ~250 líneas |
| Catálogo | `src/core/TexturePromptCatalog.js` | ~161 líneas |
| Cableado | `src/main.js` imports, declaración y bloque de handlers | ~180 líneas |
| Servidor | `server.ts` + `server/textureHandler.ts` | 49 + ~182 líneas |
| Pruebas | `tests/TextureStudio.test.js` y 3 pruebas de overrides en modelos GLB | 11 pruebas |
| Toolchain TS | `tsconfig.json`, `typescript`, `@types/node`, script y paso CI | — |
| Config | `.env.example`, capacidad en `metadata.json` | — |
| Dependencias | `@google/genai`, `express`, `@types/express` (+ `protobufjs`) | 4 paquetes |

## 5. Consecuencias (esperadas, no accidentes)

- `npm run dev` pasa a ser **`vite`** directo; `server.ts` y `npm start` desaparecen. Producción local se comprueba con `npm run preview`.
- **Desaparece el gate de tipos** porque no queda TypeScript. `verify` = lint + formato + pruebas + build.
- Las pruebas bajan a **95** (8 del estudio + 3 de overrides GLB que usaban el controlador); el umbral se actualiza, no se relaja la calidad.
- El **bundle del cliente se reduce** al desaparecer el cliente de texturas y su cableado; no debe quedar la cadena `textures/generate`. Los paquetes de servidor (`express`, `@google/genai`) nunca estuvieron en el bundle.
- `node_modules` se reduce; desaparece `protobufjs`.

## 6. Criterios de éxito

1. `grep -rIn "textureStudio\|TextureStudio\|textures/generate\|GEMINI\|@google/genai\|express"` no devuelve referencias en código, salvo el registro histórico de `SPEC.md`.
2. `npm run verify` verde con **95/95** pruebas.
3. `npm run build` correcto, bundle **menor** y sin la cadena `textures/generate`.
4. La página publicada no muestra la sección y no emite ninguna petición a `/api`.
5. `npm run dev` arranca Vite y `npm run preview` sirve `dist/`.
6. H-01 y H-04 marcados como cerrados por eliminación en `SPEC.md`.
7. `metadata.json` ya no declara capacidad de servidor.

## 7. Límites

**Always**
- Verificar build y pruebas tras cada bloque de eliminación.
- No tocar `src/math/**`, shaders ni simuladores.
- Actualizar README y SPEC en el mismo incremento.

**Ask first**
- Conservar `npm start` como alias de `vite preview`.
- Eliminar también los estilos huérfanos si algún selector resultara compartido.

**Never**
- Dejar imports, claves i18n o estilos apuntando a algo eliminado.
- Silenciar pruebas en vez de borrar las que ya no aplican.
- Añadir dependencias para "compensar" la eliminación.

## 8. Riesgos

| Riesgo | Mitigación |
|---|---|
| Romper `main.js` al extraer ~180 líneas de cableado | Bloques delimitados + build y pruebas después de cada extracción |
| Dejar CSS huérfano o eliminar selectores compartidos | Comprobar que cada selector `.texture-*` solo se use en la sección eliminada |
| Perder el gate de tipos sin sustituto | No hay TS tras la eliminación; lint + pruebas + build siguen cubriendo JS |
| Cambiar el bundle de forma inesperada | Debe **encoger**; se verifica que no queden cadenas del API y que el resto de módulos sigue presente (`71 → menos` en el log de build) |
| Referencias residuales en docs | Criterio 1 del §6 y revisión final de `grep` |

## 9. Preguntas abiertas

1. ¿**Elimino `npm start`** o lo dejo como alias de `npm run preview`? Recomendación: eliminarlo; `preview` ya existe.
2. ¿**Borro los estilos** de la sección o los dejo "por si vuelve"? Recomendación: borrarlos; el historial de git los conserva.
