# Plan: `test-depth` (fase A)

| Campo | Valor |
|---|---|
| Módulo | `test-depth` |
| Spec | [`../../SPEC-test-depth.md`](../../SPEC-test-depth.md) — **pendiente de aprobación** |
| Estado | **Pendiente de aprobación del plan** |
| Alcance | Pruebas node de Saturno, i18n y contrato GLSL. Cero dependencias |
| Dependencias | Ninguna |

---

## 1. Objetivo

Cerrar la parte de H-08 que se puede verificar sin navegador, y dejar un guardián contra el fallo más caro: uniforms declarados en GLSL y no cableados.

## 2. Decisiones

| id | Decisión | Motivo | Coste |
|---|---|---|---|
| D1 | Instanciar `SaturnSimulator` con escena real y stub de `document` | No necesita WebGL: los materiales solo compilan al renderizar | Stub de 10 líneas |
| D2 | Paridad de i18n por lectura estática de `Localization.js` | No se exportan las traducciones y no hace falta exponerlas | Parser de claves |
| D3 | Contrato GLSL→JS solo en esa dirección | Evita falsos positivos por uniforms que Three inyecta | Lista blanca pequeña |
| D4 | Parser GLSL propio con pruebas | 40 líneas y control total; arrays y comentarios incluidos | Código de test |
| D5 | Eliminar los 3 shaders huérfanos | No se importan desde ningún módulo | −3 archivos |

## 3. Secuencia

```
T1 SaturnSimulator ─→ T2 Localization ─→ T3 contrato GLSL ─→ T4 limpieza ─→ T5 verify y docs
```

## 4. Puntos de verificación

| CP | Tras | Comprobación | Criterio |
|---|---|---|---|
| CP1 | T1 | `npx vitest run tests/SaturnSimulator.test.js` | ≥ 8 casos verdes |
| CP2 | T2 | `npx vitest run tests/Localization.test.js` | Paridad y `setLanguage` |
| CP3 | T3 | `npx vitest run tests/ShaderContract.test.js` | 6 pares + vintage; inventario sin huérfanos |
| CP4 | T4 | `git grep titan.frag/ering.frag` | Sin referencias; build igual |
| CP5 | T5 | `npm run verify` | ≥ 140 pruebas, bundle idéntico |

## 5. Riesgos

| Riesgo | Mitigación |
|---|---|
| Desajuste real descubierto en un shader | Se documenta y se consulta antes de cambiarlo |
| Regex que no entiende `uniform vec3 uX[6];` | Caso explícito en las pruebas del parser |
| `document` incompleto para CSS2D | Stub con `createElement` como en misiones |
| Test de inventario demasiado estricto | Solo exige que exista un importador; no prohíbe archivos futuros documentados |

## 6. Impacto estimado

**Nuevos:** 3 archivos de pruebas, 1 helper de parseo si hace falta.
**Borrados:** `src/shaders/titan.vert`, `src/shaders/titan.frag`, `src/shaders/ering.frag`.
**Editados:** `SPEC.md`, `README.md` (si procede).
**Pruebas:** 128 → ≥ 140. **Dependencias:** 0.

## 7. Criterios de éxito

Los cinco de la spec §4, con evidencia de la suite y del bundle sin cambios.

## 8. Nota operativa

Fase A no necesita navegador ni CI nuevo. El push se hace al final con tu visto bueno.
