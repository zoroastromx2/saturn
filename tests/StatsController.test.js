import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StatsController, formatMemoryUsage } from '../src/core/StatsController';

describe('StatsController - Estadísticas de simulación', () => {
  const originalDocument = globalThis.document;

  beforeEach(() => {
    const elements = {
      'stats-fps': { innerText: '' },
      'stats-memory': { innerText: '' },
      'stats-gpu': { innerText: '' }
    };
    globalThis.document = {
      getElementById: (id) => elements[id] || null
    };
  });

  afterEach(() => {
    globalThis.document = originalDocument;
  });

  it('debería formatear la memoria JS activa en MB cuando performance.memory está disponible', () => {
    const formatted = formatMemoryUsage({ usedJSHeapSize: 64 * 1024 * 1024 });
    expect(formatted).toContain('64');
    expect(formatted).toContain('MB');
    expect(formatMemoryUsage(null)).toBeNull();
  });

  it('debería calcular FPS tras el intervalo de muestreo y mostrar memoria y recursos GPU', () => {
    let nowMs = 1000;
    const mockPerformance = {
      now: () => nowMs,
      memory: { usedJSHeapSize: 50 * 1024 * 1024 }
    };
    const mockRenderer = {
      info: { memory: { geometries: 12, textures: 9 } }
    };

    const stats = new StatsController(mockRenderer, mockPerformance);
    stats.refresh();
    expect(stats.fpsElement.innerText).toBe('—');
    expect(stats.memoryElement.innerText).toContain('50');
    expect(stats.gpuElement.innerText).toBe('12 / 9');

    for (let i = 0; i < 29; i++) {
      nowMs += 16;
      stats.update();
    }
    nowMs = 1500;
    stats.update();

    expect(stats.fpsElement.innerText).toBe('60 FPS');
  });

  it('debería mostrar N/D cuando performance.memory no está soportado', () => {
    const stats = new StatsController(
      { info: { memory: { geometries: 4, textures: 2 } } },
      { now: () => 0 }
    );
    stats.refresh();
    expect(stats.memoryElement.innerText).toBe('N/D');
    expect(stats.gpuElement.innerText).toBe('4 / 2');
  });
});
