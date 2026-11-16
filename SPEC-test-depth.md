# Spec: `test-depth` — fase A, pruebas node sin dependencias

| Campo | Valor |
|---|---|
| Módulo | `test-depth` (traza a `SPEC.md` H-08; fase A de tres) |
| Spec padre | `SPEC.md` — aprobada el 2026-11-16 |
| Estado | **Aprobada e implementada (fase A)** — 2026-11-16 |
| Cierra (parcial) | **H-08**: `SaturnSimulator`, `Localization` y contrato de shaders |
| Dependencias | **Ninguna** |
| No toca | WebGL, navegador, `main.js` ni `src/math/` |

---

## 1. Objetivo

Cubrir con pruebas node lo que hoy no tiene cobertura y **no necesita navegador**: los uniforms de Saturno, la paridad de idiomas y la coherencia entre GLSL y materiales. Sin añadir una sola dependencia.

## 2. Situación actual

| Zona | Cobertura | Riesgo real |
|---|---|---|
| `SaturnSimulator` | Ninguna | Un uniform mal cableado deja Saturno o los anillos negros, en silencio |
| `Localization` | Ninguna | Una clave duplicada o vacía rompe la UI en un idioma |
| Shaders vs materiales | Ninguna | `uniform` declarado en GLSL y ausente en JS → negro silencioso |
| Inventario de shaders | Ninguna | Hay archivos que nadie importa |

Descubrimiento de este análisis: **3 de los 16 archivos de `src/shaders/` no se importan en ningún sitio** — `titan.vert`, `titan.frag` y `ering.frag`. Titán usa los shaders base de luna y el anillo E lo pinta `rings.frag`.

## 3. Alcance

**Dentro**

1. `tests/SaturnSimulator.test.js`: nombres, geometría oblata, uniforms del planeta y de los anillos, 6 ranuras de sombra (y error en la séptima), audio opcional.
2. `tests/Localization.test.js`: paridad ES/EN, valores no vacíos, `t()` con fallback, `setLanguage` actualizando DOM, `lang`, título y evento.
3. `tests/ShaderContract.test.js`:
   - **Inventario**: todo `.vert`/`.frag` se importa desde algún JS.
   - **Cobertura de uniforms**: cada `uniform` del GLSL (salvo los inyectados por Three) existe en el `material.uniforms` correspondiente.
   - **Paridad de varyings**: el `.vert` y el `.frag` de cada par declaran los mismos.
4. Eliminación de los 3 shaders huérfanos.

**Fuera**

- Playwright, jsdom, compilación real de GLSL (fase B).
- Capturas y regresión visual (fase C).
- Cobertura de `main.js` (necesita DOM o navegador).
- Cambios de comportamiento, física o aspecto.

## 4. Criterios de éxito

1. `npm run verify` verde con **≥ 140 pruebas** (hoy 128).
2. El contrato de uniforms cubre los 6 pares en uso: saturn, rings, moon, plume, diffuse_rings, starfield (más el pase vintage).
3. El test de inventario falla si se añade un shader sin importar.
4. `src/shaders/` queda con 12 GLSL en uso + el pase vintage.
5. Cero dependencias nuevas y cero cambios en el bundle.

## 5. Límites

**Always**
- Los tests corren en `environment: node`, con stubs mínimos de `document`.
- El contrato compara **nombres**, no valores: no duplica la física.
- Si el contrato revela un desajuste real, se documenta antes de tocar el shader.

**Ask first**
- Cambiar un shader o un material para satisfacer el test.
- Eliminar algún shader que no esté en la lista de huérfanos.
- Introducir utilidades de test compartidas.

**Never**
- Añadir dependencias (fase A es deliberadamente cero).
- Relajar el contrato con listas de excepciones amplias.
- Marcar tests como `skip` para dejar el pipeline verde.

## 6. Riesgos

| Riesgo | Mitigación |
|---|---|
| `CSS2DObject` requiere `document` en node | Stub mínimo como en las pruebas de misiones |
| Regex GLSL frágil con arrays y comentarios | Parser pequeño con pruebas propias (arrays `[6]`, comentarios `//`) |
| Uniforms inyectadas por Three (`cameraPosition`, `toneMappingExposure`) | Lista blanca explícita y documentada |
| Falsos positivos en varyings | Comparar solo nombres declarados en ambos archivos |

## 7. Preguntas abiertas

1. **¿Eliminamos `titan.vert`, `titan.frag` y `ering.frag`?** Recomendación: sí; git conserva el historial.
2. **Si un material tiene uniforms que el GLSL no usa**, ¿se borran o se dejan? Recomendación: dejar y anotarlo; el test solo exige la dirección GLSL→JS.
3. **¿El contrato incluye el pase de post-proceso vintage?** Recomendación: sí, con sus uniforms inline.

