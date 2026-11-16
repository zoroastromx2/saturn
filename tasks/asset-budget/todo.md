# Tareas: `asset-budget`

Plan: [`plan.md`](plan.md) · Spec: [`../../SPEC-asset-budget.md`](../../SPEC-asset-budget.md) · Estado: **completado** (2026-11-16) · Orden: A1 → A2 → A3 → A4 → A5 → A6 → B1 → B2 → B3 → B4

Los cortes A y B se entregaron juntos: A4–A5 dejaban la escena construida antes de que llegaran los GLB, así que la hidratación diferida (B2/B3) era necesaria para no publicar una regresión.

---

## Corte A — presupuesto de datos

- [x] **A1 — Reporte de activos**
  - `tools/asset-report.mjs`: mide por preset, separa fase inicial y diferida, estima VRAM con mips (×1,33) y soporta `--tier` / `--check`.
  - **Verificación:** reproduce la línea base (37,86 MB totales, 579 MB con mips).

- [x] **A2 — Preset y rutas**
  - `src/core/QualityTier.js`: `resolveQualityTier`, `buildAssetPath`, `selectTextureVariant`.
  - **Verificación:** `tests/QualityTier.test.js`, 7 casos verdes.

- [x] **A3 — Variantes de textura**
  - `tools/generate-texture-tiers.py` con topes por activo; escribe `public/textures/{low,medium,high}`, `tiers.json` y `src/data/TextureTiers.js`.
  - **Verificación:** low 1,30 MB · medium 4,45 MB · high 9,26 MB (suma de variantes).

- [x] **A4 — `AssetFetcher` por preset + fases + progreso**
  - `loadCriticalAssets()` (fase 0) y `loadBackgroundAssets()` (fase 1); `createByteProgress`; loader con porcentaje real.
  - **Verificación:** `tests/AssetPhases.test.js` y `tests/LoadProgress.test.js`; el presupuesto queda en 1,08 / 1,35 / 2,26 MB iniciales.

- [x] **A5 — Entorno PBR sin 8K**
  - `EnvironmentProbe` genera un mapa 512×256; `scene.environment` deja de usar el 8K y `galacticMap` ya no duplica textura.
  - **Verificación:** `tests/EnvironmentProbe.test.js`; VRAM baja de ~416 MiB a 278 MB (high) y 32 MB (low).

- [x] **A6 — Cierre del corte A**
  - `npm run verify` verde, reporte dentro de objetivos, README y SPEC actualizados.

## Corte B — carga diferida

- [x] **B1 — Audio bajo demanda**
  - `loadAudioAssets()` solo al activar el sonido; `attachAmbientSound` conecta las cuatro pistas.
  - **Verificación:** prueba de fase que confirma 0 descargas de audio en el arranque y 4 al pedirlas.

- [x] **B2 — GLB de sondas tras el primer frame**
  - `MissionSimulator.setProbeModels()` construye los wrappers que falten y refresca la visibilidad de la misión activa.
  - **Verificación:** la sonda procedural se sustituye sin recargar la trayectoria (revisión de código + pruebas existentes de misiones).

- [x] **B3 — GLB de lunas tras el primer frame**
  - `applyMoonTextures()` en la base y `applyTitanModel` / `applyEnceladusModel` / `applyMimasModel` desde la hidratación.
  - **Verificación:** las lunas ya están en escena; solo cambian geometría/textura, sin saltos de escala.

- [x] **B4 — Cierre del corte B**
  - **Verificación:** `npm run verify` con **113/113** pruebas y build de 902,02 kB.

---

## Desviaciones conscientes

1. **Modelos en segundo plano, no por misión.** El plan pedía carga por misión con prefetch; se implementó una hidratación única tras el primer frame. El objetivo (no bloquear el arranque) se cumple; el prefetch por misión queda como mejora.
2. **Cortes A y B entregados juntos**, porque la escena se construye con la fase 0 y necesitaba la hidratación para no perder texturas/modelos.
3. **Variantes versionadas** (+7,03 MB de repo, por encima de los ~5 MB estimados).

## Definición de hecho

- [x] `low` 1,08 MB / 32 MB · `medium` 1,35 MB / 118 MB · `high` 2,26 MB / 278 MB
- [x] Primer frame sin modelos ni audio
- [x] Loader con porcentaje real
- [x] Entorno PBR de 512×256, sin duplicar el 8K
- [x] `?quality=` funcional
- [x] 113/113 pruebas y gates verdes
- [ ] Regresión visual de `high` verificada en navegador real (pendiente de revisión manual)
