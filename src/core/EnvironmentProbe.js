// src/core/EnvironmentProbe.js
// Entorno PBR pequeño: evita reutilizar el mapa galáctico de alta resolución.
import * as THREE from 'three';

export const ENVIRONMENT_PROBE_WIDTH = 512;
export const ENVIRONMENT_PROBE_HEIGHT = 256;

export function createEnvironmentProbe(
  source,
  { width = ENVIRONMENT_PROBE_WIDTH, height = ENVIRONMENT_PROBE_HEIGHT } = {}
) {
  if (typeof document === 'undefined' || !source?.image) return null;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return null;

    context.drawImage(source.image, 0, 0, width, height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.LinearSRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return texture;
  } catch {
    return null;
  }
}
