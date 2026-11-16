import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getLanguage, setLanguage, t } from '../src/core/Localization.js';

const source = fs.readFileSync(path.join(process.cwd(), 'src/core/Localization.js'), 'utf8');

function extractKeys(block) {
  return [...block.matchAll(/'([\w.]+)':/g)].map((match) => match[1]);
}

const esStart = source.indexOf('es: {');
const enStart = source.indexOf('en: {');
const esBlock = source.slice(esStart, enStart);
const enBlock = source.slice(enStart, source.indexOf('};', enStart));
const esKeys = extractKeys(esBlock);
const enKeys = extractKeys(enBlock);

function installDocument() {
  const state = { dispatched: null };
  const titleElement = { dataset: { i18n: 'app.title' }, textContent: '' };
  const ariaElement = {
    dataset: { i18nAriaLabel: 'nav.focusSaturn' },
    ariaLabel: '',
    setAttribute(name, value) {
      if (name === 'aria-label') this.ariaLabel = value;
    }
  };
  const placeholderElement = {
    dataset: { i18nPlaceholder: 'app.title' },
    placeholder: '',
    setAttribute(name, value) {
      if (name === 'placeholder') this.placeholder = value;
    }
  };

  globalThis.document = {
    documentElement: { lang: '' },
    title: '',
    querySelectorAll(selector) {
      if (selector === '[data-i18n]') return [titleElement];
      if (selector === '[data-i18n-aria-label]') return [ariaElement];
      if (selector === '[data-i18n-placeholder]') return [placeholderElement];
      return [];
    },
    dispatchEvent(event) {
      state.dispatched = event;
    }
  };

  return { titleElement, ariaElement, placeholderElement, state };
}

describe('Localization - catálogo', () => {
  it('mantiene exactamente las mismas claves en ES y EN', () => {
    expect(new Set(enKeys)).toEqual(new Set(esKeys));
    expect(enKeys).toHaveLength(esKeys.length);
  });

  it('no tiene claves duplicadas ni valores vacíos', () => {
    expect(new Set(esKeys).size).toBe(esKeys.length);
    expect(new Set(enKeys).size).toBe(enKeys.length);
    expect(source).not.toMatch(/':\s*''/);
    expect(source).not.toMatch(/':\s*'\s+'/);
  });
});

describe('Localization - comportamiento', () => {
  beforeEach(() => {
    installDocument();
    setLanguage('es');
    installDocument();
  });

  it('devuelve la clave cuando no existe traducción', () => {
    expect(t('clave.inexistente')).toBe('clave.inexistente');
  });

  it('cambia textos, aria-label, placeholder, lang y título', () => {
    const { titleElement, ariaElement, placeholderElement, state } = installDocument();

    setLanguage('en');

    expect(getLanguage()).toBe('en');
    expect(titleElement.textContent).toBe('Saturn Simulator');
    expect(ariaElement.ariaLabel).toBe('Focus Saturn');
    expect(placeholderElement.placeholder).toBe('Saturn Simulator');
    expect(globalThis.document.documentElement.lang).toBe('en');
    expect(globalThis.document.title).toBe('Saturn Simulator');
    expect(state.dispatched?.detail).toEqual({ language: 'en' });

    setLanguage('es');
    expect(titleElement.textContent).toBe('Simulador de Saturno');
    expect(getLanguage()).toBe('es');
  });

  it('ignora idiomas no soportados', () => {
    setLanguage('en');
    setLanguage('fr');
    expect(getLanguage()).toBe('en');
    setLanguage('es');
  });
});
