import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { SaturnSimulator } from '../src/core/SaturnSimulator.js';

globalThis.document = {
  createElement: () => ({
    className: '',
    textContent: '',
    style: {},
    dataset: {},
    setAttribute() {},
    addEventListener() {},
    remove() {}
  })
};

const SATURN_UNIFORMS = [
  'uEqRadius',
  'uPolRadius',
  'uRingInnerRadius',
  'uRingOuterRadius',
  'uSunDirection',
  'uSaturnTexture',
  'uRingAlphaTex',
  'uTime',
  'uAuroraIntensity',
  'uStormIntensity',
  'uMoonsPosition',
  'uMoonsRadius'
];

const RING_UNIFORMS = [
  'uEqRadius',
  'uPolRadius',
  'uInnerRadius',
  'uOuterRadius',
  'uERingInnerRadius',
  'uERingOuterRadius',
  'uEnceladusOrbitRadius',
  'uERingThickness',
  'uSunDirection',
  'uRingTexture',
  'uRingAlphaTex',
  'uEnceladusPosition',
  'uTime',
  'uMoonsPosition',
  'uMoonsRadius'
];

function createSaturn() {
  const scene = new THREE.Scene();
  return { scene, simulator: new SaturnSimulator(scene, {}) };
}

describe('SaturnSimulator - geometría y materiales', () => {
  it('crea las mallas de Saturno y los anillos con sus nombres', () => {
    const { scene, simulator } = createSaturn();

    expect(scene.children).toContain(simulator.saturnMesh);
    expect(scene.children).toContain(simulator.ringsMesh);
    expect(simulator.saturnMesh.name).toBe('Saturn');
    expect(simulator.ringsMesh.name).toBe('Rings');
  });

  it('deforma la esfera con el achatamiento real (ecuatorial ≠ polar)', () => {
    const { simulator } = createSaturn();
    simulator.saturnMesh.geometry.computeBoundingBox();
    const size = simulator.saturnMesh.geometry.boundingBox.getSize(new THREE.Vector3());

    expect(size.x).toBeCloseTo(simulator.eqRadius * 2, 2);
    expect(size.z).toBeCloseTo(simulator.eqRadius * 2, 2);
    expect(size.y).toBeCloseTo(simulator.polRadius * 2, 2);
    expect(size.y).toBeLessThan(size.x);
  });

  it('escala radios y anillos con el factor de 10.000 km por unidad', () => {
    const { simulator } = createSaturn();

    expect(simulator.scaleFactor).toBe(10000);
    expect(simulator.eqRadius).toBeCloseTo(6.0268, 4);
    expect(simulator.polRadius).toBeCloseTo(5.4364, 4);
    expect(simulator.ringInner).toBeCloseTo(7.45, 4);
    expect(simulator.ringOuter).toBeCloseTo(13.6775, 4);
  });

  it('cablea todos los uniforms del planeta', () => {
    const { simulator } = createSaturn();
    const uniforms = simulator.saturnMesh.material.uniforms;

    expect(Object.keys(uniforms).sort()).toEqual([...SATURN_UNIFORMS].sort());
    expect(uniforms.uEqRadius.value).toBe(simulator.eqRadius);
    expect(uniforms.uPolRadius.value).toBe(simulator.polRadius);
    expect(uniforms.uRingInnerRadius.value).toBe(simulator.ringInner);
    expect(uniforms.uRingOuterRadius.value).toBe(simulator.ringOuter);
    expect(uniforms.uSunDirection.value).toBe(simulator.sunDirection);
    expect(uniforms.uMoonsPosition.value).toBe(simulator.moonShadowPositions);
    expect(uniforms.uMoonsRadius.value).toBe(simulator.moonShadowRadii);
  });

  it('cablea todos los uniforms de los anillos', () => {
    const { simulator } = createSaturn();
    const uniforms = simulator.ringsMesh.material.uniforms;

    expect(Object.keys(uniforms).sort()).toEqual([...RING_UNIFORMS].sort());
    expect(uniforms.uInnerRadius.value).toBe(simulator.ringInner);
    expect(uniforms.uOuterRadius.value).toBe(simulator.ringOuter);
    expect(uniforms.uERingInnerRadius.value).toBe(simulator.eRingInner);
    expect(uniforms.uERingOuterRadius.value).toBe(simulator.eRingOuter);
    expect(uniforms.uEnceladusOrbitRadius.value).toBe(simulator.enceladusOrbit);
    expect(uniforms.uERingThickness.value).toBeGreaterThan(0);
  });
});

describe('SaturnSimulator - sombras de lunas', () => {
  it('registra hasta seis lunas y escribe su radio', () => {
    const { simulator } = createSaturn();

    const index = simulator.registerShadowMoon(0.5);

    expect(index).toBe(0);
    expect(simulator.moonShadowRadii[0]).toBe(0.5);
    expect(simulator.moonShadowPositions).toHaveLength(6);
  });

  it('reparte índices consecutivos y falla al superar las seis ranuras', () => {
    const { simulator } = createSaturn();
    const indices = Array.from({ length: 6 }, (_, i) => simulator.registerShadowMoon(i + 1));

    expect(indices).toEqual([0, 1, 2, 3, 4, 5]);
    expect(() => simulator.registerShadowMoon(9)).toThrow(/ranuras/i);
  });

  it('no crea audio sin listener', () => {
    const { simulator } = createSaturn();
    expect(simulator.ambientSound).toBeNull();
  });
});
