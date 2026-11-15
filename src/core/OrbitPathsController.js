// src/core/OrbitPathsController.js
import * as THREE from 'three';
import { sampleKeplerianOrbit } from '../math/KeplerOrbit.js';

const DEFAULT_ORBIT_COLOR = 0xb99a5d;
const ACTIVE_ORBIT_COLOR = 0xe8cc8c;
const OVERVIEW_OPACITY = 0.42;
const ACTIVE_OPACITY = 0.92;
const DIMMED_OPACITY = 0.2;

export class OrbitPathsController {
  constructor(moons = []) {
    this.enabled = false;
    this.activeTarget = null;
    this.entries = [];

    moons.forEach((entry) => {
      const simulator = entry?.simulator ?? entry;
      if (!simulator?.orbitalPivot || !simulator?.orbitElements || !simulator?.mesh) {
        return;
      }

      const points = sampleKeplerianOrbit(simulator.orbitElements, entry?.segments ?? 256);
      const positions = new Float32Array(points.length * 3);
      for (let i = 0; i < points.length; i++) {
        const offset = i * 3;
        positions[offset] = points[i].x;
        positions[offset + 1] = 0;
        positions[offset + 2] = points[i].z;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const baseColor = entry?.color ?? DEFAULT_ORBIT_COLOR;
      const material = new THREE.LineBasicMaterial({
        color: baseColor,
        transparent: true,
        opacity: OVERVIEW_OPACITY,
        depthWrite: false
      });

      const line = new THREE.LineLoop(geometry, material);
      line.name = `${simulator.mesh.name || 'Moon'}OrbitPath`;
      line.visible = false;
      line.frustumCulled = false;

      simulator.orbitalPivot.add(line);
      this.entries.push({
        mesh: simulator.mesh,
        orbitalPivot: simulator.orbitalPivot,
        line,
        geometry,
        material,
        baseColor
      });
    });

    this.refreshStyles();
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    this.entries.forEach(({ line }) => {
      line.visible = this.enabled;
    });
    this.refreshStyles();
  }

  setActiveTarget(targetMesh) {
    if (this.activeTarget === targetMesh) return;
    this.activeTarget = targetMesh || null;
    this.refreshStyles();
  }

  refreshStyles() {
    const hasMoonSelection = this.entries.some((entry) => entry.mesh === this.activeTarget);

    this.entries.forEach((entry) => {
      const isSelected = hasMoonSelection && entry.mesh === this.activeTarget;
      entry.material.color.setHex(isSelected ? ACTIVE_ORBIT_COLOR : entry.baseColor);
      entry.material.opacity = !hasMoonSelection
        ? OVERVIEW_OPACITY
        : isSelected
          ? ACTIVE_OPACITY
          : DIMMED_OPACITY;
    });
  }

  dispose() {
    this.entries.forEach(({ orbitalPivot, line, geometry, material }) => {
      if (orbitalPivot?.remove) {
        orbitalPivot.remove(line);
      }
      geometry.dispose();
      material.dispose();
    });
    this.entries.length = 0;
  }
}
