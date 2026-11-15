// src/core/TelemetryController.js
import * as THREE from 'three';
import { CONSTANTS, calculateOrbitalVelocity, kmToAU } from '../math/AstroScale.js';
import { t } from './Localization.js';

const UPDATE_INTERVAL = 0.1;

const BODY_DATA = {
  Saturn: {
    radius: CONSTANTS.SATURN.RADIUS_EQUATORIAL,
    period: null,
    velocity: null,
    eccentricity: CONSTANTS.SATURN.ORBIT_ECCENTRICITY,
    labelKey: 'body.saturn'
  },
  Earth: {
    radius: CONSTANTS.EARTH.RADIUS_EQUATORIAL,
    period: null,
    velocity: null,
    eccentricity: CONSTANTS.EARTH.ORBIT_ECCENTRICITY,
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
    labelKey: 'body.mimas'
  }
};

export class TelemetryController {
  constructor(camera, cameraController, scaleFactor, sunDirection = null) {
    this.camera = camera;
    this.cameraController = cameraController;
    this.scaleFactor = scaleFactor;
    this.accumulatedTime = 0;

    this.sunDirection = (sunDirection
      ? sunDirection.clone()
      : new THREE.Vector3(1.0, 0.35, 0.35)
    ).normalize();
    this.sunPositionKm = this.sunDirection.clone().multiplyScalar(CONSTANTS.SATURN.SUN_DISTANCE_KM);
    this.bodyPositionKm = new THREE.Vector3();

    // Cachear los nodos evita lecturas de layout en el bucle de render.
    this.targetElement = document.getElementById('telemetry-target');
    this.altitudeElement = document.getElementById('telemetry-altitude');
    this.periodElement = document.getElementById('telemetry-period');
    this.velocityElement = document.getElementById('telemetry-velocity');
    this.sunDistanceElement = document.getElementById('telemetry-sun-distance');
    this.eccentricityElement = document.getElementById('telemetry-eccentricity');
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

    // Saturno está en el origen; el resto de cuerpos usan su posición viva.
    const distanceToCore = target
      ? this.camera.position.distanceTo(target.position)
      : this.camera.position.length();
    const altitudeKm = distanceToCore * this.scaleFactor - body.radius;

    let sunDistanceAu;
    if (targetName === 'Earth') {
      sunDistanceAu = kmToAU(CONSTANTS.EARTH.SUN_DISTANCE_KM);
    } else {
      if (target) {
        this.bodyPositionKm.copy(target.position).multiplyScalar(this.scaleFactor);
      } else {
        this.bodyPositionKm.set(0, 0, 0);
      }
      sunDistanceAu = kmToAU(this.sunPositionKm.distanceTo(this.bodyPositionKm));
    }

    this.targetElement.innerText = t(body.labelKey);
    this.altitudeElement.innerText = `${Math.floor(Math.max(0, altitudeKm)).toLocaleString()} km`;
    this.periodElement.innerText = body.period === null
      ? '—'
      : `${body.period.toLocaleString()} ${t('telemetry.days')}`;
    if (this.velocityElement) {
      this.velocityElement.innerText = body.velocity === null
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
      this.eccentricityElement.innerText = body.eccentricity === null || body.eccentricity === undefined
        ? '—'
        : body.eccentricity.toLocaleString(undefined, {
            minimumFractionDigits: 4,
            maximumFractionDigits: 4
          });
    }
  }
}
