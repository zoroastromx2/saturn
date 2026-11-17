// src/core/TelemetryController.js
import * as THREE from 'three';
import {
  CONSTANTS,
  calculateOrbitalVelocity,
  calculateApsides,
  kmToAU
} from '../math/AstroScale.js';
import { t } from './Localization.js';

const UPDATE_INTERVAL = 0.1;

function pad2(value) {
  return String(value).padStart(2, '0');
}

export function formatSimulatedDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '—';
  }

  const year = String(date.getUTCFullYear()).padStart(4, '0');
  const month = pad2(date.getUTCMonth() + 1);
  const day = pad2(date.getUTCDate());
  const hours = pad2(date.getUTCHours());
  const minutes = pad2(date.getUTCMinutes());
  const seconds = pad2(date.getUTCSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
}

const BODY_DATA = {
  Saturn: {
    radius: CONSTANTS.SATURN.RADIUS_EQUATORIAL,
    period: null,
    velocity: null,
    eccentricity: CONSTANTS.SATURN.ORBIT_ECCENTRICITY,
    ...calculateApsides(CONSTANTS.SATURN.SUN_DISTANCE_KM, CONSTANTS.SATURN.ORBIT_ECCENTRICITY),
    labelKey: 'body.saturn'
  },
  Earth: {
    radius: CONSTANTS.EARTH.RADIUS_EQUATORIAL,
    period: null,
    velocity: null,
    eccentricity: CONSTANTS.EARTH.ORBIT_ECCENTRICITY,
    ...calculateApsides(CONSTANTS.EARTH.SUN_DISTANCE_KM, CONSTANTS.EARTH.ORBIT_ECCENTRICITY),
    labelKey: 'body.earth'
  },
  Titan: {
    radius: CONSTANTS.TITAN.RADIUS,
    period: CONSTANTS.TITAN.ORBIT_PERIOD,
    velocity: calculateOrbitalVelocity(
      CONSTANTS.TITAN.ORBIT_SEMI_MAJOR,
      CONSTANTS.TITAN.ORBIT_PERIOD
    ),
    eccentricity: CONSTANTS.TITAN.ORBIT_ECCENTRICITY,
    ...calculateApsides(CONSTANTS.TITAN.ORBIT_SEMI_MAJOR, CONSTANTS.TITAN.ORBIT_ECCENTRICITY),
    labelKey: 'body.titan'
  },
  Enceladus: {
    radius: CONSTANTS.ENCELADUS.RADIUS,
    period: CONSTANTS.ENCELADUS.ORBIT_PERIOD,
    velocity: calculateOrbitalVelocity(
      CONSTANTS.ENCELADUS.ORBIT_SEMI_MAJOR,
      CONSTANTS.ENCELADUS.ORBIT_PERIOD
    ),
    eccentricity: CONSTANTS.ENCELADUS.ORBIT_ECCENTRICITY,
    ...calculateApsides(
      CONSTANTS.ENCELADUS.ORBIT_SEMI_MAJOR,
      CONSTANTS.ENCELADUS.ORBIT_ECCENTRICITY
    ),
    labelKey: 'body.enceladus'
  },
  Mimas: {
    radius: CONSTANTS.MIMAS.RADIUS,
    period: CONSTANTS.MIMAS.ORBIT_PERIOD,
    velocity: calculateOrbitalVelocity(
      CONSTANTS.MIMAS.ORBIT_SEMI_MAJOR,
      CONSTANTS.MIMAS.ORBIT_PERIOD
    ),
    eccentricity: CONSTANTS.MIMAS.ORBIT_ECCENTRICITY,
    ...calculateApsides(CONSTANTS.MIMAS.ORBIT_SEMI_MAJOR, CONSTANTS.MIMAS.ORBIT_ECCENTRICITY),
    labelKey: 'body.mimas'
  },
  Tethys: {
    radius: CONSTANTS.TETHYS.RADIUS,
    period: CONSTANTS.TETHYS.ORBIT_PERIOD,
    velocity: calculateOrbitalVelocity(
      CONSTANTS.TETHYS.ORBIT_SEMI_MAJOR,
      CONSTANTS.TETHYS.ORBIT_PERIOD
    ),
    eccentricity: CONSTANTS.TETHYS.ORBIT_ECCENTRICITY,
    ...calculateApsides(CONSTANTS.TETHYS.ORBIT_SEMI_MAJOR, CONSTANTS.TETHYS.ORBIT_ECCENTRICITY),
    labelKey: 'body.tethys'
  },
  Dione: {
    radius: CONSTANTS.DIONE.RADIUS,
    period: CONSTANTS.DIONE.ORBIT_PERIOD,
    velocity: calculateOrbitalVelocity(
      CONSTANTS.DIONE.ORBIT_SEMI_MAJOR,
      CONSTANTS.DIONE.ORBIT_PERIOD
    ),
    eccentricity: CONSTANTS.DIONE.ORBIT_ECCENTRICITY,
    ...calculateApsides(CONSTANTS.DIONE.ORBIT_SEMI_MAJOR, CONSTANTS.DIONE.ORBIT_ECCENTRICITY),
    labelKey: 'body.dione'
  },
  Rhea: {
    radius: CONSTANTS.RHEA.RADIUS,
    period: CONSTANTS.RHEA.ORBIT_PERIOD,
    velocity: calculateOrbitalVelocity(
      CONSTANTS.RHEA.ORBIT_SEMI_MAJOR,
      CONSTANTS.RHEA.ORBIT_PERIOD
    ),
    eccentricity: CONSTANTS.RHEA.ORBIT_ECCENTRICITY,
    ...calculateApsides(CONSTANTS.RHEA.ORBIT_SEMI_MAJOR, CONSTANTS.RHEA.ORBIT_ECCENTRICITY),
    labelKey: 'body.rhea'
  },
  Hyperion: {
    radius: CONSTANTS.HYPERION.RADIUS,
    period: CONSTANTS.HYPERION.ORBIT_PERIOD,
    velocity: calculateOrbitalVelocity(
      CONSTANTS.HYPERION.ORBIT_SEMI_MAJOR,
      CONSTANTS.HYPERION.ORBIT_PERIOD
    ),
    eccentricity: CONSTANTS.HYPERION.ORBIT_ECCENTRICITY,
    ...calculateApsides(CONSTANTS.HYPERION.ORBIT_SEMI_MAJOR, CONSTANTS.HYPERION.ORBIT_ECCENTRICITY),
    labelKey: 'body.hyperion'
  },
  Iapetus: {
    radius: CONSTANTS.IAPETUS.RADIUS,
    period: CONSTANTS.IAPETUS.ORBIT_PERIOD,
    velocity: calculateOrbitalVelocity(
      CONSTANTS.IAPETUS.ORBIT_SEMI_MAJOR,
      CONSTANTS.IAPETUS.ORBIT_PERIOD
    ),
    eccentricity: CONSTANTS.IAPETUS.ORBIT_ECCENTRICITY,
    ...calculateApsides(CONSTANTS.IAPETUS.ORBIT_SEMI_MAJOR, CONSTANTS.IAPETUS.ORBIT_ECCENTRICITY),
    labelKey: 'body.iapetus'
  }
};

