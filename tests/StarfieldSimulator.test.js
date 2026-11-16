import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { StarfieldSimulator } from '../src/core/StarfieldSimulator.js';

function createMap() {
  const map = new THREE.DataTexture(new Uint8Array([20, 30, 40, 255]), 1, 1, THREE.RGBAFormat);
  map.needsUpdate = true;
  return map;
}

describe('StarfieldSimulator - Cielo galáctico HDR', () => {
  it('debería construir la esfera celeste, el shader y la orientación galáctica', () => {
    const scene = new THREE.Scene();
    const map = createMap();
    const starfield = new StarfieldSimulator(scene, map, 8);

    expect(starfield.mesh).toBeInstanceOf(THREE.Mesh);
    expect(starfield.mesh.geometry).toBeInstanceOf(THREE.SphereGeometry);
    expect(starfield.mesh.geometry.parameters.radius).toBe(1);
    expect(starfield.mesh.geometry.parameters.widthSegments).toBe(64);
    expect(starfield.mesh.geometry.parameters.heightSegments).toBe(32);
    expect(starfield.mesh.material).toBeInstanceOf(THREE.ShaderMaterial);
    expect(starfield.mesh.material.side).toBe(THREE.BackSide);
    expect(starfield.mesh.material.depthWrite).toBe(false);
    expect(starfield.mesh.material.depthTest).toBe(false);
    expect(starfield.mesh.material.toneMapped).toBe(false);
    expect(starfield.mesh.frustumCulled).toBe(false);
    expect(starfield.mesh.renderOrder).toBe(-1000);
    expect(starfield.mesh.parent).toBe(scene);

    expect(starfield.mesh.rotation.x).toBeCloseTo(THREE.MathUtils.degToRad(62.87));
    expect(starfield.mesh.rotation.y).toBeCloseTo(THREE.MathUtils.degToRad(282.85));
    expect(starfield.mesh.rotation.z).toBeCloseTo(THREE.MathUtils.degToRad(-26.73));
    expect(starfield.mesh.rotation.order).toBe('YXZ');

    expect(map.colorSpace).toBe(THREE.LinearSRGBColorSpace);
    expect(map.minFilter).toBe(THREE.LinearFilter);
    expect(map.magFilter).toBe(THREE.LinearFilter);
    expect(map.anisotropy).toBe(8);
    expect(starfield.uniforms.tGalacticMap.value).toBe(map);
    expect(starfield.uniforms.uExposure).toBeTruthy();
    expect(starfield.uniforms.uFovScale).toBeTruthy();
    expect(starfield.mesh.material.fragmentShader).toContain('starLayer');
    expect(starfield.mesh.material.fragmentShader).toContain('0.995');
  });

  it('debería fijar la esfera a la cámara y ajustar el FOV del instrumento', () => {
    const scene = new THREE.Scene();
    const starfield = new StarfieldSimulator(scene, createMap(), 4);
    const camera = new THREE.PerspectiveCamera(10, 16 / 9, 0.1, 1000000);
    camera.position.set(12, -4, 8);
    camera.lookAt(camera.position.clone().add(new THREE.Vector3(1, 0.35, 0.35)));

    starfield.update(camera, new THREE.Vector3(1, 0.35, 0.35), 0);

    expect(starfield.mesh.position.distanceTo(camera.position)).toBeLessThan(1e-6);
    expect(starfield.mesh.scale.x).toBeCloseTo(camera.far * 0.9);
    expect(starfield.uniforms.uFovScale.value).toBeCloseTo(0.2);
  });

  it('debería cerrar la exposición bajo deslumbramiento y abrirla en eclipse', () => {
    const scene = new THREE.Scene();
    const starfield = new StarfieldSimulator(scene, createMap(), 4);
    const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000000);
    const sunDirection = new THREE.Vector3(1, 0.35, 0.35).normalize();
    camera.lookAt(sunDirection);

    for (let i = 0; i < 120; i++) {
      starfield.update(camera, sunDirection, 1);
    }
    expect(starfield.uniforms.uExposure.value).toBeLessThan(0.5);

    for (let i = 0; i < 160; i++) {
      starfield.update(camera, sunDirection, 0);
    }
    expect(starfield.uniforms.uExposure.value).toBeGreaterThan(1.0);
  });
});
