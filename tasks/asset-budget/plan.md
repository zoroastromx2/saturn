# Plan: `asset-budget`

| Campo | Valor |
|---|---|
| Módulo | `asset-budget` |
| Spec | [`../../SPEC-asset-budget.md`](../../SPEC-asset-budget.md) — **pendiente de aprobación** |
| Estado | **Pendiente de aprobación del plan** |
| Alcance | Presupuesto de datos (corte A) + carga diferida (corte B) |
| Dependencias nuevas | Ninguna en runtime; Pillow ya disponible para generar variantes |

---

## 1. Objetivo

Bajar el arranque de ~36 MiB a **≤ 4 MB** en móvil y acotar la VRAM, sin degradar `high`.

## 2. Decisiones técnicas

| id | Decisión | Motivo | Coste |
|---|---|---|---|
| D1 | Preset por `pointer: coarse`, `deviceMemory`, `maxTextureSize` + override `?quality=` | Cubre móvil, gama baja y escritorio sin servidor | Heurística, no certeza |
| D2 | Variantes **versionadas** en `public/textures/{low,medium}` con `tiers.json` | Despliegue estático reproducible sin CI con Python | +5 MB de repo |
| D3 | JPEG q82 para color, q90 para normales, PNG para alfa/AO | Peso frente a artefactos; `high` conserva originales | Revisión visual |
| D4 | Topes por activo (no un tamaño único) | El fondo galáctico y las normales pesan más que un color | Más configuración |
| D5 | `scene.environment` con textura 512×256 generada | Elimina 128 MB duplicados | Depende del mapa galáctico |
| D6 | Fase 0 con progreso por bytes; fases 1–2 en segundo plano y bajo demanda | El primer frame no espera modelos/audio | Orquestación nueva en `main.js` |
| D7 | Sustituto procedural + prefetch al hover para GLB diferidos | Evita pantallas vacías y esperas visibles | Complejidad en `MissionSimulator` |
| D8 | `tools/asset-report.mjs` lee `tiers.json` y suma fases | Verificación objetiva en cada checkpoint | Un script más |

## 3. Secuencia

```
A1 reporte ─→ A2 preset/rutas ─→ A3 variantes ─→ A4 AssetFetcher+loader ─→ A5 entorno ─→ A6 cierre corte A
                                                                                         │
B1 audio ─→ B2 GLB sondas ─→ B3 GLB lunas ─→ B4 cierre corte B ◄────────────────────────┘
```

Cada corte termina con `npm run verify` y reporte dentro de objetivos; el corte A es publicable por sí solo.

## 4. Puntos de verificación

| CP | Tras | Comprobación | Criterio |
|---|---|---|---|
| CP1 | A1 | `node tools/asset-report.mjs` | Reconoce el estado actual (~36 MiB, ~416 MB) |
| CP2 | A2 | `npx vitest run tests/QualityTier.test.js` | 6 casos de preset |
| CP3 | A3 | `node tools/asset-report.mjs --tier low/medium` | Dentro de 4/8 MB y 60/120 MB |
| CP4 | A4 | Tests de fases + loader | Fase 0 no espera modelos/audio; % monótono |
| CP5 | A5 | Inspección de `scene.environment` | Una textura 512×256; −128 MB |
| CP6 | A6 | `npm run verify` + preview `?quality=low` | Gates verdes; preset aplicado |
| CP7 | B4 | Pruebas de carga diferida + Network manual | Modelos/audio ausentes del arranque |

## 5. Riesgos

| Riesgo | Mitigación |
|---|---|
| Regresión visual en `low/medium` | Captura comparada contra `high`; normales q90; `high` intacto |
| Carga diferida rompe una misión | Sustituto procedural existente + prefetch + pruebas de fase |
| Preset mal detectado (Safari sin `deviceMemory`) | Fallback por `maxTextureSize` y `pointer: coarse`; override |
| `tiers.json` desincronizado con los archivos | El script lo regenera y el reporte falla si falta un archivo |
| Repo +5 MB | Solo low/medium; decisión en §12 de la spec |

## 6. Impacto estimado

**Nuevos:** `src/core/QualityTier.js`, `tools/asset-report.mjs`, `tools/generate-texture-tiers.py`, `public/textures/tiers.json`, variantes `public/textures/{low,medium}/`, 2 archivos de pruebas.
**Editados:** `AssetFetcher.js`, `main.js`, `index.html`, `style.css`, `Localization.js`, `MissionSimulator.js`, `Titan/Enceladus/MimasSimulator.js`, `README.md`, `SPEC.md`.
**Pruebas:** 95 → ≥ 107.

## 7. Criterios de éxito

Los ocho de `SPEC-asset-budget.md` §9, con evidencia del reporte, del loader y de la pestaña Red en `?quality=low`.

## 8. Nota operativa

El corte B toca el orden de arranque: se implementa **después** de publicar el corte A, para poder revertir por separado si algo se degrada.
