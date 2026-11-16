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
  activeMission: { name: 'Test mission', opticsMode: 2 },
  getActiveOpticalConfig() {
    return { defaultFov: 12 };
  }
};

describe('CameraController - Instrumento óptico', () => {
  it('debería bloquear la cámara y activar el lente teleobjetivo', () => {
    const { camera, controls, controller } = createController();
    const opticsPass = { uniforms: { uOpticsMode: { value: 0 } } };
    controller.setOpticsPass(opticsPass);

    controller.engageInstrumentView(missionSim);

    expect(controller.defaultFov).toBe(45);
    expect(controller.isInstrumentLocked).toBe(true);
    expect(controller.isSurfaceLocked).toBe(false);
    expect(controller.activeLensMode).toBe('NAC');
    expect(controls.enabled).toBe(false);
    expect(controller.currentTarget).toBeNull();
    expect(opticsPass.uniforms.uOpticsMode.value).toBe(2);

    expect(controller.toggleOpticsEmulation()).toBe(false);
    expect(opticsPass.uniforms.uOpticsMode.value).toBe(0);
    expect(controller.toggleOpticsEmulation()).toBe(true);
    expect(opticsPass.uniforms.uOpticsMode.value).toBe(2);

    expect(controller.toggleInstrumentLens()).toBe('WAC');
    expect(controller.activeLensMode).toBe('WAC');

    controller.exitInstrumentView();

    expect(controller.isInstrumentLocked).toBe(false);
    expect(controls.enabled).toBe(true);
    expect(camera.fov).toBe(45);
    expect(controller.activeLensMode).toBe('WAC');
    expect(opticsPass.uniforms.uOpticsMode.value).toBe(0);
  });

  it('con movimiento reducido, el foco llega al destino sin transición', async () => {
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    const controls = { enabled: true, target: new THREE.Vector3(), update() {} };
    const controller = new CameraController(camera, controls, { reducedMotion: true });
    const target = new THREE.Object3D();

    controller.focusOnObject(target, 10);
    await new Promise((resolve) => setTimeout(resolve, 80));

    expect(controller.reducedMotion).toBe(true);
    expect(camera.position.length()).toBeCloseTo(10, 3);
  });
});
