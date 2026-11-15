import * as THREE from 'three';
import { CONSTANTS } from '../math/AstroScale.js';
import { MoonSimulatorBase } from './MoonSimulatorBase.js';

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
}
