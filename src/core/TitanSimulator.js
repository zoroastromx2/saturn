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
}
