// src/core/MinorMoonsSimulator.js
import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

const MINOR_MOON_COUNT = 135;

export class MinorMoonsSimulator {
  constructor(scene, moonsData) {
    const geometry = new THREE.IcosahedronGeometry(1, 0);
    const material = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 1.0 });

    this.mesh = new THREE.InstancedMesh(geometry, material, MINOR_MOON_COUNT);
    this.mesh.frustumCulled = false;
    this.mesh.name = 'MinorIrregularMoons';

    this.flagshipData = [
      {
        name: 'Phoebe',
        group: 'Grupo Nórdico',
        a: 23.5,
        e: 0.156,
        i: THREE.MathUtils.degToRad(175.2),
        lan: 2.35,
        argP: 4.18,
        maEpoch: 0.72,
        n: 0.38
      },
      {
        name: 'Albiorix',
        group: 'Grupo Galo',
        a: 29.4,
        e: 0.477,
        i: THREE.MathUtils.degToRad(34.0),
        lan: 0.95,
        argP: 2.75,
        maEpoch: 3.2,
        n: 0.31
      },
      {
        name: 'Kiviuq',
        group: 'Grupo Inuit',
        a: 20.16,
        e: 0.328,
        i: THREE.MathUtils.degToRad(45.7),
        lan: 5.1,
        argP: 1.35,
        maEpoch: 5.4,
        n: 0.55
      }
    ];

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

      shader.vertexShader =
        `
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

    this.groupLabels = [];
    this.flagshipData.forEach((flagship) => {
      const div = document.createElement('div');
      div.className = 'celestial-label minor-group-label';
      div.textContent = flagship.group;

      const labelObj = new CSS2DObject(div);
      labelObj.visible = false;
      this.mesh.add(labelObj);
      this.groupLabels.push({ obj: labelObj, data: flagship });
    });

    scene.add(this.mesh);
  }

  update(daysSinceEpoch) {
    this.mesh.material.userData.uDaysSinceEpoch.value = daysSinceEpoch;

    this.groupLabels.forEach(({ obj, data }) => {
      const { a, e, i, lan, argP, maEpoch, n } = data;

      const M = maEpoch + n * daysSinceEpoch;
      const E = M + e * Math.sin(M);

      const xOrbit = a * (Math.cos(E) - e);
      const zOrbit = a * (Math.sqrt(1.0 - e * e) * Math.sin(E));

      const cosW = Math.cos(argP);
      const sinW = Math.sin(argP);
      const x1 = xOrbit * cosW - zOrbit * sinW;
      const z1 = xOrbit * sinW + zOrbit * cosW;

      const cosI = Math.cos(i);
      const sinI = Math.sin(i);
      const y2 = z1 * sinI;
      const z2 = z1 * cosI;

      const cosO = Math.cos(lan);
      const sinO = Math.sin(lan);
      const finalX = x1 * cosO - z2 * sinO;
      const finalZ = x1 * sinO + z2 * cosO;

      obj.position.set(finalX, y2, finalZ);
    });
  }

  setLabelsVisible(visible) {
    this.groupLabels.forEach(({ obj }) => {
      obj.visible = Boolean(visible);
    });
  }
}
