// src/core/ReducedMotion.js
// Preferencia de movimiento reducido del sistema operativo.

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** true si el sistema pide movimiento reducido (o no hay matchMedia). */
export function prefersReducedMotion(mediaQuery = globalThis.matchMedia?.(REDUCED_MOTION_QUERY)) {
  return Boolean(mediaQuery?.matches);
}

/** Duración efectiva: 0 cuando la preferencia está activa. */
export function transitionDuration(baseDuration, reduced = false) {
  const base = Number(baseDuration);
  if (reduced) return 0;
  return Number.isFinite(base) && base > 0 ? base : 0;
}

/**
 * Suscribe un callback al cambio de preferencia.
 * Devuelve una función para desuscribirse (no-op si no hay soporte).
 */
export function watchReducedMotion(
  onChange,
  mediaQuery = globalThis.matchMedia?.(REDUCED_MOTION_QUERY)
) {
  if (!mediaQuery?.addEventListener) return () => {};

  const listener = (event) => onChange(Boolean(event?.matches));
  mediaQuery.addEventListener('change', listener);
  return () => mediaQuery.removeEventListener?.('change', listener);
}
