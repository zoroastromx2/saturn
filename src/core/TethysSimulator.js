import { CONSTANTS } from '../math/AstroScale.js';
import { MoonSimulatorBase } from './MoonSimulatorBase.js';

export class TethysSimulator extends MoonSimulatorBase {
  constructor(scene, saturnSimulator, scaleFactor, assets = {}) {
    super(scene, saturnSimulator, scaleFactor, {
      name: 'Tethys',
      radiusKm: CONSTANTS.TETHYS.RADIUS,
      orbitSemiMajorKm: CONSTANTS.TETHYS.ORBIT_SEMI_MAJOR,
      orbitPeriod: CONSTANTS.TETHYS.ORBIT_PERIOD,
      eccentricity: CONSTANTS.TETHYS.ECCENTRICITY,
      inclination: CONSTANTS.TETHYS.INCLINATION,
      lan: CONSTANTS.TETHYS.LAN,
      meanAnomalyEpoch: CONSTANTS.TETHYS.MEAN_ANOMALY_EPOCH,
      color: assets.tethysColor,
      normal: assets.tethysNormal,
      ao: assets.tethysAo
    });
  }
}
