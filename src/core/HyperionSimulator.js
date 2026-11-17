// src/core/HyperionSimulator.js
import * as THREE from 'three';
import { CONSTANTS } from '../math/AstroScale.js';
import { MoonSimulatorBase } from './MoonSimulatorBase.js';
import { WHITE_TEXTURE } from './MoonTextures.js';

function computeRmsRadius(geometry) {
  const positions = geometry?.attributes?.position;
  if (!positions || positions.count === 0) return 0;

  let sumSquares = 0;
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    sumSquares += x * x + y * y + z * z;
  }
  return Math.sqrt(sumSquares / positions.count);
}

export class HyperionSimulator extends MoonSimulatorBase {
  constructor(scene, saturnSimulator, scaleFactor, assets = {}) {
    super(scene, saturnSimulator, scaleFactor, {
      name: 'Hyperion',
      radiusKm: CONSTANTS.HYPERION.RADIUS,
      orbitSemiMajorKm: CONSTANTS.HYPERION.ORBIT_SEMI_MAJOR,
      orbitPeriod: CONSTANTS.HYPERION.ORBIT_PERIOD,
      eccentricity: CONSTANTS.HYPERION.ECCENTRICITY,
      inclination: CONSTANTS.HYPERION.INCLINATION,
      lan: CONSTANTS.HYPERION.LAN,
      meanAnomalyEpoch: CONSTANTS.HYPERION.MEAN_ANOMALY_EPOCH,
      geometrySegments: 64,
      castsShadow: false
    });

    this.applyHyperionModel(assets?.models?.hyperion);
  }

  applyHyperionModel(source) {
    if (!source) return;

    const model = source.clone(true);
    model.updateMatrixWorld(true);

    let surfaceMesh = null;
    model.traverse((child) => {
      if (!surfaceMesh && child.isMesh) {
        surfaceMesh = child;
      }
    });
    if (!surfaceMesh?.geometry) return;

    const geometry = surfaceMesh.geometry.clone();
    delete geometry.parameters;
    geometry.applyMatrix4(surfaceMesh.matrixWorld);
    geometry.center();

    const rmsRadius = computeRmsRadius(geometry);
    if (!rmsRadius) return;

    const scale = this.radius / rmsRadius;
    geometry.scale(scale, scale, scale);
    geometry.computeBoundingSphere();

    this.mesh.geometry.dispose();
    this.mesh.geometry = geometry;
    this.mesh.userData.textureFlipY = false;

    const surfaceMaterial = Array.isArray(surfaceMesh.material)
      ? surfaceMesh.material[0]
      : surfaceMesh.material;
    const colorTexture = surfaceMaterial?.map;
    if (colorTexture) {
      colorTexture.colorSpace = THREE.SRGBColorSpace;
      colorTexture.wrapS = THREE.RepeatWrapping;
      colorTexture.wrapT = THREE.RepeatWrapping;
      colorTexture.needsUpdate = true;
      this.mesh.material.uniforms.tColor.value = colorTexture;
    }

    const normalTexture = surfaceMaterial?.normalMap;
    if (normalTexture) {
      normalTexture.colorSpace = THREE.LinearSRGBColorSpace;
      normalTexture.wrapS = THREE.RepeatWrapping;
      normalTexture.wrapT = THREE.RepeatWrapping;
      normalTexture.needsUpdate = true;
      this.mesh.material.uniforms.tNormal.value = normalTexture;
    }

    this.mesh.material.uniforms.tAo.value = WHITE_TEXTURE;
  }
}
