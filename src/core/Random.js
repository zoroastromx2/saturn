// src/core/Random.js
// Aleatoriedad reproducible para capturas y pruebas visuales.

let state = null;

/** Fija una semilla (uint32). Con `null` se vuelve a Math.random(). */
export function setRandomSeed(seed) {
  if (seed === null || seed === undefined) {
    state = null;
    return;
  }
  state = Number(seed) >>> 0;
}

/** Semilla actual, o null si no hay siembra activa. */
export function getRandomSeed() {
  return state;
}

/** mulberry32: rápido, determinista y suficiente para distribuir partículas. */
export function random() {
  if (state === null) return Math.random();

  state = (state + 0x6d2b79f5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
