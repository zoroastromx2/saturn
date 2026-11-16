# Plan: `i18n-missions`

| Campo | Valor |
|---|---|
| Módulo | `i18n-missions` |
| Spec | [`../../SPEC-i18n-missions.md`](../../SPEC-i18n-missions.md) — **pendiente de aprobación** |
| Estado | **Pendiente de aprobación del plan** |
| Alcance | Texto de misión bilingüe. Sin cambios de física ni de datos numéricos |
| Dependencias | Ninguna |

---

## 1. Objetivo

Eliminar la última zona monolingüe de la UI sin duplicar el catálogo de misiones.

## 2. Decisiones

| id | Decisión | Motivo | Coste |
|---|---|---|---|
| D1 | Textos localizados **en el dato** (`{es,en}`), no en `Localization.js` | Mantiene descripción e hitos junto a su trayectoria | 30 campos localizados |
| D2 | `resolveLocalized(value, language)` puro y probado | Un único punto de fallback | Un módulo |
| D3 | `refreshLanguage()` en `MissionSimulator` | Reetiqueta badges vivos sin reconstruir la curva | Un método |
| D4 | Opciones del selector con claves `mission.option.*` | `setLanguage` ya actualiza `data-i18n` | 6 claves × 2 |
| D5 | Snapshot con nombre localizado | Coherencia con el resto de la UI | Una llamada |

## 3. Secuencia

```
T1 helper + datos ─→ T2 MissionSimulator ─→ T3 main.js + selector ─→ T4 pruebas ─→ T5 docs y verify
```

## 4. Puntos de verificación

| CP | Tras | Comprobación | Criterio |
|---|---|---|---|
| CP1 | T1 | `npx vitest run tests/LocalizedText.test.js` | Fallback y paridad de datos |
| CP2 | T2 | Pruebas de misiones existentes | Badges usan el idioma activo |
| CP3 | T3 | Cambio ES→EN en preview | Selector, panel, badges y HUD en inglés |
| CP4 | T4 | `npx vitest run` | ≥ 117 pruebas |
| CP5 | T5 | `npm run verify` | Gates verdes y sin referencias a textos string |

## 5. Riesgos

| Riesgo | Mitigación |
|---|---|
| Badges no se actualizan | `refreshLanguage()` + llamada en `languagechange` |
| Romper pruebas de misiones | Se actualizan a `title.es` y se añade paridad |
| Texto en español alterado | Copia literal de los valores actuales |

## 6. Impacto estimado

**Nuevos:** `src/core/LocalizedText.js`, `tests/LocalizedText.test.js`.
**Editados:** `src/data/HistoricalMissions.js`, `src/core/MissionSimulator.js`, `src/main.js`, `src/core/Localization.js`, `index.html`, `tests/HistoricalMissions.test.js`, `README.md`, `SPEC.md`.
**Pruebas:** 113 → ≥ 117.
**Datos numéricos:** 0 cambios.

## 7. Criterios de éxito

Los seis de la spec §4, con evidencia de cambio de idioma en preview y paridad ES/EN en pruebas.

## 8. Nota operativa

El push se hace al final con tu visto bueno. El bundle cambiará de tamaño por los textos nuevos (esperado).