export class TelemetryController {
  constructor(camera, cameraController, scaleFactor, sunDirection = null, simulationDate = null) {
    this.camera = camera;
    this.cameraController = cameraController;
    this.scaleFactor = scaleFactor;
    this.simulationDate = simulationDate;
    this.accumulatedTime = 0;

    this.sunDirection = (
      sunDirection ? sunDirection.clone() : new THREE.Vector3(1.0, 0.35, 0.35)
    ).normalize();
    this.sunPositionKm = this.sunDirection.clone().multiplyScalar(CONSTANTS.SATURN.SUN_DISTANCE_KM);
    this.bodyWorldPosition = new THREE.Vector3();
    this.bodyPositionKm = new THREE.Vector3();

    // Cachear los nodos evita lecturas de layout en el bucle de render.
    this.targetElement = document.getElementById('telemetry-target');
    this.simDateElement = document.getElementById('telemetry-sim-date');
    this.altitudeElement = document.getElementById('telemetry-altitude');
    this.periodElement = document.getElementById('telemetry-period');
    this.velocityElement = document.getElementById('telemetry-velocity');
    this.sunDistanceElement = document.getElementById('telemetry-sun-distance');
    this.eccentricityElement = document.getElementById('telemetry-eccentricity');
    this.apoapsisElement = document.getElementById('telemetry-apoapsis');
    this.periapsisElement = document.getElementById('telemetry-periapsis');
  }

