import * as THREE from 'three';
import { CONSTANTS, toWebGLUnits } from '../math/AstroScale.js';
import { random } from './Random.js';

const ASTEROID_COUNT = 15000;
const ASTEROID_RADIUS_KM = 180;
const KEPLERIAN_SPEED_FACTOR = 2.4;

export class FRingSimulator {
  constructor(scene, saturnSimulator, scaleFactor) {
    this.ringRadius = toWebGLUnits(CONSTANTS.SATURN.F_RING_RADIUS, scaleFactor);
    this.radialSpread = toWebGLUnits(CONSTANTS.SATURN.F_RING_WIDTH, scaleFactor) * 0.5;
    this.rockRadius = toWebGLUnits(ASTEROID_RADIUS_KM, scaleFactor);

    const geometry = new THREE.IcosahedronGeometry(this.rockRadius, 0);
    const positions = geometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      const hash = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
      const noise = 0.66 + 0.58 * (hash - Math.floor(hash));

      positions.setXYZ(i, x * noise, y * noise, z * noise);
    }

    positions.needsUpdate = true;
    geometry.computeVertexNormals();

    const orbitRadii = new Float32Array(ASTEROID_COUNT);
    const phases = new Float32Array(ASTEROID_COUNT);
    const speeds = new Float32Array(ASTEROID_COUNT);
    const scales = new Float32Array(ASTEROID_COUNT * 3);

    for (let i = 0; i < ASTEROID_COUNT; i++) {
      const radius = this.ringRadius + (random() - 0.5) * this.radialSpread * 2.0;
      orbitRadii[i] = radius;
      phases[i] = random() * Math.PI * 2.0;
      speeds[i] = KEPLERIAN_SPEED_FACTOR / Math.pow(radius, 1.5);

      const offset = i * 3;
      scales[offset] = 0.55 + random();
      scales[offset + 1] = 0.55 + random();
      scales[offset + 2] = 0.55 + random();
    }

    geometry.setAttribute('aOrbitRadius', new THREE.InstancedBufferAttribute(orbitRadii, 1));
    geometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));
    geometry.setAttribute('aSpeed', new THREE.InstancedBufferAttribute(speeds, 1));
    geometry.setAttribute('aScale', new THREE.InstancedBufferAttribute(scales, 3));

    const material = new THREE.MeshStandardMaterial({
      color: 0x968a79,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true
    });

    this.uniforms = { uTime: { value: 0 } };
    material.userData.uniforms = this.uniforms;

    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = material.userData.uniforms.uTime;

      shader.vertexShader =
        `
        uniform float uTime;
        attribute float aOrbitRadius;
        attribute float aPhase;
        attribute float aSpeed;
        attribute vec3 aScale;
      ` + shader.vertexShader;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        vec3 transformed = vec3(position) * aScale;
        float currentAngle = aPhase + (uTime * aSpeed);

        transformed.x += cos(currentAngle) * aOrbitRadius;
        transformed.z += sin(currentAngle) * aOrbitRadius;
        `
      );
    };

    this.material = material;
    this.mesh = new THREE.InstancedMesh(geometry, material, ASTEROID_COUNT);
    this.mesh.name = 'FRingAsteroids';
    this.mesh.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(0, 0, 0),
      this.ringRadius + this.radialSpread + this.rockRadius * 2.0
    );
    scene.add(this.mesh);
  }

  update(orbitalTime) {
    this.uniforms.uTime.value = orbitalTime;
  }
}
