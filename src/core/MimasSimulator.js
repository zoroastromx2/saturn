import * as THREE from 'three';
import { CONSTANTS, toWebGLUnits } from '../math/AstroScale.js';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import moonVert from '../shaders/moon.vert';
import moonFrag from '../shaders/moon.frag';
import { WHITE_TEXTURE, FLAT_NORMAL_TEXTURE } from './MoonTextures.js';

export class MimasSimulator {
  constructor(scene, saturnSimulator, scaleFactor, assets = {}, listener = null) {
    this.radius = toWebGLUnits(CONSTANTS.MIMAS.RADIUS, scaleFactor);
    this.orbitDistance = toWebGLUnits(CONSTANTS.MIMAS.ORBIT_SEMI_MAJOR, scaleFactor);

    const geometry = new THREE.SphereGeometry(this.radius, 128, 128);
    const material = new THREE.ShaderMaterial({
      vertexShader: moonVert,
      fragmentShader: moonFrag,
      uniforms: {
        uSunDirection: { value: saturnSimulator.sunDirection },
        uSaturnPosition: { value: saturnSimulator.saturnMesh.position },
        uSaturnEqRadius: { value: saturnSimulator.eqRadius },
        uSaturnPolRadius: { value: saturnSimulator.polRadius },
        tColor: { value: assets.mimasColor || WHITE_TEXTURE },
        tNormal: { value: assets.mimasNormal || FLAT_NORMAL_TEXTURE },
        uBaseColor: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
        uAtmosphereStrength: { value: 0.0 },
        uRimPower: { value: 1.2 }
      },
      extensions: { derivatives: true }
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = 'Mimas';
    this.mesh.rotation.y = -2.45;

    this.surfaceCameraMount = new THREE.Object3D();
    this.surfaceCameraMount.name = 'MimasSurfaceCameraMount';
    this.surfaceCameraMount.position.set(0, this.radius * 0.5, this.radius);
    this.mesh.add(this.surfaceCameraMount);

    const labelElement = document.createElement('div');
    labelElement.className = 'celestial-label';
    labelElement.textContent = 'Mimas';
    this.label = new CSS2DObject(labelElement);
    this.label.position.set(0, this.radius * 1.2, 0);
    this.mesh.add(this.label);

    this.ambientSound = null;
    if (listener && assets.mimasAudioBuffer) {
      const sound = new THREE.PositionalAudio(listener);
      sound.setBuffer(assets.mimasAudioBuffer);
      sound.setLoop(true);
      sound.setRefDistance(this.radius * 2);
      sound.setMaxDistance(this.radius * 20);
      this.mesh.add(sound);
      this.ambientSound = sound;
    }

    scene.add(this.mesh);

    this.saturnUniforms = saturnSimulator.saturnMesh.material.uniforms;
    this.ringsUniforms = saturnSimulator.ringsMesh.material.uniforms;

    const initialPos = new THREE.Vector3();
    this.setupUniforms(this.saturnUniforms, initialPos);
    this.setupUniforms(this.ringsUniforms, initialPos);
  }

  setupUniforms(uniforms, pos) {
    uniforms.uMimasPosition = { value: pos };
    uniforms.uMimasRadius = { value: this.radius };
  }

  update(orbitalTime) {
    const SECONDS_PER_DAY = 86400.0;
    const angularSpeed = (2.0 * Math.PI) / (CONSTANTS.MIMAS.ORBIT_PERIOD * SECONDS_PER_DAY);
    const currentAngle = orbitalTime * angularSpeed;

    const x = Math.cos(currentAngle) * this.orbitDistance;
    const z = Math.sin(currentAngle) * this.orbitDistance;

    this.mesh.position.set(x, 0, z);

    this.saturnUniforms.uMimasPosition.value.copy(this.mesh.position);
    this.ringsUniforms.uMimasPosition.value.copy(this.mesh.position);
  }
}
