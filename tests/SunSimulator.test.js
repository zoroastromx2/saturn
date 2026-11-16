import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { SunSimulator } from '../src/core/SunSimulator.js';

describe('SunSimulator - Sol HDR de paralaje infinito', () => {
  it('debería construir una esfera HDR emisiva y sin frustum culling', () => {
    const sun = new SunSimulator();

    expect(sun.mesh).toBeInstanceOf(THREE.Mesh);
    expect(sun.mesh.geometry).toBeInstanceOf(THREE.SphereGeometry);
    expect(sun.mesh.geometry.parameters.radius).toBe(1);
    expect(sun.mesh.geometry.parameters.widthSegments).toBe(32);
    expect(sun.mesh.geometry.parameters.heightSegments).toBe(32);
    expect(sun.mesh.material).toBeInstanceOf(THREE.MeshBasicMaterial);
    expect(sun.mesh.material.toneMapped).toBe(false);
    expect(sun.mesh.material.color.r).toBeCloseTo(15.0);
    expect(sun.mesh.material.color.g).toBeCloseTo(14.5);
    expect(sun.mesh.material.color.b).toBeCloseTo(13.5);
    expect(sun.mesh.frustumCulled).toBe(false);
  });

  it('debería anclarse al 95% del far plane y escalar según la distancia', () => {
    const sun = new SunSimulator();
    const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000000);
    camera.position.set(10, -4, 8);
    const direction = new THREE.Vector3(1, 0.35, 0.35).normalize();

    sun.update(camera, direction);

    const distance = camera.far * 0.95;
    const expectedPosition = camera.position.clone().addScaledVector(direction, distance);
    expect(sun.mesh.visible).toBe(true);
    expect(sun.mesh.position.distanceTo(expectedPosition)).toBeLessThan(1e-5);
    expect(sun.mesh.scale.x).toBeCloseTo(distance * 0.002);
    expect(sun.mesh.scale.y).toBeCloseTo(distance * 0.002);
    expect(sun.mesh.scale.z).toBeCloseTo(distance * 0.002);
  });

  it('debería mantener el Sol estático en pantalla al desplazar lateralmente la cámara', () => {
    const sun = new SunSimulator();
    const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000000);
    camera.position.set(-35, 8, -35);
    camera.lookAt(-15, 14, -15);
    camera.updateMatrixWorld(true);
    const direction = new THREE.Vector3(1, 0.35, 0.35).normalize();

    sun.update(camera, direction);
    const firstNdc = sun.mesh.position.clone().project(camera);

    const pan = new THREE.Vector3(20, 0, 0);
    camera.position.add(pan);
    camera.updateMatrixWorld(true);
    sun.update(camera, direction);
    const secondNdc = sun.mesh.position.clone().project(camera);

    expect(secondNdc.x).toBeCloseTo(firstNdc.x, 5);
    expect(secondNdc.y).toBeCloseTo(firstNdc.y, 5);
  });
});
