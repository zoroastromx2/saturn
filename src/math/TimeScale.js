// src/math/TimeScale.js

export const MIN_SLIDER_POS = 0;
export const MAX_SLIDER_POS = 100;

/**
 * Convierte la posición del control deslizante [0..100] en un multiplicador de velocidad orbital [0..100].
 * Usa tres tramos lineales alineados con los preajustes (0 -> 0x, 25 -> 1x, 60 -> 10x, 100 -> 100x)
 * para permitir ajuste fino tanto en cámara lenta (<1x) como en velocidades medias (1x-10x) y altas (10x-100x).
 */
export function sliderPositionToScale(position) {
  const pos = Math.min(MAX_SLIDER_POS, Math.max(MIN_SLIDER_POS, Number(position) || 0));

  if (pos === 0) return 0;
  if (pos <= 25) {
    return Number((pos / 25).toFixed(2));
  }
  if (pos <= 60) {
    return Number((1 + ((pos - 25) / 35) * 9).toFixed(1));
  }
  return Math.round(10 + ((pos - 60) / 40) * 90);
}

/**
 * Convierte un multiplicador de velocidad orbital [0..100] a la posición del slider [0..100].
 */
export function scaleToSliderPosition(scale) {
  const value = Math.min(100, Math.max(0, Number(scale) || 0));

  if (value === 0) return 0;
  if (value <= 1) {
    return Number((value * 25).toFixed(2));
  }
  if (value <= 10) {
    return Number((25 + ((value - 1) / 9) * 35).toFixed(2));
  }
  return Number((60 + ((value - 10) / 90) * 40).toFixed(2));
}

/**
 * Formatea el multiplicador actual para mostrarlo junto al control deslizante.
 */
export function formatTimeScale(scale) {
  const value = Math.max(0, Number(scale) || 0);
  if (value === 0) return 'x0';
  if (value < 1) return `x${Number(value.toFixed(2))}`;
  if (value < 10) return `x${Number(value.toFixed(1))}`;
  return `x${Math.round(value)}`;
}
