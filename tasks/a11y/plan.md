# Plan: `a11y`

| Campo | Valor |
|---|---|
| Módulo | `a11y` |
| Spec | [`../../SPEC-a11y.md`](../../SPEC-a11y.md) — **pendiente de aprobación** |
| Estado | **Pendiente de aprobación del plan** |
| Alcance | Movimiento reducido, semántica del loader y canvas |
| Dependencias | Ninguna |

---

## 1. Objetivo

Cerrar H-13 sin tocar la simulación ni el aspecto por defecto.

## 2. Decisiones

| id | Decisión | Motivo | Coste |
|---|---|---|---|
| D1 | Regla CSS global bajo `prefers-reduced-motion` | Cubre las 12 transiciones de una vez | Puede afectar a futuras animaciones deseadas |
| D2 | `ReducedMotion.js` con detección + `change` | La preferencia puede cambiar en caliente | Un módulo |
| D3 | Duración 0 en tweens de cámara | Evita el mareo sin romper el encuadre | Revisar `onComplete` |
| D4 | Congelar solo `vintageOpticsPass.uTime` | El grano es decorativo; la órbita es contenido | Ninguno |
| D5 | Loader `role="status"` + progreso en pasos de 5 % | Anunciable sin saturar | Throttle en `main.js` |
| D6 | Canvas `role="img"` + `aria-label` i18n + fallback | Nombre accesible y degradación | 2 claves nuevas |

## 3. Secuencia

```
T1 ReducedMotion ─→ T2 cámara ─→ T3 post-proceso y CSS ─→ T4 loader/canvas/i18n ─→ T5 pruebas y docs
```

## 4. Puntos de verificación

| CP | Tras | Comprobación | Criterio |
|---|---|---|---|
| CP1 | T1 | `tests/ReducedMotion.test.js` | Detección y duración base |
| CP2 | T2 | `tests/CameraController.test.js` | Foco instantáneo con preferencia activa |
| CP3 | T3 | `npm run build` + preview emulando reduced motion | Sin transición; grano quieto |
| CP4 | T4 | `tests/A11yMarkup.test.js` | `role`, `aria-live`, `aria-label`, fallback |
| CP5 | T5 | `npm run verify` | ≥ 123 pruebas y gates verdes |

## 5. Riesgos

| Riesgo | Mitigación |
|---|---|
| Cambiar el aspecto por defecto | La regla CSS solo aplica con la media query activa |
| Tween de duración 0 no completa | Prueba con fake de GSAP o revisión de `onComplete` |
| Progreso ruidoso | Throttle explícito y prueba del helper |

## 6. Impacto estimado

**Nuevos:** `src/core/ReducedMotion.js`, `tests/ReducedMotion.test.js`, `tests/A11yMarkup.test.js`.
**Editados:** `src/core/CameraController.js`, `src/main.js`, `src/style.css`, `index.html`, `src/core/Localization.js`, `README.md`, `SPEC.md`.
**Pruebas:** 119 → ≥ 123.

## 7. Criterios de éxito

Los siete de la spec §4, con evidencia de emulate reduced motion en DevTools y de las pruebas de marcado.

## 8. Nota operativa

El push se hace al final con tu visto bueno. El modo por defecto debe quedar visualmente idéntico; el bundle cambiará por los módulos y textos nuevos.
