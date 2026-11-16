# Spec: `a11y` — movimiento reducido, loader y canvas

| Campo | Valor |
|---|---|
| Módulo | `a11y` (traza a `SPEC.md` H-13) |
| Spec padre | `SPEC.md` — aprobada el 2026-11-16 |
| Estado | **Aprobada e implementada** — 2026-11-16 |
| Cierra | **H-13**: sin `prefers-reduced-motion`, loader sin semántica y canvas sin etiqueta |
| No toca | Simulación orbital, física, datos de misión ni presets de calidad |

---

## 1. Objetivo

Que la app respete la preferencia del sistema de **movimiento reducido**, que el loader sea anunciable por lectores de pantalla y que el canvas tenga nombre accesible y contenido de respaldo.

## 2. Situación actual

| Elemento | Estado | Problema |
|---|---|---|
| CSS | 12 transiciones/animaciones, sin `prefers-reduced-motion` | No se puede desactivar el movimiento |
| Cámara (GSAP) | Transiciones de 2 s y zooms de 0,6–0,8 s | Movimiento no negociable |
| Post-proceso | `vintageOpticsPass.uTime` avanza cada frame (grano) | Ruido animado constante |
| Loader | `<div id="loader">` con texto y `%` | Sin `role`, sin `aria-live` |
| Canvas | `<canvas id="webgl-canvas">` vacío | Sin nombre accesible ni fallback |

## 3. Alcance

**Dentro**

1. Bloque CSS `@media (prefers-reduced-motion: reduce)` que anula transiciones y animaciones decorativas.
2. `ReducedMotion.js`: detección y escucha del cambio de preferencia.
3. Cámara: duración **0** en foco, aterrizaje y zoom de instrumento cuando el movimiento está reducido.
4. Post-proceso: congelar `uTime` (grano y ruido del shader vintage); la **simulación orbital sigue**, porque es contenido, no decoración.
5. Loader: `role="status"`, `aria-live="polite"`, `aria-atomic="true"` y progreso **limitado a pasos del 5 %** para no saturar.
6. Canvas: `role="img"`, `aria-label` localizado (`canvas.ariaLabel`) y texto de respaldo dentro del elemento.
7. Pruebas de la preferencia, de la duración y del marcado accesible.

**Fuera**

- Control de cámara por teclado (requiere rediseñar `OrbitControls`).
- Auditoría de contraste y de orden de foco completa.
- Pruebas con lector de pantalla real.
- E2E visual (H-14).

## 4. Criterios de éxito

1. Con `prefers-reduced-motion: reduce` emulado, **no** hay transición de cámara: el foco es instantáneo.
2. En ese modo, el grano del shader estático y las transiciones CSS duran ~0.
3. Sin la preferencia, el comportamiento visual es **idéntico** al actual.
4. El loader expone `role="status"`, `aria-live="polite"` y actualiza el `%` como máximo cada 5 puntos.
5. El canvas tiene `role="img"`, `aria-label` en ES/EN y texto de respaldo.
6. `npm run verify` verde con **≥ 123** pruebas.
7. Sin cambios en `src/math/`, presets ni datos de misión.

## 5. Límites

**Always**
- La simulación orbital no se detiene con movimiento reducido.
- Las etiquetas nuevas existen en ES y EN.
- El modo por defecto no cambia ni un píxel.

**Ask first**
- Añadir controles de teclado para la cámara.
- Desactivar también la rotación de anillos bajo movimiento reducido.
- Introducir dependencias de accesibilidad.

**Never**
- Ocultar el canvas a lectores de pantalla sin alternativa.
- Usar `aria-hidden` en el loader.
- Anunciar el progreso en cada frame.

## 6. Riesgos

| Riesgo | Mitigación |
|---|---|
| `role="status"` satura al anunciar cada % | Throttle a pasos de 5 y `aria-atomic` |
| GSAP con duración 0 deja promesas pendientes | Se usa la misma ruta de tween; `onComplete` se dispara igual |
| El canvas con `role="img"` tapa interacción | Es un elemento de fondo; los controles siguen siendo botones |
| Congelar `uTime` afecta a los anillos | Solo se congela el pase de post-proceso, no los uniforms de los anillos |

## 7. Preguntas abiertas

1. **¿La rotación de anillos y lunas sigue con movimiento reducido?** Recomendación: sí, es contenido científico.
2. **¿El canvas debe ser enfocable?** Recomendación: no; no hay interacción por teclado todavía y sería un foco muerto.
3. **¿Anunciar el porcentaje por `aria-live`?** Recomendación: sí, pero limitado a pasos de 5 %.