  update(deltaTime) {
    this.accumulatedTime += deltaTime;

    if (this.accumulatedTime < UPDATE_INTERVAL) {
      return;
    }

    this.accumulatedTime = 0;
    this.refresh();
  }

  refresh() {
    const target = this.cameraController.currentTarget;
    const targetName = target?.name || 'Saturn';
    const body = BODY_DATA[targetName] || BODY_DATA.Saturn;
    const targetPosition = target ? target.getWorldPosition(this.bodyWorldPosition) : null;

    // Saturno está en el origen; el resto de cuerpos usan su posición viva.
    const distanceToCore = targetPosition
      ? this.camera.position.distanceTo(targetPosition)
      : this.camera.position.length();
    const altitudeKm = distanceToCore * this.scaleFactor - body.radius;

    let sunDistanceAu;
    if (targetName === 'Earth') {
      sunDistanceAu = kmToAU(CONSTANTS.EARTH.SUN_DISTANCE_KM);
    } else {
      if (targetPosition) {
        this.bodyPositionKm.copy(targetPosition).multiplyScalar(this.scaleFactor);
      } else {
        this.bodyPositionKm.set(0, 0, 0);
      }
      sunDistanceAu = kmToAU(this.sunPositionKm.distanceTo(this.bodyPositionKm));
    }

    this.targetElement.innerText = t(body.labelKey);
    if (this.simDateElement) {
      const currentSimDate =
        typeof this.simulationDate === 'function' ? this.simulationDate() : this.simulationDate;
      this.simDateElement.innerText = formatSimulatedDate(currentSimDate);
    }
    this.altitudeElement.innerText = `${Math.floor(Math.max(0, altitudeKm)).toLocaleString()} km`;
    this.periodElement.innerText =
      body.period === null ? '—' : `${body.period.toLocaleString()} ${t('telemetry.days')}`;
    if (this.velocityElement) {
      this.velocityElement.innerText =
        body.velocity === null
          ? '—'
          : `${body.velocity.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })} km/s`;
    }
    if (this.sunDistanceElement) {
      this.sunDistanceElement.innerText = `${sunDistanceAu.toLocaleString(undefined, {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
      })} AU`;
    }
    if (this.eccentricityElement) {
      this.eccentricityElement.innerText =
        body.eccentricity === null || body.eccentricity === undefined
          ? '—'
          : body.eccentricity.toLocaleString(undefined, {
              minimumFractionDigits: 4,
              maximumFractionDigits: 4
            });
    }
    if (this.apoapsisElement) {
      this.apoapsisElement.innerText =
        body.apoapsisKm === null || body.apoapsisKm === undefined
          ? '—'
          : `${Math.round(body.apoapsisKm).toLocaleString()} km`;
    }
    if (this.periapsisElement) {
      this.periapsisElement.innerText =
        body.periapsisKm === null || body.periapsisKm === undefined
          ? '—'
          : `${Math.round(body.periapsisKm).toLocaleString()} km`;
    }
  }
}
