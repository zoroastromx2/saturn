import { describe, it, expect } from 'vitest';
import {
  MAX_TIME_HISTORY,
  isValidDateString,
  loadTimeHistory,
  parseUtcDateString,
  pushTimeHistory,
  saveTimeHistory
} from '../src/core/TimeHistory';

describe('TimeHistory - Historial de máquina del tiempo', () => {
  it('valida y parsea fechas YYYY-MM-DD en UTC rechazando fechas inválidas de calendario', () => {
    const valid = parseUtcDateString('2004-07-01');
    expect(valid).toBeInstanceOf(Date);
    expect(valid.toISOString()).toBe('2004-07-01T00:00:00.000Z');

    expect(isValidDateString('2004-07-01')).toBe(true);
    expect(isValidDateString('2026-02-30')).toBe(false);
    expect(isValidDateString('not-a-date')).toBe(false);
    expect(isValidDateString('')).toBe(false);
  });

  it('inserta fechas al inicio, evita duplicados y respeta el límite máximo', () => {
    let history = [];
    history = pushTimeHistory(history, '2004-07-01');
    history = pushTimeHistory(history, '2017-09-15');
    history = pushTimeHistory(history, '2004-07-01');
    expect(history).toEqual(['2004-07-01', '2017-09-15']);

    for (let i = 1; i <= 6; i++) {
      history = pushTimeHistory(history, `202${i}-01-01`);
    }
    expect(history).toHaveLength(MAX_TIME_HISTORY);
    expect(history[0]).toBe('2026-01-01');
  });

  it('ignora fechas inválidas al actualizar el historial', () => {
    const initial = ['2004-07-01'];
    expect(pushTimeHistory(initial, '2026-13-45')).toEqual(['2004-07-01']);
  });

  it('persiste y recupera solo fechas válidas y únicas desde almacenamiento', () => {
    const store = new Map();
    const mockStorage = {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, val) => store.set(key, val)
    };

    saveTimeHistory(['2017-09-15', '2004-07-01'], mockStorage, 'test-history');
    expect(loadTimeHistory(mockStorage, 'test-history')).toEqual(['2017-09-15', '2004-07-01']);

    store.set(
      'test-history',
      JSON.stringify(['2004-07-01', 'invalid', '2004-07-01', '2030-01-01'])
    );
    expect(loadTimeHistory(mockStorage, 'test-history')).toEqual(['2004-07-01', '2030-01-01']);

    store.set('test-history', '{broken-json');
    expect(loadTimeHistory(mockStorage, 'test-history')).toEqual([]);
  });
});
