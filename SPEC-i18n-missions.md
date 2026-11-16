# Spec: `i18n-missions` — misiones en ambos idiomas

| Campo | Valor |
|---|---|
| Módulo | `i18n-missions` (traza a `SPEC.md` H-07) |
| Spec padre | `SPEC.md` — aprobada el 2026-11-16 |
| Estado | **Aprobada e implementada** — 2026-11-16 |
| Cierra | **H-07**: nombres, descripciones e hitos de misión solo en español |
| No toca | Trayectorias, tiempos, instrumentos ni `src/math/` |

---

## 1. Objetivo

Que al cambiar a inglés **todo** el contenido de misión esté en inglés: nombres, descripciones, hitos y opciones del selector. El español sigue siendo el idioma por defecto.

## 2. Situación actual

| Texto | Dónde | Idioma |
|---|---|---|
| `name` ("Sonda Huygens", "Cassini · Gran Final") | `HistoricalMissions.js`, HUD, snapshot | Solo español |
| `description` (6) | Panel de misión | Solo español |
| `milestones[].title` (18) | Badges CSS2D sobre la trayectoria | Solo español |
| Opciones del selector (6) | `index.html` | Solo español |

La UI general ya es bilingüe (100 claves × 2). El contenido de misión es la última isla monolingüe.

## 3. Alcance

**Dentro**

1. `name`, `description` y `milestones[].title` pasan a `{ es, en }` en `HistoricalMissions.js`.
2. Helper `resolveLocalized(value, language)` con fallback y pruebas.
3. `MissionSimulator.refreshLanguage()` para reetiquetar badges sin recargar la trayectoria.
4. `languagechange` actualiza panel de misión, badges e HUD de instrumento.
5. Opciones del selector con claves `mission.option.*` en `Localization.js`.
6. Pruebas de paridad: **todo campo localizado tiene `es` y `en` no vacíos**.

**Fuera**

- Timestamps, puntos de control, offsets y ventanas temporales.
- Nombres de instrumentos (ya en inglés técnico).
- Capturas JPL (siguen en estilo archivo).
- Traducir a un tercer idioma.

## 4. Criterios de éxito

1. `setLanguage('en')` muestra en inglés: opciones del selector, descripción activa, badges de hitos y nombre de misión en el HUD.
2. `setLanguage('es')` restaura el texto actual (sin cambios de redacción en español).
3. Prueba de paridad: 6 nombres + 6 descripciones + 18 títulos con `es`/`en` no vacíos.
4. `git grep` no encuentra `mission.description`/`milestone.title` usados como string en `src/`.
5. `npm run verify` verde con **≥ 117** pruebas.
6. El snapshot usa el nombre localizado sin romper su pie.

## 5. Límites

**Always**
- Mantener el español como idioma por defecto y su redacción actual.
- Los datos de trayectoria no cambian de valor, solo el texto.
- Paridad ES/EN verificada por prueba, no a ojo.

**Ask first**
- Cambiar la redacción en español.
- Añadir un tercer idioma.
- Tocar `HistoricalMissions.js` más allá de los campos de texto.

**Never**
- Duplicar el catálogo de misiones por idioma.
- Usar `innerHTML` para insertar títulos.
- Dejar un badge con el idioma anterior tras el cambio.

## 6. Riesgos

| Riesgo | Mitigación |
|---|---|
| Badges ya creados no se reetiquetan | `refreshLanguage()` recorre los badges existentes |
| El selector queda con texto viejo | `data-i18n` en cada `<option>`; `setLanguage` ya lo actualiza |
| Tests acoplados a `title` string | Se actualizan a `title.es`/`title.en` + paridad |
| Snapshot con `[object Object]` | `resolveLocalized` en `buildSnapshotSceneState` |

## 7. Preguntas abiertas

1. **¿El snapshot usa el nombre localizado** o se queda en inglés de archivo? Recomendación: localizado, como el resto de la UI.
2. **¿"Sonda Huygens" en inglés** debe ser "Huygens Probe"? Recomendación: sí.
3. **¿"Cassini · Gran Final"** → "Cassini · Grand Finale"? Recomendación: sí.

