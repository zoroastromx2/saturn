import * as THREE from 'three';
import { CONSTANTS } from '../math/AstroScale.js';
import { MoonSimulatorBase } from './MoonSimulatorBase.js';
import { WHITE_TEXTURE } from './MoonTextures.js';
import { random } from './Random.js';
import plumeVert from '../shaders/plume.vert';
import plumeFrag from '../shaders/plume.frag';

export class EnceladusSimulator extends MoonSimulatorBase {
  constructor(scene, saturnSimulator, scaleFactor, assets = {}, listener = null) {
    super(scene, saturnSimulator, scaleFactor, {
      name: 'Enceladus',
      radiusKm: CONSTANTS.ENCELADUS.RADIUS,
      orbitSemiMajorKm: CONSTANTS.ENCELADUS.ORBIT_SEMI_MAJOR,
      orbitPeriod: CONSTANTS.ENCELADUS.ORBIT_PERIOD,
      eccentricity: CONSTANTS.ENCELADUS.ECCENTRICITY,
      inclination: CONSTANTS.ENCELADUS.INCLINATION,
      lan: CONSTANTS.ENCELADUS.LAN,
      meanAnomalyEpoch: CONSTANTS.ENCELADUS.MEAN_ANOMALY_EPOCH,
      geometrySegments: 32,
      castsShadow: false
    });

    this.applyEnceladusModel(assets?.models?.enceladus);

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

    this.ringSourcePosition = new THREE.Vector3();
    saturnSimulator.ringsMesh.material.uniforms.uEnceladusPosition.value = this.ringSourcePosition;

    // Permite congelar la pluma en capturas deterministas (fase C).
    this.frozen = false;

    this.maxParticles = 5000;
    this.positions = new Float32Array(this.maxParticles * 3);
    this.velocities = new Float32Array(this.maxParticles * 3);
    this.lifetimes = new Float32Array(this.maxParticles);
    this.maxLifetimes = new Float32Array(this.maxParticles);
    this.plumeTime = 0.0;
    this.meshWorldQuaternion = new THREE.Quaternion();
    this.southDirection = new THREE.Vector3();
    this.southTangentX = new THREE.Vector3();
    this.southTangentZ = new THREE.Vector3();
    this.southPolePosition = new THREE.Vector3();
    this.initPlume(scene);
  }

  initPlume(scene) {
    const geometry = new THREE.BufferGeometry();

    this.positionAttribute = new THREE.BufferAttribute(this.positions, 3).setUsage(
      THREE.DynamicDrawUsage
    );
    this.velocityAttribute = new THREE.BufferAttribute(this.velocities, 3).setUsage(
      THREE.DynamicDrawUsage
    );
    this.lifetimeAttribute = new THREE.BufferAttribute(this.lifetimes, 1).setUsage(
      THREE.DynamicDrawUsage
    );
    this.maxLifetimeAttribute = new THREE.BufferAttribute(this.maxLifetimes, 1).setUsage(
      THREE.DynamicDrawUsage
    );

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

  update(daysSinceJ2000, deltaTime = 0) {
    super.update(daysSinceJ2000);
    this.mesh.getWorldPosition(this.ringSourcePosition);
    this.updatePlume(deltaTime);
  }

  updatePlume(deltaTime) {
    if (this.frozen) return;

    this.plumeTime += deltaTime;
    this.plumeMaterial.uniforms.uTime.value = this.plumeTime;

    this.mesh.getWorldQuaternion(this.meshWorldQuaternion);
    this.southDirection.set(0, -1, 0).applyQuaternion(this.meshWorldQuaternion);
    this.southTangentX.set(1, 0, 0).applyQuaternion(this.meshWorldQuaternion);
    this.southTangentZ.set(0, 0, 1).applyQuaternion(this.meshWorldQuaternion);
    this.southPolePosition.set(0, -this.radius, 0).applyMatrix4(this.mesh.matrixWorld);

    const southX = this.southPolePosition.x;
    const southY = this.southPolePosition.y;
    const southZ = this.southPolePosition.z;
    const drag = Math.max(0.0, 1.0 - 0.06 * deltaTime);
    const expansion = 1.0 + 0.22 * deltaTime;

    for (let i = 0; i < this.maxParticles; i++) {
      const j = i * 3;
      const remaining = this.lifetimes[i] - deltaTime;

      if (remaining <= 0.0) {
        this.positions[j] = southX;
        this.positions[j + 1] = southY;
        this.positions[j + 2] = southZ;

        const speed = this.radius * (0.35 + random() * 0.55);
        const azimuth = random() * Math.PI * 2.0;
        const spread = Math.sqrt(random()) * 0.65;
        const cosSpread = Math.cos(spread);
        const sinSpread = Math.sin(spread);
        const lateralX =
          Math.cos(azimuth) * this.southTangentX.x + Math.sin(azimuth) * this.southTangentZ.x;
        const lateralY =
          Math.cos(azimuth) * this.southTangentX.y + Math.sin(azimuth) * this.southTangentZ.y;
        const lateralZ =
          Math.cos(azimuth) * this.southTangentX.z + Math.sin(azimuth) * this.southTangentZ.z;

        this.velocities[j] = (this.southDirection.x * cosSpread + lateralX * sinSpread) * speed;
        this.velocities[j + 1] = (this.southDirection.y * cosSpread + lateralY * sinSpread) * speed;
        this.velocities[j + 2] = (this.southDirection.z * cosSpread + lateralZ * sinSpread) * speed;

        const life = 2.0 + random() * 3.0;
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

  applyEnceladusModel(source) {
    if (!source) return;

    const model = source.clone(true);
    model.updateMatrixWorld(true);

    let surfaceMesh = null;
    model.traverse((child) => {
      if (!child.isMesh) return;
      if (child.name === 'Enceladus' || child.material?.name === 'Enceladus') {
        surfaceMesh = child;
      }
    });
    if (!surfaceMesh?.geometry) return;

    const geometry = surfaceMesh.geometry.clone();
    delete geometry.parameters;
    geometry.applyMatrix4(surfaceMesh.matrixWorld);
    geometry.center();
    geometry.computeBoundingSphere();
    const sourceRadius = geometry.boundingSphere?.radius;
    if (!sourceRadius) return;

    const scale = this.radius / sourceRadius;
    geometry.scale(scale, scale, scale);
    geometry.computeBoundingSphere();

    this.mesh.geometry.dispose();
    this.mesh.geometry = geometry;
    this.mesh.userData.textureFlipY = false;

    const surfaceMaterial = Array.isArray(surfaceMesh.material)
      ? surfaceMesh.material[0]
      : surfaceMesh.material;
    const colorTexture = surfaceMaterial?.map;
    if (colorTexture) {
      colorTexture.colorSpace = THREE.SRGBColorSpace;
      colorTexture.wrapS = THREE.RepeatWrapping;
      colorTexture.wrapT = THREE.RepeatWrapping;
      colorTexture.needsUpdate = true;
      this.mesh.material.uniforms.tColor.value = colorTexture;
    }
    this.mesh.material.uniforms.tAo.value = WHITE_TEXTURE;
  }
}
