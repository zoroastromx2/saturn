// src/core/LocalizedText.js
// Resuelve campos de texto que pueden venir como string o como { es, en }.

export const SUPPORTED_LANGUAGES = ['es', 'en'];
export const DEFAULT_LANGUAGE = 'es';

/**
 * Devuelve el texto en el idioma pedido con fallback determinista.
 * Un string se devuelve tal cual (compatibilidad con datos antiguos).
 */
export function resolveLocalized(value, language = DEFAULT_LANGUAGE) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';

  const requested = SUPPORTED_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE;
  const candidates = [value[requested], value.es, value.en];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate;
  }
  return '';
}

/** true si el campo tiene todos los idiomas soportados con texto no vacío. */
export function hasFullLocalization(value, languages = SUPPORTED_LANGUAGES) {
  if (typeof value === 'string') return false;
  if (!value || typeof value !== 'object') return false;
  return languages.every(
    (language) => typeof value[language] === 'string' && value[language].trim().length > 0
  );
}
