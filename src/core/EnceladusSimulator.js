import * as THREE from 'three';
import { CONSTANTS, toWebGLUnits } from '../math/AstroScale.js';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

export class EnceladusSimulator {
  constructor(scene, saturnSimulator, scaleFactor, assets = {}, listener = null) {
    this.radius = toWebGLUnits(CONSTANTS.ENCELADUS.RADIUS, scaleFactor);
    this.orbitDistance = toWebGLUnits(CONSTANTS.ENCELADUS.ORBIT_SEMI_MAJOR, scaleFactor);
    
    const geometry = new THREE.SphereGeometry(this.radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0xffffff, // Hielo puro
      roughness: 0.2,  // Muy liso
      metalness: 0.1   // Ligero brillo especular
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = 'Enceladus';

    const labelElement = document.createElement('div');
    labelElement.className = 'celestial-label';
    labelElement.textContent = 'Enceladus';
    this.label = new CSS2DObject(labelElement);
    this.label.position.set(0, this.radius * 1.2, 0);
    this.mesh.add(this.label);

    this.ambientSound = null;
    if (listener && assets.enceladusAudioBuffer) {
      const sound = new THREE.PositionalAudio(listener);
      sound.setBuffer(assets.enceladusAudioBuffer);
      sound.setLoop(true);
      sound.setRefDistance(this.radius * 2);
      sound.setMaxDistance(this.radius * 20);
      this.mesh.add(sound);
      this.ambientSound = sound;
    }

    scene.add(this.mesh);

    // Inyectar uniforms a los shaders (igual que con Titán)
    this.saturnUniforms = saturnSimulator.saturnMesh.material.uniforms;
    this.ringsUniforms = saturnSimulator.ringsMesh.material.uniforms;
    
    const initialPos = new THREE.Vector3();
    this.setupUniforms(this.saturnUniforms, initialPos);
    this.setupUniforms(this.ringsUniforms, initialPos);
  }

  setupUniforms(uniforms, pos) {
    uniforms.uEnceladusPosition = { value: pos };
    uniforms.uEnceladusRadius = { value: this.radius };
  }

  update(elapsedTime) {
    // Velocidad orbital real: el período está en días terrestres.
    const SECONDS_PER_DAY = 86400.0;
    const angularSpeed = (2.0 * Math.PI) / (CONSTANTS.ENCELADUS.ORBIT_PERIOD * SECONDS_PER_DAY);
    const currentAngle = elapsedTime * angularSpeed;

    const x = Math.cos(currentAngle) * this.orbitDistance;
    const z = Math.sin(currentAngle) * this.orbitDistance;
    
    this.mesh.position.set(x, 0, z);

    this.saturnUniforms.uEnceladusPosition.value.copy(this.mesh.position);
    this.ringsUniforms.uEnceladusPosition.value.copy(this.mesh.position);
  }
}