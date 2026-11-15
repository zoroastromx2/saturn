// src/core/TelemetryController.js
import { CONSTANTS, calculateOrbitalVelocity } from '../math/AstroScale.js';
import { t } from './Localization.js';

const UPDATE_INTERVAL = 0.1;

const BODY_DATA = {
  Saturn: {
    radius: CONSTANTS.SATURN.RADIUS_EQUATORIAL,
    period: null,
    velocity: null,
    labelKey: 'body.saturn'
  },
  Earth: {
    radius: CONSTANTS.EARTH.RADIUS_EQUATORIAL,
    period: null,
    velocity: null,
    labelKey: 'body.earth'
  },
  Titan: {
    radius: CONSTANTS.TITAN.RADIUS,
    period: CONSTANTS.TITAN.ORBIT_PERIOD,
    velocity: calculateOrbitalVelocity(
      CONSTANTS.TITAN.ORBIT_SEMI_MAJOR,
      CONSTANTS.TITAN.ORBIT_PERIOD
    ),
    labelKey: 'body.titan'
  },
  Enceladus: {
    radius: CONSTANTS.ENCELADUS.RADIUS,
    period: CONSTANTS.ENCELADUS.ORBIT_PERIOD,
    velocity: calculateOrbitalVelocity(
      CONSTANTS.ENCELADUS.ORBIT_SEMI_MAJOR,
      CONSTANTS.ENCELADUS.ORBIT_PERIOD
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
    labelKey: 'body.mimas'
  }
};

export class TelemetryController {
  constructor(camera, cameraController, scaleFactor) {
    this.camera = camera;
    this.cameraController = cameraController;
    this.scaleFactor = scaleFactor;
    this.accumulatedTime = 0;

    // Cachear los nodos evita lecturas de layout en el bucle de render.
    this.targetElement = document.getElementById('telemetry-target');
    this.altitudeElement = document.getElementById('telemetry-altitude');
    this.periodElement = document.getElementById('telemetry-period');
    this.velocityElement = document.getElementById('telemetry-velocity');
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
  }
}
