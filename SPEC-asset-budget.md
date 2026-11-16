# Spec: `asset-budget` — arranque y memoria gráfica bajo control

| Campo | Valor |
|---|---|
| Módulo | `asset-budget` (traza a `SPEC.md` H-03 y §11) |
| Spec padre | `SPEC.md` — aprobada el 2026-11-16 |
| Estado | **Aprobada e implementada** — 2026-11-16 |
| Dependencias | `assets`, `scene-render`, `moons`, `missions`, `ui-shell` |
| Cierra (objetivo) | **H-03**: 38 MB de carga bloqueante y ~416 MB de texturas decodificadas |

---

## 1. Objetivo

Que la app arranque rápido y no reviente la GPU en móvil, **sin perder calidad en escritorio**. Tres resultados concretos:

1. **Transferencia inicial** repartida por capacidad del dispositivo, no un único paquete de 38 MB.
2. **Memoria de texturas** acotada por preset, eliminando el desperdicio actual (dos mapas de 8K duplicados).
3. **Modelos y audio fuera del arranque**: se cargan cuando se usan, con sustituto procedural mientras llegan.

## 2. Situación actual (medida, no estimada)

| Grupo | Peso | Detalle |
|---|---:|---|
| Modelos GLB | 17,4 MiB | 7 modelos, todos descargados antes del primer frame |
| Texturas | 16,5 MiB | 20 archivos; dos de 8192×4096 |
| Audio | 1,3 MiB | 4 pistas, descargadas antes del primer frame |
| JS + CSS | 0,88 MiB | bundle único |
| **Total inicial** | **~36 MiB** | `loadAllAssets()` se espera completo antes de construir la escena |

Memoria de texturas decodificadas: **~416 MB RGBA8** sin mips (~550 MB con ellos). Dos causas:

- `milky_way_8k.jpg` (8192×4096) se usa **dos veces**: como `scene.environment` y como mapa galáctico.
- `earth_daymap_4k.jpg` es en realidad **8192×4096** (128 MB) para una esfera de 0,64 unidades.

Además, el loader no muestra progreso y no hay forma de pedir "modo ligero".

## 3. Alcance

**Dentro**

1. **Presets de calidad** `low` / `medium` / `high` con detección por dispositivo y override `?quality=`.
2. **Variantes de textura** por preset, generadas con un script reproducible (Pillow).
3. **Carga por fases**: bloqueante mínima → primer frame → resto en segundo plano → bajo demanda.
4. **Diferir** audio, modelos de sondas (por misión) y modelos de lunas (al enfocar).
5. **Deduplicar el entorno**: un mapa pequeño para PBR en vez de reutilizar el 8K.
6. **Progreso real** en el loader (bytes, no "items").
7. **Herramienta de medición** (`tools/asset-report.mjs`) que reporte peso y VRAM por preset.

**Fuera**

- Compresión Draco/KTX2 o re-encoding de GLB (futuro; requeriría dependencias y decodificadores).
- CDN, service worker, HTTP/2 push, AVIF/WebP con negociación.
- Cambiar GitHub Pages o añadir backend.
- Rediseñar la iluminación o el pipeline de post-proceso.

## 4. Presets y objetivos

| Preset | Disparador | Transferencia inicial | VRAM texturas | Primer frame |
|---|---|---:|---:|---|
| `low` | `pointer: coarse` o `deviceMemory ≤ 4` o `maxTextureSize ≤ 4096` | **≤ 4 MB** | **≤ 60 MB** | ≤ 3 s en 4G |
| `medium` | escritorio por defecto | **≤ 8 MB** | **≤ 120 MB** | ≤ 2 s en cable |
| `high` | `deviceMemory ≥ 8` y `maxTextureSize ≥ 16384` | **≤ 16 MB** | **≤ 250 MB** | ≤ 2 s en cable |

Los objetivos excluyen modelos y audio, que pasan a carga diferida. `?quality=low|medium|high` fuerza un preset (útil para QA y para el reporte).

Mapa por activo (ejemplo; el script fija los tamaños finales):

| Activo | low | medium | high |
|---|---|---|---|
| Atmósfera de Saturno | 1024 | 2048 | 4096 |
| Color/alfa de anillos | 2048×125 | 4096×250 | 8192×500 |
| Fondo galáctico | 1024×512 | 2048×1024 | 4096×2048 |
| Tierra | 1024 | 2048 | 4096 |
| Color de lunas | 1024 | 2048 | original |
| Normales de lunas | 512 | 1024 | original |
| AO de lunas | 512 | 1024 | original |
| Entorno PBR | 512×256 generado | 512×256 | 512×256 |

## 5. Carga por fases

| Fase | Cuándo | Contenido | Efecto |
|---|---|---|---|
| 0 | Antes del primer frame | JS/CSS, Saturno, anillos, fondo, Tierra, color de Titán | Pantalla de carga con **% de bytes** |
| 1 | Tras el primer frame (`requestIdleCallback`) | Resto de texturas de lunas, `minor_moons.json` | La escena ya es interactiva |
| 2 | Bajo demanda | Audio (primer toggle), GLB de sonda (al elegir misión), GLB de luna (al enfocar) | Placeholder procedural hasta que llegue |

Reglas:

- Un fallo en fase 1 o 2 **no rompe** el arranque: se registra y se mantiene el sustituto.
- El GLB de una misión se **precarga al pasar el ratón** por la opción del selector; si no llega a tiempo, la sonda procedural cubre el hueco.
- El audio no se descarga hasta que el usuario lo activa (y solo una vez).
- El % del loader se basa en bytes de fase 0, no en número de archivos.

## 6. Entorno PBR

