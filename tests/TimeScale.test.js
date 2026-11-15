import { describe, it, expect } from 'vitest';
import {
  sliderPositionToScale,
  scaleToSliderPosition,
  formatTimeScale
} from '../src/math/TimeScale';

describe('TimeScale - Control fino de velocidad orbital', () => {
  it('debería alinear los valores clave del slider con los multiplicadores preestablecidos', () => {
    expect(sliderPositionToScale(0)).toBe(0);
    expect(sliderPositionToScale(25)).toBe(1);
    expect(sliderPositionToScale(60)).toBe(10);
    expect(sliderPositionToScale(100)).toBe(100);
  });

  it('debería permitir valores intermedios finos por debajo de x1 y entre x1 y x100', () => {
    expect(sliderPositionToScale(12.5)).toBe(0.5);
    expect(sliderPositionToScale(42.5)).toBe(5.5);
    expect(sliderPositionToScale(80)).toBe(55);
  });

  it('debería acotar entradas fuera de rango', () => {
    expect(sliderPositionToScale(-15)).toBe(0);
    expect(sliderPositionToScale(140)).toBe(100);
    expect(scaleToSliderPosition(-5)).toBe(0);
    expect(scaleToSliderPosition(250)).toBe(100);
  });

  it('debería ser invertible en los puntos preestablecidos e intermedios', () => {
    for (const scale of [0, 0.25, 0.5, 1, 2.5, 10, 55, 100]) {
      const pos = scaleToSliderPosition(scale);
      expect(sliderPositionToScale(pos)).toBeCloseTo(scale, 1);
    }
  });

  it('debería formatear el multiplicador según la magnitud', () => {
    expect(formatTimeScale(0)).toBe('x0');
    expect(formatTimeScale(0.25)).toBe('x0.25');
    expect(formatTimeScale(1)).toBe('x1');
    expect(formatTimeScale(4.5)).toBe('x4.5');
    expect(formatTimeScale(10)).toBe('x10');
    expect(formatTimeScale(100)).toBe('x100');
  });
});
