// src/core/EnvironmentProbe.js
import * as THREE from 'three';

export const ENVIRONMENT_PROBE_WIDTH = 512;
export const ENVIRONMENT_PROBE_HEIGHT = 256;

export function createEnvironmentProbe(texture) {
  if (typeof document === 'undefined' || !texture?.image) {
    return null;
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = ENVIRONMENT_PROBE_WIDTH;
    canvas.height = ENVIRONMENT_PROBE_HEIGHT;
    const context = canvas.getContext('2d');
    if (!context) return null;

    context.drawImage(texture.image, 0, 0, ENVIRONMENT_PROBE_WIDTH, ENVIRONMENT_PROBE_HEIGHT);

    const probe = new THREE.CanvasTexture(canvas);
    probe.mapping = THREE.EquirectangularReflectionMapping;
    probe.colorSpace = THREE.LinearSRGBColorSpace;
    probe.generateMipmaps = false;
    probe.needsUpdate = true;
    return probe;
  } catch {
    return null;
  }
}
