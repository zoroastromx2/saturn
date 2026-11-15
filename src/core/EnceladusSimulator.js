import * as THREE from 'three';
import { CONSTANTS, toWebGLUnits } from '../math/AstroScale.js';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import plumeVert from '../shaders/plume.vert';
import plumeFrag from '../shaders/plume.frag';
import moonVert from '../shaders/moon.vert';
import moonFrag from '../shaders/moon.frag';
import { WHITE_TEXTURE, FLAT_NORMAL_TEXTURE } from './MoonTextures.js';

export class EnceladusSimulator {
  constructor(scene, saturnSimulator, scaleFactor, assets = {}, listener = null) {
    this.radius = toWebGLUnits(CONSTANTS.ENCELADUS.RADIUS, scaleFactor);
    this.orbitDistance = toWebGLUnits(CONSTANTS.ENCELADUS.ORBIT_SEMI_MAJOR, scaleFactor);
    
    const geometry = new THREE.SphereGeometry(this.radius, 32, 32);
    const material = new THREE.ShaderMaterial({
      vertexShader: moonVert,
      fragmentShader: moonFrag,
      uniforms: {
        uSunDirection: { value: saturnSimulator.sunDirection },
        uSaturnPosition: { value: saturnSimulator.saturnMesh.position },
        uSaturnEqRadius: { value: saturnSimulator.eqRadius },
        uSaturnPolRadius: { value: saturnSimulator.polRadius },
        tColor: { value: WHITE_TEXTURE },
        tNormal: { value: FLAT_NORMAL_TEXTURE },
        uBaseColor: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
        uAtmosphereStrength: { value: 0.0 },
        uRimPower: { value: 1.2 }
      },
      extensions: { derivatives: true }
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = 'Enceladus';

    const labelElement = document.createElement('div');
    labelElement.className = 'celestial-label';
    labelElement.textContent = 'Enceladus';
    this.label = new CSS2DObject(labelElement);
    this.label.position.set(0, this.radius * 1.2, 0);
    this.mesh.add(this.label);

    this.surfaceCameraMount = new THREE.Object3D();
    this.surfaceCameraMount.name = 'EnceladusSurfaceCameraMount';
    this.surfaceCameraMount.position.set(0, this.radius * 0.5, this.radius);
    this.mesh.add(this.surfaceCameraMount);

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

    this.maxParticles = 5000;
    this.positions = new Float32Array(this.maxParticles * 3);
    this.velocities = new Float32Array(this.maxParticles * 3);
    this.lifetimes = new Float32Array(this.maxParticles);
    this.maxLifetimes = new Float32Array(this.maxParticles);
    this.plumeTime = 0.0;
    this.initPlume(scene);

    // Inyectar uniforms a los shaders (igual que con Titán)
    this.saturnUniforms = saturnSimulator.saturnMesh.material.uniforms;
    this.ringsUniforms = saturnSimulator.ringsMesh.material.uniforms;
    
    const initialPos = new THREE.Vector3();
    this.setupUniforms(this.saturnUniforms, initialPos);
    this.setupUniforms(this.ringsUniforms, initialPos);
  }

  initPlume(scene) {
    const geometry = new THREE.BufferGeometry();

    this.positionAttribute = new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage);
    this.velocityAttribute = new THREE.BufferAttribute(this.velocities, 3).setUsage(THREE.DynamicDrawUsage);
    this.lifetimeAttribute = new THREE.BufferAttribute(this.lifetimes, 1).setUsage(THREE.DynamicDrawUsage);
    this.maxLifetimeAttribute = new THREE.BufferAttribute(this.maxLifetimes, 1).setUsage(THREE.DynamicDrawUsage);

    geometry.setAttribute('position', this.positionAttribute);
    geometry.setAttribute('velocity', this.velocityAttribute);
    geometry.setAttribute('lifetime', this.lifetimeAttribute);
    geometry.setAttribute('maxLifetime', this.maxLifetimeAttribute);

    this.plumeMaterial = new THREE.ShaderMaterial({
      vertexShader: plumeVert,
      fragmentShader: plumeFrag,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0.7, 0.9, 1.0) },
        uSize: { value: this.radius * 0.06 }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.plume = new THREE.Points(geometry, this.plumeMaterial);
    this.plume.name = 'EnceladusPlume';
    this.plume.frustumCulled = false;
    scene.add(this.plume);
  }

  setupUniforms(uniforms, pos) {
    uniforms.uEnceladusPosition = { value: pos };
    uniforms.uEnceladusRadius = { value: this.radius };
  }

  update(elapsedTime, deltaTime = 0) {
    // Velocidad orbital real: el período está en días terrestres.
    const SECONDS_PER_DAY = 86400.0;
    const angularSpeed = (2.0 * Math.PI) / (CONSTANTS.ENCELADUS.ORBIT_PERIOD * SECONDS_PER_DAY);
    const currentAngle = elapsedTime * angularSpeed;

    const x = Math.cos(currentAngle) * this.orbitDistance;
    const z = Math.sin(currentAngle) * this.orbitDistance;
    
    this.mesh.position.set(x, 0, z);

    this.saturnUniforms.uEnceladusPosition.value.copy(this.mesh.position);
    this.ringsUniforms.uEnceladusPosition.value.copy(this.mesh.position);

    this.updatePlume(deltaTime);
  }

  updatePlume(deltaTime) {
    this.plumeTime += deltaTime;
    this.plumeMaterial.uniforms.uTime.value = this.plumeTime;

    const southX = this.mesh.position.x;
    const southY = this.mesh.position.y - this.radius;
    const southZ = this.mesh.position.z;
    const drag = Math.max(0.0, 1.0 - 0.06 * deltaTime);
    const expansion = 1.0 + 0.22 * deltaTime;

    for (let i = 0; i < this.maxParticles; i++) {
      const j = i * 3;
      const remaining = this.lifetimes[i] - deltaTime;

      if (remaining <= 0.0) {
        this.positions[j] = southX;
        this.positions[j + 1] = southY;
        this.positions[j + 2] = southZ;

        const speed = this.radius * (0.35 + Math.random() * 0.55);
        const azimuth = Math.random() * Math.PI * 2.0;
        const spread = Math.sqrt(Math.random()) * 0.65;
        const lateral = Math.sin(spread) * speed;

        this.velocities[j] = Math.cos(azimuth) * lateral;
        this.velocities[j + 1] = -Math.cos(spread) * speed;
        this.velocities[j + 2] = Math.sin(azimuth) * lateral;

        const life = 2.0 + Math.random() * 3.0;
        this.lifetimes[i] = life;
        this.maxLifetimes[i] = life;
      } else {
        const vx = this.velocities[j] * drag * expansion;
        const vy = this.velocities[j + 1] * drag;
        const vz = this.velocities[j + 2] * drag * expansion;

        this.positions[j] += vx * deltaTime;
        this.positions[j + 1] += vy * deltaTime;
        this.positions[j + 2] += vz * deltaTime;

        this.velocities[j] = vx;
        this.velocities[j + 1] = vy;
        this.velocities[j + 2] = vz;
        this.lifetimes[i] = remaining;
      }
    }

    this.positionAttribute.needsUpdate = true;
    this.lifetimeAttribute.needsUpdate = true;
    this.maxLifetimeAttribute.needsUpdate = true;
  }
}