// src/core/LoadProgress.js
// Seguimiento de progreso de carga por bytes descargados.

export function createByteProgress(totalBytes, onUpdate = null) {
  const total = Number.isFinite(totalBytes) && totalBytes > 0 ? totalBytes : 0;
  let loaded = 0;
  let done = false;

  const computeFraction = () => {
    if (done) return 1;
    if (total <= 0) return 0;
    return Math.min(1, Math.max(0, loaded / total));
  };

  return {
    get fraction() {
      return computeFraction();
    },

    add(bytes) {
      if (done) return 1;
      if (!Number.isFinite(bytes) || bytes <= 0) {
        return computeFraction();
      }
      if (total <= 0) {
        loaded += bytes;
        return 0;
      }

      loaded = Math.min(total, loaded + bytes);
      const next = computeFraction();
      onUpdate?.(next);
      return next;
    },

    finish() {
      done = true;
      onUpdate?.(1);
      return 1;
    }
  };
}