- `scene.environment` deja de ser el mapa 8K: se construye un `DataTexture`/`CanvasTexture` de 512×256 a partir del mapa galáctico (o un degradado), ~0,5 MB.
- `galacticMap` se conserva como fondo pero con el tamaño del preset.
- Esto elimina **128 MB** de VRAM por sí solo y la duplicación de decodificación.

## 7. Medición y pruebas

**Herramienta** `tools/asset-report.mjs`:

```bash
node tools/asset-report.mjs            # tabla por preset
node tools/asset-report.mjs --tier low # detalle de activos y VRAM estimada
```

Lee un `public/textures/tiers.json` generado por el script de variantes (tamaño y dimensiones por archivo) y suma modelos/audio como "diferidos".

**Pruebas nuevas (≥ 12)**

- `resolveQualityTier`: coarse pointer, poca memoria, `maxTextureSize` bajo, override manual, escritorio alto.
- `buildAssetPath`: ruta por preset, fallback a original si falta la variante.
- `selectTextureVariants`: mapeo por activo.
- `createByteProgress`: % monótono, tolera fallos y `total=0`.
- `AssetFetcher` fase 0 vs fase 1 con loaders inyectados (no debe esperar modelos/audio).
- Dedupe de entorno: una sola textura 512×256.

## 8. Límites

**Always**
- El primer frame no espera modelos, audio ni lunas menores.
- Todo activo diferido tiene sustituto funcional.
- `npm run verify` verde y `node tools/asset-report.mjs` dentro de los objetivos.
- Las variantes se regeneran con un script versionado, nunca a mano.

**Ask first**
- Añadir dependencias (el plan prevé solo Python/Pillow para generar, fuera del runtime).
- Versionar derivados de textura (crece el repo) frente a generarlos en CI.
- Cambiar formatos: JPEG para normales, PNG para alfa/AO.
- Aceptar espera de 1–2 s al enfocar una luna por primera vez.

**Never**
- Servir modelos o audio antes del primer frame.
- Subir el preset por encima de la capacidad detectada sin override explícito.
- Romper el fallback procedural.
- Introducir texturas 8K nuevas.

## 9. Criterios de éxito

1. `node tools/asset-report.mjs` reporta `low ≤ 4 MB / ≤ 60 MB`, `medium ≤ 8 MB / ≤ 120 MB`, `high ≤ 16 MB / ≤ 300 MB`.
2. En `low`, el primer frame ocurre **sin** haber descargado modelos ni audio (verificable en la pestaña Red).
3. El loader muestra un porcentaje que avanza y termina en 100 %.
4. `scene.environment` ya no referencia el mapa 8K (una sola textura pequeña).
5. Elegir una misión sin GLB cargado muestra la sonda procedural y luego la sustituye.
6. `?quality=low|medium|high` cambia el preset de forma verificable.
7. `npm run verify` verde con ≥ 107 pruebas.
8. Ninguna regresión visual perceptible en `high` (comparación de captura con el build anterior).

### Resultado medido (2026-11-16)

| Preset | Inicial | Diferido | Total | VRAM (con mips) | Objetivo |
|---|---:|---:|---:|---:|---|
| `low` | **1,08 MB** | 20,81 MB | 21,89 MB | **32 MB** | ≤ 4 MB / ≤ 60 MB ✅ |
| `medium` | **1,35 MB** | 23,69 MB | 25,04 MB | **118 MB** | ≤ 8 MB / ≤ 120 MB ✅ |
| `high` | **2,26 MB** | 27,58 MB | 29,85 MB | **278 MB** | ≤ 16 MB / ≤ 300 MB ✅ |

Pruebas: **113** (29 archivos). El sitio publicado crece a 43,3 MB porque incluye los tres presets, pero cada usuario descarga solo el suyo.

**Desviaciones conscientes del plan**

- Los modelos GLB se cargan **en segundo plano tras el primer frame**, no por misión/bajo demanda. El objetivo (no bloquear el arranque) se cumple; el prefetch por misión queda como mejora futura.
- El audio sí es bajo demanda: solo se descarga al activar el sonido.

## 10. Riesgos

| Riesgo | Mitigación |
|---|---|
| Regresión visual por JPEG en normales | `high` conserva originales; `low/medium` con q90 y revisión de captura |
| Complejidad de la carga diferida rompe misiones | Sustituto procedural ya existente + pruebas por fase + prefetch al hover |
| Más archivos y repo más grande | Derivados solo para low/medium (~4–6 MB); decisión explícita en §12 |
| Medición de VRAM aproximada (sin instrumentación GPU) | Reporte basado en dimensiones × 4 bytes × 1,33; se contrasta con `renderer.info.memory` |
| `deviceMemory` no existe en Safari/Firefox | Fallback por `maxTextureSize` + `pointer: coarse`; override manual |

## 11. Plan de entrega (dos cortes)

- **Corte A — presupuesto de datos:** presets, variantes, dedupe de entorno, loader con % y reporte. Cierra la transferencia y la VRAM sin tocar el orden de carga.
- **Corte B — carga diferida:** audio, modelos de sondas y lunas bajo demanda. Cierra el bloqueo del primer frame.

Cada corte se verifica por separado y puede publicarse solo.

## 12. Preguntas abiertas

1. **¿Versionamos los derivados** de textura (crece el repo ~5 MB) o los generamos en CI con Python? Recomendación: versionarlos; el despliegue es estático y reproducible.
2. **¿Normales en JPEG q90** en low/medium, o PNG para evitar artefactos de sombreado? Recomendación: JPEG q90 y revisión visual.
3. **¿Aceptas 1–2 s de espera** al enfocar por primera vez una luna, con placeholder procedural? Recomendación: sí, con prefetch al hover.
4. **Preset por defecto en escritorio:** ¿`medium` (recomendado) o `high`?
