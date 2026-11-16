import * as THREE from 'three';
import { CONSTANTS } from '../math/AstroScale.js';
import { MoonSimulatorBase } from './MoonSimulatorBase.js';
import { WHITE_TEXTURE } from './MoonTextures.js';

export class MimasSimulator extends MoonSimulatorBase {
  constructor(scene, saturnSimulator, scaleFactor, assets = {}, listener = null) {
    super(scene, saturnSimulator, scaleFactor, {
      name: 'Mimas',
      radiusKm: CONSTANTS.MIMAS.RADIUS,
      orbitSemiMajorKm: CONSTANTS.MIMAS.ORBIT_SEMI_MAJOR,
      orbitPeriod: CONSTANTS.MIMAS.ORBIT_PERIOD,
      eccentricity: CONSTANTS.MIMAS.ECCENTRICITY,
      inclination: CONSTANTS.MIMAS.INCLINATION,
      lan: CONSTANTS.MIMAS.LAN,
      meanAnomalyEpoch: CONSTANTS.MIMAS.MEAN_ANOMALY_EPOCH,
      geometrySegments: 128,
      color: assets.mimasColor,
      normal: assets.mimasNormal,
      ao: assets.mimasAo
    });

    this.mesh.rotation.y = -2.45;
    this.applyMimasModel(assets?.models?.mimas);

    this.surfaceCameraMount = new THREE.Object3D();
    this.surfaceCameraMount.name = 'MimasSurfaceCameraMount';
    this.surfaceCameraMount.position.set(0, this.radius * 0.5, this.radius);
    this.mesh.add(this.surfaceCameraMount);

    this.ambientSound = null;
    if (listener && assets.mimasAudioBuffer) {
      const sound = new THREE.PositionalAudio(listener);
      sound.setBuffer(assets.mimasAudioBuffer);
      sound.setLoop(true);
      sound.setRefDistance(this.radius * 2);
      sound.setMaxDistance(this.radius * 20);
      this.mesh.add(sound);
      this.ambientSound = sound;
    }
  }

  applyMimasModel(source) {
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
    geometry.computeBoundingSphere();
    const sourceRadius = geometry.boundingSphere?.radius;
    if (!sourceRadius) return;

    const scale = this.radius / sourceRadius;
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
