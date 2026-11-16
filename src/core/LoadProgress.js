// src/core/LoadProgress.js
// Progreso de carga basado en bytes, no en número de archivos.

export function createByteProgress(totalBytes, onUpdate = () => {}) {
  const total = Number(totalBytes) > 0 ? Number(totalBytes) : 0;
  let loaded = 0;
  let lastFraction = 0;

  return {
    get total() {
      return total;
    },
    get loaded() {
      return loaded;
    },
    add(bytes) {
      const increment = Number(bytes);
      if (!Number.isFinite(increment) || increment <= 0) return lastFraction;
      loaded += increment;
      const fraction = total > 0 ? Math.min(1, loaded / total) : 0;
      lastFraction = Math.max(lastFraction, fraction);
      onUpdate(lastFraction);
      return lastFraction;
    },
    finish() {
      lastFraction = 1;
      onUpdate(1);
      return 1;
    },
    get fraction() {
      return lastFraction;
    }
  };
}
