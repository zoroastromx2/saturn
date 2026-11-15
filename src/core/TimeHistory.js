// src/core/TimeHistory.js
export const MAX_TIME_HISTORY = 5;
export const TIME_HISTORY_STORAGE_KEY = 'saturn-sim-time-history';

export function parseUtcDateString(dateStr) {
  if (typeof dateStr !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

export function isValidDateString(dateStr) {
  return parseUtcDateString(dateStr) !== null;
}

export function pushTimeHistory(history, dateStr, maxItems = MAX_TIME_HISTORY) {
  if (!isValidDateString(dateStr)) {
    return Array.isArray(history) ? [...history] : [];
  }

  const normalized = dateStr.trim();
  const limit = Math.max(1, Math.floor(maxItems));
  const previous = Array.isArray(history) ? history : [];

  return [normalized, ...previous.filter((item) => item !== normalized)].slice(0, limit);
}

export function loadTimeHistory(storage = globalThis.localStorage, key = TIME_HISTORY_STORAGE_KEY, maxItems = MAX_TIME_HISTORY) {
  try {
    const raw = storage?.getItem?.(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set();
    const valid = [];
    for (const entry of parsed) {
      if (isValidDateString(entry) && !seen.has(entry)) {
        seen.add(entry);
        valid.push(entry);
        if (valid.length >= maxItems) break;
      }
    }
    return valid;
  } catch {
    return [];
  }
}

export function saveTimeHistory(history, storage = globalThis.localStorage, key = TIME_HISTORY_STORAGE_KEY) {
  try {
    storage?.setItem?.(key, JSON.stringify(history));
  } catch {
    // Ignorar errores de almacenamiento en entornos restringidos.
  }
}
