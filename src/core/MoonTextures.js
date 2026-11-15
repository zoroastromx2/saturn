import * as THREE from 'three';

export const WHITE_TEXTURE = new THREE.DataTexture(
  new Uint8Array([255, 255, 255, 255]),
  1,
  1,
  THREE.RGBAFormat
);
WHITE_TEXTURE.colorSpace = THREE.SRGBColorSpace;
WHITE_TEXTURE.needsUpdate = true;

export const FLAT_NORMAL_TEXTURE = new THREE.DataTexture(
  new Uint8Array([128, 128, 255, 255]),
  1,
  1,
  THREE.RGBAFormat
);
FLAT_NORMAL_TEXTURE.colorSpace = THREE.LinearSRGBColorSpace;
FLAT_NORMAL_TEXTURE.needsUpdate = true;
