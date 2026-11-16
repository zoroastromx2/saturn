import { describe, it, expect } from 'vitest';
import { createByteProgress } from '../src/core/LoadProgress.js';

describe('LoadProgress - progreso por bytes', () => {
  it('acumula bytes y calcula la fracción', () => {
    const fractions = [];
    const progress = createByteProgress(1000, (fraction) => fractions.push(fraction));

    expect(progress.fraction).toBe(0);
    expect(progress.add(250)).toBeCloseTo(0.25);
    expect(progress.add(250)).toBeCloseTo(0.5);
    expect(fractions).toEqual([0.25, 0.5]);
  });

  it('nunca retrocede ni supera 1', () => {
    const progress = createByteProgress(100);
    progress.add(80);
    expect(progress.add(80)).toBe(1);
    expect(progress.add(10)).toBe(1);
  });

  it('ignora incrementos inválidos', () => {
    const progress = createByteProgress(100);
    expect(progress.add(0)).toBe(0);
    expect(progress.add(-5)).toBe(0);
    expect(progress.add(Number.NaN)).toBe(0);
    expect(progress.add(undefined)).toBe(0);
  });

  it('con total desconocido mantiene 0 hasta finish', () => {
    const progress = createByteProgress(0);
    expect(progress.add(500)).toBe(0);
    expect(progress.finish()).toBe(1);
    expect(progress.fraction).toBe(1);
  });
});
