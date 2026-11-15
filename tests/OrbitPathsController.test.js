import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { OrbitPathsController } from '../src/core/OrbitPathsController';

function createMockMoon(name, semiMajorAxis, eccentricity = 0.02) {
  const orbitalPivot = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 8), new THREE.MeshBasicMaterial());
  mesh.name = name;
  orbitalPivot.add(mesh);

  return {
    orbitalPivot,
    mesh,
    orbitElements: {
      semiMajorAxis,
      periodDays: 10,
      eccentricity,
      meanAnomalyEpoch: 0
    }
  };
}

describe('OrbitPathsController', () => {
  it('crea órbitas LineLoop ocultas dentro de cada orbitalPivot', () => {
    const titan = createMockMoon('Titan', 100, 0.0288);
    const mimas = createMockMoon('Mimas', 20, 0.0196);
    const controller = new OrbitPathsController([titan, mimas]);

    expect(controller.entries).toHaveLength(2);
    controller.entries.forEach((entry) => {
      expect(entry.line).toBeInstanceOf(THREE.LineLoop);
      expect(entry.line.visible).toBe(false);
      expect(entry.orbitalPivot.children).toContain(entry.line);
      expect(entry.geometry.getAttribute('position').count).toBe(256);
    });

    controller.dispose();
  });

  it('alterna la visibilidad de todas las órbitas con setEnabled', () => {
    const titan = createMockMoon('Titan', 100);
    const enceladus = createMockMoon('Enceladus', 30);
    const controller = new OrbitPathsController([titan, enceladus]);

    controller.setEnabled(true);
    expect(controller.enabled).toBe(true);
    expect(controller.entries.every((e) => e.line.visible)).toBe(true);

    controller.setEnabled(false);
    expect(controller.enabled).toBe(false);
    expect(controller.entries.every((e) => !e.line.visible)).toBe(true);

    controller.dispose();
  });

  it('resalta la luna seleccionada, atenúa las demás y vuelve a vista general para Saturno o null', () => {
    const titan = createMockMoon('Titan', 100);
    const enceladus = createMockMoon('Enceladus', 30);
    const saturnMesh = new THREE.Mesh();
    const controller = new OrbitPathsController([titan, enceladus]);

    controller.setEnabled(true);
    controller.setActiveTarget(titan.mesh);

    const titanEntry = controller.entries[0];
    const enceladusEntry = controller.entries[1];
    expect(titanEntry.material.opacity).toBeCloseTo(0.92, 5);
    expect(titanEntry.material.color.getHex()).toBe(0xe8cc8c);
    expect(enceladusEntry.material.opacity).toBeCloseTo(0.2, 5);
    expect(enceladusEntry.material.color.getHex()).toBe(0xb99a5d);

    controller.setActiveTarget(saturnMesh);
    expect(titanEntry.material.opacity).toBeCloseTo(0.42, 5);
    expect(enceladusEntry.material.opacity).toBeCloseTo(0.42, 5);
    expect(titanEntry.material.color.getHex()).toBe(0xb99a5d);

    controller.dispose();
  });

  it('limpia las líneas de sus pivotes al llamar dispose', () => {
    const titan = createMockMoon('Titan', 100);
    const controller = new OrbitPathsController([titan]);
    const orbitLine = controller.entries[0].line;

    expect(titan.orbitalPivot.children).toContain(orbitLine);
    controller.dispose();
    expect(titan.orbitalPivot.children).not.toContain(orbitLine);
    expect(controller.entries).toHaveLength(0);
  });
});
