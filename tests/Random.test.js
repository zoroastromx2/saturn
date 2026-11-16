import { describe, it, expect, afterEach } from 'vitest';
import { getRandomSeed, random, setRandomSeed } from '../src/core/Random.js';

afterEach(() => {
  setRandomSeed(null);
});

describe('Random - aleatoriedad reproducible', () => {
  it('devuelve la misma secuencia con la misma semilla', () => {
    setRandomSeed(12345);
    const first = Array.from({ length: 5 }, () => random());

    setRandomSeed(12345);
    const second = Array.from({ length: 5 }, () => random());

    expect(second).toEqual(first);
  });

  it('cambia la secuencia con otra semilla', () => {
    setRandomSeed(1);
    const first = random();
    setRandomSeed(2);
    expect(random()).not.toBe(first);
  });

  it('mantiene los valores en [0, 1)', () => {
    setRandomSeed(2026);
    for (let i = 0; i < 100; i += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('expone y limpia la semilla activa', () => {
    setRandomSeed(99);
    expect(getRandomSeed()).toBe(99);
    setRandomSeed(null);
    expect(getRandomSeed()).toBeNull();
  });
});
