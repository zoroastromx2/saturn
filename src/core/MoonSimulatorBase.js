import * as THREE from 'three';
import { toWebGLUnits } from '../math/AstroScale.js';
import { calculateKeplerianPosition } from '../math/KeplerOrbit.js';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import moonVert from '../shaders/moon.vert';
import moonFrag from '../shaders/moon.frag';
import { WHITE_TEXTURE, FLAT_NORMAL_TEXTURE } from './MoonTextures.js';

const DEG_TO_RAD = Math.PI / 180;

export class MoonSimulatorBase {
  constructor(scene, saturnSimulator, scaleFactor, config) {
    this.radius = toWebGLUnits(config.radiusKm, scaleFactor);
    this.orbitDistance = toWebGLUnits(config.orbitSemiMajorKm, scaleFactor);
    this.orbitPeriod = config.orbitPeriod;
    this.orbitElements = {
      semiMajorAxis: this.orbitDistance,
      periodDays: this.orbitPeriod,
      eccentricity: config.eccentricity ?? 0,
      meanAnomalyEpoch: (config.meanAnomalyEpoch ?? 0) * DEG_TO_RAD
    };

    this.orbitalPivot = new THREE.Object3D();
    this.orbitalPivot.name = `${config.name}OrbitalPivot`;
    this.orbitalPivot.rotation.set(
      (config.inclination ?? 0) * DEG_TO_RAD,
      (config.lan ?? 0) * DEG_TO_RAD,
      0,
      'YXZ'
    );
    scene.add(this.orbitalPivot);

    const segments = config.geometrySegments ?? 96;
    const geometry = new THREE.SphereGeometry(this.radius, segments, segments);
    const material = new THREE.ShaderMaterial({
      vertexShader: moonVert,
      fragmentShader: moonFrag,
      uniforms: {
        uSunDirection: { value: saturnSimulator.sunDirection },
        uSaturnPosition: { value: saturnSimulator.saturnMesh.position },
        uSaturnEqRadius: { value: saturnSimulator.eqRadius },
        uSaturnPolRadius: { value: saturnSimulator.polRadius },
        tColor: { value: config.color || WHITE_TEXTURE },
        tNormal: { value: config.normal || FLAT_NORMAL_TEXTURE },
        tAo: { value: config.ao || WHITE_TEXTURE },
        uAoIntensity: { value: 1.0 },
        uBaseColor: { value: config.baseColor || new THREE.Vector3(1.0, 1.0, 1.0) },
        uAtmosphereStrength: { value: config.atmosphereStrength ?? 0.0 },
        uRimPower: { value: config.rimPower ?? 1.2 }
      },
      extensions: { derivatives: true }
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = config.name;

    const labelElement = document.createElement('div');
    labelElement.className = 'celestial-label';
    labelElement.textContent = config.name;
    this.label = new CSS2DObject(labelElement);
    this.label.position.set(0, this.radius * 1.2, 0);
    this.mesh.add(this.label);

    this.orbitalPivot.add(this.mesh);

    this.shadowIndex = -1;
    this.shadowPosition = null;
    if (config.castsShadow !== false) {
      this.shadowIndex = saturnSimulator.registerShadowMoon(this.radius);
      this.shadowPosition = saturnSimulator.moonShadowPositions[this.shadowIndex];
    }
  }

  update(daysSinceJ2000) {
    const position = calculateKeplerianPosition(this.orbitElements, daysSinceJ2000);
    this.mesh.position.set(position.x, 0.0, position.z);
    this.mesh.updateWorldMatrix(true, false);

    if (this.shadowPosition) {
      this.mesh.getWorldPosition(this.shadowPosition);
    }
  }
}
