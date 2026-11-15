import * as THREE from 'three';
import { CONSTANTS, toWebGLUnits } from '../math/AstroScale.js';
import titanVert from '../shaders/titan.vert';
import titanFrag from '../shaders/titan.frag';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

export class TitanSimulator {
  constructor(scene, saturnSimulator, scaleFactor, assets = {}, listener = null) {
    this.radius = toWebGLUnits(CONSTANTS.TITAN.RADIUS, scaleFactor);
    this.orbitDistance = toWebGLUnits(CONSTANTS.TITAN.ORBIT_SEMI_MAJOR, scaleFactor);
    
    // Malla de Titán con atmósfera fotoquímica aproximada ópticamente.
    const geometry = new THREE.SphereGeometry(this.radius, 128, 128);
    const material = new THREE.ShaderMaterial({
      vertexShader: titanVert,
      fragmentShader: titanFrag,
      uniforms: {
        uSunDirection: { value: saturnSimulator.sunDirection },
        uSaturnEqRadius: { value: saturnSimulator.eqRadius },
        uSaturnPolRadius: { value: saturnSimulator.polRadius },
        uRimPower: { value: 1.2 }
      }
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = 'Titan';

    const labelElement = document.createElement('div');
    labelElement.className = 'celestial-label';
    labelElement.textContent = 'Titan';
    this.label = new CSS2DObject(labelElement);
    this.label.position.set(0, this.radius * 1.2, 0);
    this.mesh.add(this.label);

    this.ambientSound = null;
    if (listener && assets.titanAudioBuffer) {
      const sound = new THREE.PositionalAudio(listener);
      sound.setBuffer(assets.titanAudioBuffer);
      sound.setLoop(true);
      sound.setRefDistance(this.radius * 2);
      sound.setMaxDistance(this.radius * 20);
      this.mesh.add(sound);
      this.ambientSound = sound;
    }

    scene.add(this.mesh);

    // Inyectar uniforms dinámicos en los shaders de Saturno y Anillos
    this.saturnUniforms = saturnSimulator.saturnMesh.material.uniforms;
    this.ringsUniforms = saturnSimulator.ringsMesh.material.uniforms;
    
    const initialPos = new THREE.Vector3();
    this.setupUniforms(this.saturnUniforms, initialPos);
    this.setupUniforms(this.ringsUniforms, initialPos);
  }

  setupUniforms(uniforms, pos) {
    uniforms.uTitanPosition = { value: pos };
    uniforms.uTitanRadius = { value: this.radius };
  }

  // Se llama desde tick() en main.js
  update(elapsedTime) {
    // Velocidad orbital real: el período está en días terrestres.
    const SECONDS_PER_DAY = 86400.0;
    const angularSpeed = (2.0 * Math.PI) / (CONSTANTS.TITAN.ORBIT_PERIOD * SECONDS_PER_DAY);
    const currentAngle = elapsedTime * angularSpeed;

    // Calcular órbita plana XZ (simplificada, Titán orbita casi coplanar al ecuador)
    const x = Math.cos(currentAngle) * this.orbitDistance;
    const z = Math.sin(currentAngle) * this.orbitDistance;
    
    this.mesh.position.set(x, 0, z);

    // Actualizar la posición para el ray-tracing en los shaders
    this.saturnUniforms.uTitanPosition.value.copy(this.mesh.position);
    this.ringsUniforms.uTitanPosition.value.copy(this.mesh.position);
  }
}