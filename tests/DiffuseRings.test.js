import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { DiffuseRingsSimulator } from '../src/core/DiffuseRingsSimulator.js';
import { OUTER_RING_BOUNDS } from '../src/math/AstroScale.js';

function createSimulator() {
  const scene = new THREE.Scene();
  const saturn = {
    eqRadius: 6.0268,
    polRadius: 5.4364,
    sunDirection: new THREE.Vector3(1, 0.35, 0.35).normalize()
  };
  return {
    scene,
    simulator: new DiffuseRingsSimulator(scene, saturn)
  };
}

describe('DiffuseRingsSimulator - Anillos G y E volumétricos', () => {
  it('debería crear el volumen aditivo con renderOrder 2 y los límites exteriores', () => {
    const { scene, simulator } = createSimulator();

    expect(scene.children).toContain(simulator.mesh);
    expect(simulator.mesh).toBeInstanceOf(THREE.Mesh);
    expect(simulator.mesh.renderOrder).toBe(2);
    expect(simulator.mesh.material.transparent).toBe(true);
    expect(simulator.mesh.material.depthWrite).toBe(false);
    expect(simulator.mesh.material.depthTest).toBe(true);
    expect(simulator.mesh.material.side).toBe(THREE.BackSide);
    expect(simulator.mesh.material.blending).toBe(THREE.AdditiveBlending);

    expect(simulator.material.uniforms.uGRingCenter.value).toBe(OUTER_RING_BOUNDS.G_RING_CENTER);
    expect(simulator.material.uniforms.uERingPeak.value).toBe(OUTER_RING_BOUNDS.E_RING_PEAK);
    expect(simulator.material.uniforms.uERingOuter.value).toBe(OUTER_RING_BOUNDS.E_RING_OUTER);
    expect(simulator.material.vertexShader).toContain('vWorldPosition');
    expect(simulator.material.fragmentShader).toContain('const int STEPS = 8;');
    expect(simulator.material.fragmentShader).toContain('phaseHG');
    expect(simulator.material.fragmentShader).toContain('planetshineLight');
    expect(simulator.material.fragmentShader).toContain('uEnceladusPosition');
  });

  it('debería actualizar el tiempo y la posición viva de Encélado', () => {
    const { simulator } = createSimulator();
    const enceladusPosition = new THREE.Vector3(20, 1, -7);

    simulator.update(12.5, enceladusPosition);

    expect(simulator.material.uniforms.uTime.value).toBe(12.5);
    expect(simulator.material.uniforms.uEnceladusPosition.value).toEqual(enceladusPosition);
  });
});
