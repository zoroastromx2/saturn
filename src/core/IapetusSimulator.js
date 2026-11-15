import { CONSTANTS } from '../math/AstroScale.js';
import { MoonSimulatorBase } from './MoonSimulatorBase.js';

export class IapetusSimulator extends MoonSimulatorBase {
  constructor(scene, saturnSimulator, scaleFactor, assets = {}) {
    super(scene, saturnSimulator, scaleFactor, {
      name: 'Iapetus',
      radiusKm: CONSTANTS.IAPETUS.RADIUS,
      orbitSemiMajorKm: CONSTANTS.IAPETUS.ORBIT_SEMI_MAJOR,
      orbitPeriod: CONSTANTS.IAPETUS.ORBIT_PERIOD,
      eccentricity: CONSTANTS.IAPETUS.ECCENTRICITY,
      inclination: CONSTANTS.IAPETUS.INCLINATION,
      lan: CONSTANTS.IAPETUS.LAN,
      meanAnomalyEpoch: CONSTANTS.IAPETUS.MEAN_ANOMALY_EPOCH,
      color: assets.iapetusColor,
      normal: assets.iapetusNormal,
      ao: assets.iapetusAo
    });
  }
}
