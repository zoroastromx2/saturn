import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  ENVIRONMENT_PROBE_HEIGHT,
  ENVIRONMENT_PROBE_WIDTH,
  createEnvironmentProbe
} from '../src/core/EnvironmentProbe.js';

function withFakeCanvas() {
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({
      drawImage: (_image, _x, _y, width, height) => {
        canvas.width = width;
        canvas.height = height;
      }
    })
  };
  globalThis.document = { createElement: () => canvas };
  return canvas;
}

describe('EnvironmentProbe - entorno PBR reducido', () => {
  it('devuelve null sin document (entorno de pruebas node)', () => {
    expect(createEnvironmentProbe({ image: {} })).toBeNull();
  });

  it('reduce el mapa a 512×256 y lo marca como equirectangular', () => {
    const canvas = withFakeCanvas();
    const texture = createEnvironmentProbe({ image: { width: 8192, height: 4096 } });

    expect(texture).toBeInstanceOf(THREE.CanvasTexture);
    expect(canvas.width).toBe(ENVIRONMENT_PROBE_WIDTH);
    expect(canvas.height).toBe(ENVIRONMENT_PROBE_HEIGHT);
    expect(texture.mapping).toBe(THREE.EquirectangularReflectionMapping);
    expect(texture.colorSpace).toBe(THREE.LinearSRGBColorSpace);
    expect(texture.generateMipmaps).toBe(false);

    delete globalThis.document;
  });

  it('devuelve null si la textura no tiene imagen', () => {
    withFakeCanvas();
    expect(createEnvironmentProbe(null)).toBeNull();
    expect(createEnvironmentProbe({})).toBeNull();
    delete globalThis.document;
  });
});
