import { CONSTANTS } from '../math/AstroScale.js';
import { MoonSimulatorBase } from './MoonSimulatorBase.js';

export class RheaSimulator extends MoonSimulatorBase {
  constructor(scene, saturnSimulator, scaleFactor, assets = {}) {
    super(scene, saturnSimulator, scaleFactor, {
      name: 'Rhea',
      radiusKm: CONSTANTS.RHEA.RADIUS,
      orbitSemiMajorKm: CONSTANTS.RHEA.ORBIT_SEMI_MAJOR,
      orbitPeriod: CONSTANTS.RHEA.ORBIT_PERIOD,
      eccentricity: CONSTANTS.RHEA.ECCENTRICITY,
      inclination: CONSTANTS.RHEA.INCLINATION,
      lan: CONSTANTS.RHEA.LAN,
      meanAnomalyEpoch: CONSTANTS.RHEA.MEAN_ANOMALY_EPOCH,
      color: assets.rheaColor,
      normal: assets.rheaNormal,
      ao: assets.rheaAo
    });
  }
}
