# Spec: `h11` — comentario del borde exterior de los anillos

| Campo | Valor |
|---|---|
| Módulo | `h11` (traza a `SPEC.md` H-11) |
| Estado | **Aprobada e implementada** — 2026-11-16, con autorización expresa del humano para tocar `src/math/` (solo comentario) |
| Cierra | **H-11** |

## Objetivo

Corregir la etiqueta de `RING_OUTER_EDGE`: 136.775 km es el borde exterior del **anillo A**; el anillo F está a 140.180 km y ya tiene su propia constante (`F_RING_RADIUS`).

## Alcance

- Una línea de comentario en `src/math/AstroScale.js`.
- **Ningún valor numérico cambia.** No se toca lógica, shaders ni tests.

## Criterios de éxito

1. El comentario dice "anillo A" y aclara que el F tiene constante propia.
2. `RING_OUTER_EDGE` sigue valiendo `136775.0`.
3. `npm run verify` verde con **128/128** pruebas.
4. El bundle no cambia (`index-DCvHMjJN.js`).

## Límites

- **Never:** cambiar el valor de la constante, tocar `RingOptics` o los shaders.
- **Always:** verificar las 12 pruebas de `AstroScale` antes de entregar.
