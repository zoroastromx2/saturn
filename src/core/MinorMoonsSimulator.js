// src/core/MinorMoonsSimulator.js
import * as THREE from 'three';

const MINOR_MOON_COUNT = 135;

export class MinorMoonsSimulator {
  constructor(scene, moonsData) {
    const geometry = new THREE.IcosahedronGeometry(1, 0);
    const material = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 1.0 });

    this.mesh = new THREE.InstancedMesh(geometry, material, MINOR_MOON_COUNT);
    this.mesh.frustumCulled = false;
    this.mesh.name = 'MinorIrregularMoons';

    const aAxis = new Float32Array(MINOR_MOON_COUNT);
    const aEcc = new Float32Array(MINOR_MOON_COUNT);
    const aInc = new Float32Array(MINOR_MOON_COUNT);
    const aLan = new Float32Array(MINOR_MOON_COUNT);
    const aArgP = new Float32Array(MINOR_MOON_COUNT);
    const aMaEpoch = new Float32Array(MINOR_MOON_COUNT);
    const aMeanMotion = new Float32Array(MINOR_MOON_COUNT);
    const aRadius = new Float32Array(MINOR_MOON_COUNT);

    for (let i = 0; i < MINOR_MOON_COUNT; i++) {
      const moon = moonsData[i];
      aAxis[i] = moon.a;
      aEcc[i] = moon.e;
      aInc[i] = moon.i;
      aLan[i] = moon.lan;
      aArgP[i] = moon.argP;
      aMaEpoch[i] = moon.maEpoch;
      aMeanMotion[i] = moon.n;
      aRadius[i] = moon.radius;
    }

    geometry.setAttribute('aAxis', new THREE.InstancedBufferAttribute(aAxis, 1));
    geometry.setAttribute('aEcc', new THREE.InstancedBufferAttribute(aEcc, 1));
    geometry.setAttribute('aInc', new THREE.InstancedBufferAttribute(aInc, 1));
    geometry.setAttribute('aLan', new THREE.InstancedBufferAttribute(aLan, 1));
    geometry.setAttribute('aArgP', new THREE.InstancedBufferAttribute(aArgP, 1));
    geometry.setAttribute('aMaEpoch', new THREE.InstancedBufferAttribute(aMaEpoch, 1));
    geometry.setAttribute('aMeanMotion', new THREE.InstancedBufferAttribute(aMeanMotion, 1));
    geometry.setAttribute('aRadius', new THREE.InstancedBufferAttribute(aRadius, 1));

    material.userData = { uDaysSinceEpoch: { value: 0 } };
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uDaysSinceEpoch = material.userData.uDaysSinceEpoch;

      shader.vertexShader = `
        uniform float uDaysSinceEpoch;
        attribute float aAxis; attribute float aEcc; attribute float aInc;
        attribute float aLan; attribute float aArgP; attribute float aMaEpoch;
        attribute float aMeanMotion; attribute float aRadius;
      ` + shader.vertexShader;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        // 1. Scale the base geometry
        vec3 transformed = vec3(position) * aRadius;

        // 2. Calculate Mean Anomaly
        float M = aMaEpoch + (aMeanMotion * uDaysSinceEpoch);

        // 3. Approximate Eccentric Anomaly (First-order for performance)
        float E = M + aEcc * sin(M);

        // 4. True Anomaly and Distance (Orbital Plane Coordinates)
        float xOrbit = aAxis * (cos(E) - aEcc);
        float zOrbit = aAxis * (sqrt(1.0 - aEcc * aEcc) * sin(E));

        // 5. Apply 3D Rotations (Arg of Periapsis, Inclination, LAN)
        // Rotation by ArgP (Y-axis in 2D plane mapping)
        float cosW = cos(aArgP); float sinW = sin(aArgP);
        float x1 = xOrbit * cosW - zOrbit * sinW;
        float z1 = xOrbit * sinW + zOrbit * cosW;

        // Rotation by Inclination (X-axis tilt)
        float cosI = cos(aInc); float sinI = sin(aInc);
        float y2 = z1 * sinI;
        float z2 = z1 * cosI;

        // Rotation by LAN (Y-axis final orientation)
        float cosO = cos(aLan); float sinO = sin(aLan);
        float finalX = x1 * cosO - z2 * sinO;
        float finalZ = x1 * sinO + z2 * cosO;

        // Apply to vertex
        transformed.x += finalX;
        transformed.y += y2;
        transformed.z += finalZ;
        `
      );
    };

    scene.add(this.mesh);
  }

  update(daysSinceEpoch) {
    this.mesh.material.userData.uDaysSinceEpoch.value = daysSinceEpoch;
  }
}
