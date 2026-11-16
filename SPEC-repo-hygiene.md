# Spec: `repo-hygiene` — una sola copia de cada cosa

| Campo | Valor |
|---|---|
| Módulo | `repo-hygiene` (traza a `SPEC.md` H-06, con H-12 como secundario) |
| Spec padre | `SPEC.md` — aprobada el 2026-11-16 |
| Estado | **Aprobada e implementada** — 2026-11-16 |
| Cierra | **H-06** (modelos duplicados + doble lockfile) y **H-12** (archivos muertos) |
| No toca | Código de simulación, shaders ni `src/math/` |

---

## 1. Objetivo

Que el repositorio tenga **una sola copia** de cada activo versionado, **un solo lockfile** y **cero archivos huérfanos**, sin cambiar el comportamiento ni el bundle.

## 2. Situación actual (medida)

| Elemento | Peso | Problema |
|---|---:|---|
| `models/` (raíz) | 17,4 MB | Copia byte a byte de `public/models/`; ambas versionadas |
| `public/models/` | 17,4 MB | La que realmente sirve el build |
| `bun.lock` | — | Lockfile sin uso: CI y scripts usan npm |
| `src/counter.js`, `src/assets/{hero.png,javascript.svg,vite.svg}` | ~23 KB | Restos de la plantilla Vite |
| `public/assets/aistudio/image_7a4811fe.png` | 141 KB | Sin referencias |

- Payload versionado actual: **60,4 MB**; `.git`: **39,1 MB**.
- Los 7 GLB de `models/` y `public/models/` tienen **SHA-256 idénticos**.
- `AssetFetcher` resuelve las rutas contra `public/` (`assetUrl('models/…')`), así que la carpeta raíz **no se usa**.
- No hay referencias a `bun` en scripts, CI ni README.

## 3. Alcance

**Dentro**

1. Eliminar `models/` de la raíz; `public/models/` queda como única fuente.
2. Eliminar `bun.lock`; `package-lock.json` es el lockfile canónico.
3. Eliminar los 5 archivos muertos y la carpeta `src/assets/` si queda vacía.
4. Actualizar README/SPEC para declarar ambas cosas.

**Fuera**

- Reescribir el historial de git (`filter-repo`, BFG, force push). Ver §7.
- Corregir el comentario de `RING_OUTER_EDGE` (H-11): toca `src/math/`, prohibido sin aprobación expresa.
- Cualquier cambio de código, dependencias o assets servidos.

## 4. Criterios de éxito

1. `git ls-files` no contiene `models/*` ni `bun.lock`.
2. Payload versionado baja de **60,4 MB** a **≤ 43 MB**.
3. `git grep` no encuentra referencias a los archivos eliminados.
4. `npm run verify` verde con **113/113** pruebas.
5. El bundle conserva nombre y tamaño (`index-CORwDyOw.js`, 902,02 kB) y `node tools/asset-report.mjs` da los mismos números.
6. El sitio publicado sigue sirviendo `models/*.glb` desde `public/`.

## 5. Límites

**Always**
- Verificar con `git grep` antes y después de cada borrado.
- Mantener `public/models/` intacto.
- Confirmar que el build no cambia.

**Ask first**
- Reescribir historia para reducir `.git`.
- Tocar `src/math/` (aunque sea un comentario).
- Eliminar algún activo que no esté en el inventario de §2.

**Never**
- Borrar `public/models/` o `public/textures/`.
- Cambiar el lockfile canónico sin actualizar CI.
- Hacer force push sin autorización explícita.

## 6. Riesgos

| Riesgo | Mitigación |
|---|---|
| Algún flujo externo usa `models/` de la raíz | Se documenta `public/models/` como fuente única; los GLB no cambian |
| Un `bun install` deja de ser reproducible | Decisión explícita: npm es el gestor soportado (CI ya lo usa) |
| El borrado no reduce el clon | Cierto: el historial conserva los blobs. Se explica en §7 |

## 7. Nota sobre el tamaño real del clon

Borrar archivos **no reduce** el tamaño de `.git`: los blobs siguen en el historial. Este incremento evita que el repo **siga creciendo** y limpia el árbol de trabajo, pero para bajar de 39,1 MB haría falta reescribir historia y hacer `force push`, algo que cambia todos los hashes y afecta a cualquier clon existente.

**Recomendación:** no reescribir. Si algún día el tamaño duele, se hace como operación separada y autorizada.

## 8. Preguntas abiertas

1. **¿Confirmas que `public/models/` es la fuente única** y que nadie usa `models/` fuera del repo? Recomendación: sí.
2. **¿Aceptas eliminar `bun.lock`** y declarar npm como único gestor? Recomendación: sí.
3. **¿Reescribimos historia** para recuperar ~17 MB del `.git`? Recomendación: **no**.
