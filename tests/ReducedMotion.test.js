import { describe, it, expect, vi } from 'vitest';
import {
  prefersReducedMotion,
  transitionDuration,
  watchReducedMotion
} from '../src/core/ReducedMotion.js';

describe('ReducedMotion - preferencia del sistema', () => {
  it('detecta la preferencia activa e inactiva', () => {
    expect(prefersReducedMotion({ matches: true })).toBe(true);
    expect(prefersReducedMotion({ matches: false })).toBe(false);
    expect(prefersReducedMotion(undefined)).toBe(false);
  });

  it('anula la duración solo con la preferencia activa', () => {
    expect(transitionDuration(2, true)).toBe(0);
    expect(transitionDuration(2, false)).toBe(2);
    expect(transitionDuration(0.6)).toBe(0.6);
    expect(transitionDuration(undefined)).toBe(0);
    expect(transitionDuration(-3, false)).toBe(0);
  });

  it('escucha el cambio de preferencia y permite desuscribirse', () => {
    const listeners = [];
    const mediaQuery = {
      matches: false,
      addEventListener: (type, listener) => listeners.push(listener),
      removeEventListener: (_type, listener) => {
        const index = listeners.indexOf(listener);
        if (index >= 0) listeners.splice(index, 1);
      }
    };
    const onChange = vi.fn();

    const stop = watchReducedMotion(onChange, mediaQuery);
    listeners[0]({ matches: true });
    expect(onChange).toHaveBeenCalledWith(true);

    stop();
    expect(listeners).toHaveLength(0);
  });

  it('no falla cuando el navegador no soporta matchMedia', () => {
    const stop = watchReducedMotion(() => {}, undefined);
    expect(typeof stop).toBe('function');
    expect(() => stop()).not.toThrow();
  });
});
