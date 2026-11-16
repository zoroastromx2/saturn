# Plan: `repo-hygiene`

| Campo | Valor |
|---|---|
| Módulo | `repo-hygiene` |
| Spec | [`../../SPEC-repo-hygiene.md`](../../SPEC-repo-hygiene.md) — **pendiente de aprobación** |
| Estado | **Pendiente de aprobación del plan** |
| Alcance | Duplicados, lockfile y archivos muertos. Sin cambios de código |
| Dependencias | Ninguna |

---

## 1. Objetivo

Un solo ejemplar de cada activo y un solo lockfile, verificando que el build no cambia.

## 2. Decisiones

| id | Decisión | Motivo | Coste |
|---|---|---|---|
| D1 | `public/models/` es la fuente única; se elimina `models/` raíz | Es la ruta que resuelve `assetUrl` y la que copia el build | Quien usara la raíz debe cambiar de ruta |
| D2 | npm canónico; se elimina `bun.lock` | CI y scripts ya usan npm; dos lockfiles divergen | Se pierde el `bun install` reproducible |
| D3 | Borrar los 5 archivos muertos y `src/assets/` vacía | Sin referencias; ruido en auditorías | Ninguno |
| D4 | No reescribir historia | Evita force push y romper clones | `.git` sigue en 39,1 MB |

## 3. Secuencia

```
T1 modelos duplicados ─→ T2 lockfile ─→ T3 archivos muertos ─→ T4 verificación y docs
```

## 4. Puntos de verificación

| CP | Tras | Comprobación | Criterio |
|---|---|---|---|
| CP1 | T1 | `git grep "models/"` + build | Solo rutas de `public/`; bundle idéntico |
| CP2 | T2 | `npm ci --dry-run` | Lockfile válido con npm |
| CP3 | T3 | `git grep` de los 5 nombres + tests | Sin referencias; 113/113 |
| CP4 | T4 | `npm run verify` + `tools/asset-report.mjs` + `git ls-files` | Gates verdes; cifras intactas; payload ≤ 43 MB |

## 5. Riesgos

| Riesgo | Mitigación |
|---|---|
| Romper el deploy de GLB | `public/models/` no se toca; se comprueba la ruta en el build y en Pages |
| Perder una fuente que alguien usa | Se documenta en README y en esta spec |
| Confundir "payload" con ".git" | Nota §7 de la spec; no se promete reducción del clon |

## 6. Impacto estimado

- **Borrados:** 7 GLB raíz (17,4 MB), `bun.lock`, 5 archivos muertos, carpeta `src/assets/`.
- **Editados:** `README.md`, `SPEC.md`.
- **Código:** 0 líneas.
- **Payload:** 60,4 → ~42,8 MB.

## 7. Criterios de éxito

Los seis de la spec §4, con evidencia de `git ls-files`, `npm run verify` y `asset-report`.

## 8. Nota operativa

El push a Pages se hará al final con tu visto bueno. Como no cambia código, el bundle debe seguir siendo `index-CORwDyOw.js`.
