import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { SolarLensFlare } from '../src/core/SolarLensFlare.js';

function createSaturn() {
  return {
    eqRadius: 6.0268,
    polRadius: 5.4364,
    ringInner: 7.45,
    ringOuter: 13.6775,
    moonShadowPositions: Array.from({ length: 6 }, () => new THREE.Vector3(1000, 1000, 1000)),
    moonShadowRadii: new Float32Array(6).fill(0.01),
    sunDirection: new THREE.Vector3(1, 0, 0)
  };
}

function createFlare() {
  const scene = new THREE.Scene();
  const saturn = createSaturn();
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000000);
  camera.position.set(0, 0, 20);
  camera.lookAt(1, 0, 20);
  const flare = new SolarLensFlare(scene, saturn, camera, null);
  return { scene, saturn, camera, flare };
}

describe('SolarLensFlare - visibilidad solar analítica', () => {
  it('debería ocultar el flare cuando el Sol queda detrás de la cámara', () => {
    const { camera, flare } = createFlare();
    camera.lookAt(0, 0, 0);

    expect(flare.computeSolarVisibility(camera.position, new THREE.Vector3(1, 0, 0), [], null)).toBe(0);
  });

  it('debería bloquear el disco solar con Saturno y conservar el limbo atmosférico', () => {
    const { camera, flare } = createFlare();

    camera.position.set(-20, 0, 0);
    camera.lookAt(0, 0, 0);
    expect(flare.computeSolarVisibility(camera.position, new THREE.Vector3(1, 0, 0), [], null)).toBe(0);

    camera.position.set(-20, 0, 5.9);
    camera.lookAt(0, 0, 5.9);
    expect(flare.computeSolarVisibility(camera.position, new THREE.Vector3(1, 0, 0), [], null)).toBe(0);

    camera.position.set(-20, 0, 6.2);
    camera.lookAt(0, 0, 6.2);
    const limbVisibility = flare.computeSolarVisibility(
      camera.position,
      new THREE.Vector3(1, 0, 0),
      [],
      null
    );
    expect(limbVisibility).toBeCloseTo(1, 5);
    expect(flare.limbFlareBoost).toBeGreaterThan(1);
    expect(flare.limbFlareBoost).toBeLessThanOrEqual(2.2);
  });

  it('debería aplicar la penumbra finita de una luna', () => {
    const { camera, flare } = createFlare();
    const moonOnRay = [{ position: new THREE.Vector3(5, 0, 20), radius: 1 }];

    expect(flare.computeSolarVisibility(
      camera.position,
      new THREE.Vector3(1, 0, 0),
      moonOnRay,
      null
    )).toBe(0);

    const moonOffRay = [{ position: new THREE.Vector3(5, 1.2, 20), radius: 1 }];
    expect(flare.computeSolarVisibility(
      camera.position,
      new THREE.Vector3(1, 0, 0),
      moonOffRay,
      null
    )).toBeCloseTo(1, 5);
  });

  it('debería modular la visibilidad con la opacidad radial de los anillos', () => {
    const { camera, flare } = createFlare();
    camera.position.set(10, 5, 0);
    camera.lookAt(10, 4, 0);

    const opaqueRing = {
      samples: new Float32Array([1]),
      inner: 7.45,
      outer: 13.6775
    };
    const openRing = {
      samples: new Float32Array([0]),
      inner: 7.45,
      outer: 13.6775
    };

    expect(flare.computeSolarVisibility(
      camera.position,
      new THREE.Vector3(0, -1, 0),
      [],
      opaqueRing
    )).toBe(0);
    expect(flare.computeSolarVisibility(
      camera.position,
      new THREE.Vector3(0, -1, 0),
      [],
      openRing
    )).toBeCloseTo(1, 5);
  });

  it('debería crear el starburst, el streak anamórfico y cuatro ghosts', () => {
    const { scene, flare } = createFlare();

    expect(flare.group.parent).toBe(scene);
    expect(flare.coreTexture).toBeInstanceOf(THREE.DataTexture);
    expect(flare.streakTexture).toBeInstanceOf(THREE.DataTexture);
    expect(flare.ghostTexture).toBeInstanceOf(THREE.DataTexture);
    expect(flare.group.children).toHaveLength(6);
    expect(flare.ghosts).toHaveLength(4);
  });

  it('debería mostrar el flare y reducir el perfil en modo instrumento', () => {
    const { camera, flare } = createFlare();
    const sunDirection = new THREE.Vector3(1, 0, 0);

    flare.update(camera, sunDirection, [], { instrumentLocked: false });
    expect(flare.group.visible).toBe(true);
    expect(flare.coreSprite.material.opacity).toBeGreaterThan(0);
    const freeStreakWidth = flare.streakSprite.scale.x;

    flare.update(camera, sunDirection, [], { instrumentLocked: true });
    expect(flare.group.visible).toBe(true);
    expect(flare.streakSprite.scale.x).toBeLessThan(freeStreakWidth);
    expect(flare.ghosts[0].sprite.material.opacity).toBeGreaterThan(0);
  });
});
