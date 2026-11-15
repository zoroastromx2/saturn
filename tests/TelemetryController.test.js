import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { TelemetryController, formatSimulatedDate } from '../src/core/TelemetryController';

describe('TelemetryController - Fecha simulada y telemetría', () => {
  const originalDocument = globalThis.document;
  let elements;

  beforeEach(() => {
    elements = {
      'telemetry-target': { innerText: '' },
      'telemetry-sim-date': { innerText: '' },
      'telemetry-altitude': { innerText: '' },
      'telemetry-period': { innerText: '' },
      'telemetry-velocity': { innerText: '' },
      'telemetry-sun-distance': { innerText: '' },
      'telemetry-eccentricity': { innerText: '' },
      'telemetry-apoapsis': { innerText: '' },
      'telemetry-periapsis': { innerText: '' }
    };
    globalThis.document = {
      getElementById: (id) => elements[id] || null
    };
  });

  afterEach(() => {
    globalThis.document = originalDocument;
  });

  it('formatea fechas simuladas válidas en formato UTC estable y devuelve — si es inválida', () => {
    const sample = new Date(Date.UTC(2026, 10, 15, 4, 5, 9));
    expect(formatSimulatedDate(sample)).toBe('2026-11-15 04:05:09 UTC');
    expect(formatSimulatedDate(null)).toBe('—');
    expect(formatSimulatedDate(new Date('invalid'))).toBe('—');
  });

  it('actualiza #telemetry-sim-date en tiempo real al avanzar simulationDate', () => {
    const simDate = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 0, 10);
    const cameraController = { currentTarget: null };

    const controller = new TelemetryController(
      camera,
      cameraController,
      12000,
      new THREE.Vector3(1, 0, 0),
      () => simDate
    );

    controller.refresh();
    expect(elements['telemetry-sim-date'].innerText).toBe('2026-01-01 00:00:00 UTC');

    simDate.setTime(simDate.getTime() + 65000);
    controller.update(0.05);
    expect(elements['telemetry-sim-date'].innerText).toBe('2026-01-01 00:00:00 UTC');

    controller.update(0.06);
    expect(elements['telemetry-sim-date'].innerText).toBe('2026-01-01 00:01:05 UTC');
  });
});
