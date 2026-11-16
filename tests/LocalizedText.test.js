import { describe, it, expect } from 'vitest';
import { hasFullLocalization, resolveLocalized } from '../src/core/LocalizedText.js';

describe('LocalizedText - resolución de texto', () => {
  it('devuelve un string tal cual por compatibilidad', () => {
    expect(resolveLocalized('Sonda Huygens', 'en')).toBe('Sonda Huygens');
  });

  it('elige el idioma pedido', () => {
    const value = { es: 'Gran Final', en: 'Grand Finale' };
    expect(resolveLocalized(value, 'es')).toBe('Gran Final');
    expect(resolveLocalized(value, 'en')).toBe('Grand Finale');
  });

  it('cae a español y luego a inglés cuando falta el idioma o está vacío', () => {
    expect(resolveLocalized({ es: 'Hola', en: 'Hello' }, 'fr')).toBe('Hola');
    expect(resolveLocalized({ es: 'Hola', en: '   ' }, 'en')).toBe('Hola');
    expect(resolveLocalized({ en: 'Only English' }, 'es')).toBe('Only English');
  });

  it('devuelve cadena vacía con valores inválidos', () => {
    expect(resolveLocalized(null)).toBe('');
    expect(resolveLocalized(undefined)).toBe('');
    expect(resolveLocalized(42)).toBe('');
    expect(resolveLocalized({})).toBe('');
  });

  it('hasFullLocalization exige es y en no vacíos', () => {
    expect(hasFullLocalization({ es: 'a', en: 'b' })).toBe(true);
    expect(hasFullLocalization({ es: 'a', en: '  ' })).toBe(false);
    expect(hasFullLocalization({ es: 'a' })).toBe(false);
    expect(hasFullLocalization('texto')).toBe(false);
    expect(hasFullLocalization(null)).toBe(false);
  });
});
