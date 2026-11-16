import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { CameraController } from '../src/core/CameraController.js';

function createController() {
  const camera = {
    fov: 45,
    updateProjectionMatrix() {}
  };
  const controls = {
    enabled: true,
    target: new THREE.Vector3()
  };
  return {
    camera,
    controls,
    controller: new CameraController(camera, controls)
  };
}

const missionSim = {
  activeMission: { name: 'Test mission' },
  getActiveOpticalConfig() {
    return { defaultFov: 12 };
  }
};

describe('CameraController - Instrumento óptico', () => {
  it('debería bloquear la cámara y activar el lente teleobjetivo', () => {
    const { camera, controls, controller } = createController();

    controller.engageInstrumentView(missionSim);

    expect(controller.defaultFov).toBe(45);
    expect(controller.isInstrumentLocked).toBe(true);
    expect(controller.isSurfaceLocked).toBe(false);
    expect(controller.activeLensMode).toBe('NAC');
    expect(controls.enabled).toBe(false);
    expect(controller.currentTarget).toBeNull();

    expect(controller.toggleInstrumentLens()).toBe('WAC');
    expect(controller.activeLensMode).toBe('WAC');

    controller.exitInstrumentView();

    expect(controller.isInstrumentLocked).toBe(false);
    expect(controls.enabled).toBe(true);
    expect(camera.fov).toBe(45);
    expect(controller.activeLensMode).toBe('WAC');
  });
});
