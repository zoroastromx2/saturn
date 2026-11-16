import * as THREE from 'three';
import { CONSTANTS } from '../math/AstroScale.js';
import { MoonSimulatorBase } from './MoonSimulatorBase.js';

export class TitanSimulator extends MoonSimulatorBase {
  constructor(scene, saturnSimulator, scaleFactor, assets = {}, listener = null) {
    super(scene, saturnSimulator, scaleFactor, {
      name: 'Titan',
      radiusKm: CONSTANTS.TITAN.RADIUS,
      orbitSemiMajorKm: CONSTANTS.TITAN.ORBIT_SEMI_MAJOR,
      orbitPeriod: CONSTANTS.TITAN.ORBIT_PERIOD,
      eccentricity: CONSTANTS.TITAN.ECCENTRICITY,
      inclination: CONSTANTS.TITAN.INCLINATION,
      lan: CONSTANTS.TITAN.LAN,
      meanAnomalyEpoch: CONSTANTS.TITAN.MEAN_ANOMALY_EPOCH,
      geometrySegments: 128,
      baseColor: new THREE.Vector3(0.18, 0.085, 0.025),
      atmosphereStrength: 1.0
    });

    this.applyTitanModel(assets?.models?.titan);

    this.ambientSound = null;
    if (listener && assets.titanAudioBuffer) {
      const sound = new THREE.PositionalAudio(listener);
      sound.setBuffer(assets.titanAudioBuffer);
      sound.setLoop(true);
      sound.setRefDistance(this.radius * 2);
      sound.setMaxDistance(this.radius * 20);
      this.mesh.add(sound);
      this.ambientSound = sound;
    }
  }

  applyTitanModel(source) {
    if (!source) return;

    const model = source.clone(true);
    model.updateMatrixWorld(true);

    let surfaceMesh = null;
    model.traverse((child) => {
      if (!child.isMesh) return;
      if (child.name === 'Titan_Titan_0' || child.material?.name === 'Titan') {
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
    const surfaceTexture = surfaceMaterial?.map;
    if (surfaceTexture) {
      surfaceTexture.colorSpace = THREE.SRGBColorSpace;
      surfaceTexture.wrapS = THREE.RepeatWrapping;
      surfaceTexture.wrapT = THREE.ClampToEdgeWrapping;
      surfaceTexture.needsUpdate = true;
      this.mesh.material.uniforms.tColor.value = surfaceTexture;
      this.mesh.material.uniforms.uBaseColor.value.set(1.0, 1.0, 1.0);
    }
  }
}
