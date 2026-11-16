# Plan: `remove-texture-studio`

| Campo | Valor |
|---|---|
| Módulo | `remove-texture-studio` |
| Spec | [`../../SPEC-remove-texture-studio.md`](../../SPEC-remove-texture-studio.md) — **pendiente de aprobación** |
| Estado | **Pendiente de aprobación del plan** |
| Alcance | Eliminar la función de IA y su andamiaje; app 100 % estática |
| Dependencias | Se **eliminan** 4 (`@google/genai`, `express`, `@types/express`, `protobufjs`); no se añade ninguna |

---

## 1. Objetivo

Que el repositorio, lo publicado y lo ejecutable coincidan: sin endpoint, sin servidor, sin clave.

## 2. Decisiones técnicas

| id | Decisión | Motivo | Coste |
|---|---|---|---|
| D1 | Eliminar el servidor completo (`server.ts`, `server/`, Express) | Sin API no hay razón para un servidor Node; Pages ya sirve el estático | Se pierde `npm start` y el proxy de Vite en dev |
| D2 | `npm run dev` pasa a `vite` | Evita mantener un wrapper innecesario | Ninguno: mismo puerto 3000 |
| D3 | Eliminar la toolchain de TypeScript (`tsconfig`, `typescript`, `@types/node`, `typecheck` y su paso en CI) | No queda ningún `.ts` que comprobar | Un gate menos, pero sin código que lo necesite |
| D4 | Borrar las 8 pruebas del estudio de texturas y las 3 de overrides GLB que usaban el controlador | Prueban código eliminado | 106 → 95; se actualiza el umbral |
| D5 | Borrar el CSS de la sección (2 bloques delimitados) y las claves i18n | Evitar peso y ruido muertos; git conserva el historial | Revisar que ningún selector sea compartido |
| D6 | Actualizar `metadata.json` y borrar `.env.example` | Ya no hay capacidad de servidor ni variables de entorno | Ninguno |

## 3. Secuencia

```
S1 pruebas + cliente ─→ S2 UI + i18n + CSS ─→ S3 servidor + toolchain + deps ─→ S4 docs ─→ S5 verificación
```

S1 borra primero la prueba y a la vez el código que prueba, para que la suite nunca quede roja entre commits intermedios.

## 4. Puntos de verificación

| CP | Tras | Comprobación | Criterio |
|---|---|---|---|
| CP1 | S1 | `npx vitest run` + `npm run build` | 98/98 verdes; build OK |
| CP2 | S2 | `npm run build` + revisión de `index.html` | Sin sección ni claves `textureStudio.*`; build OK |
| CP3 | S3 | `npm run lint` + `npm ci --dry-run` + build | Lockfile válido; lint verde; sin `express` ni `@google/genai` |
| CP4 | S4 | `grep` de referencias y revisión de README/SPEC | Sin referencias en código; docs coherentes |
| CP5 | S5 | `npm run verify` + `npm run preview` + grep del bundle | Gates verdes; `dist` servido; sin `textures/generate` |

## 5. Riesgos

| Riesgo | Mitigación |
|---|---|
| Extraer mal el bloque de `main.js` (~180 líneas) | Bloques delimitados por constantes de texto; build y pruebas después del corte |
| Selector CSS compartido con otra sección | Cada `.texture-*` se comprueba contra `index.html` y `main.js` antes de borrar |
| CI sigue pidiendo `typecheck` | Se elimina el paso en el mismo commit que el script |
| `npm ci` falla por lockfile desincronizado | `npm uninstall` + `npm install --package-lock-only` + `npm ci --dry-run` |
| Quedan referencias en docs | `grep` final y criterio 1 de la spec |

## 6. Impacto estimado

- **Borrados:** 4 archivos (`TextureStudioController.js`, `TexturePromptCatalog.js`, `server.ts`, `server/textureHandler.ts`), 1 de pruebas, `tsconfig.json`, `.env.example`.
- **Editados:** `index.html`, `src/style.css`, `src/main.js`, `src/core/Localization.js`, `package.json`, `package-lock.json`, `deploy.yml`, `README.md`, `metadata.json`, `SPEC.md`.
- **Balance:** ~−1.700 líneas, −4 paquetes.
- **Pruebas:** 106 → 95.

## 7. Criterios de éxito

Los siete de la spec §6, con evidencia de: suite en 95, bundle sin `textures/generate`, `preview` sirviendo `dist/` y H-01/H-04 cerrados por eliminación.

## 8. Nota operativa

Este incremento **no requiere claves, cuentas ni despliegues**. El push a Pages se hace al final, con tu visto bueno, para comprobar que la sección ya no aparece en producción.
