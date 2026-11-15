import { CONSTANTS } from '../math/AstroScale.js';
import { MoonSimulatorBase } from './MoonSimulatorBase.js';

export class DioneSimulator extends MoonSimulatorBase {
  constructor(scene, saturnSimulator, scaleFactor, assets = {}) {
    super(scene, saturnSimulator, scaleFactor, {
      name: 'Dione',
      radiusKm: CONSTANTS.DIONE.RADIUS,
      orbitSemiMajorKm: CONSTANTS.DIONE.ORBIT_SEMI_MAJOR,
      orbitPeriod: CONSTANTS.DIONE.ORBIT_PERIOD,
      eccentricity: CONSTANTS.DIONE.ECCENTRICITY,
      inclination: CONSTANTS.DIONE.INCLINATION,
      lan: CONSTANTS.DIONE.LAN,
      meanAnomalyEpoch: CONSTANTS.DIONE.MEAN_ANOMALY_EPOCH,
      color: assets.dioneColor,
      normal: assets.dioneNormal,
      ao: assets.dioneAo
    });
  }
}
