// src/core/SaturnSimulator.js
import * as THREE from 'three';
import { CONSTANTS, toWebGLUnits } from '../math/AstroScale.js';
import saturnVert from '../shaders/saturn.vert';
import saturnFrag from '../shaders/saturn.frag';
import ringsVert from '../shaders/rings.vert';
import ringsFrag from '../shaders/rings.frag';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

export class SaturnSimulator {
  constructor(scene, assets = {}, listener = null) {
    this.scene = scene;
    this.assets = assets;
    this.listener = listener;

    // 1. Definir la escala global (ej. 1 unidad WebGL = 10,000 km)
    this.scaleFactor = 10000;

    // 2. Convertir medidas reales a unidades de renderizado
    this.eqRadius = toWebGLUnits(CONSTANTS.SATURN.RADIUS_EQUATORIAL, this.scaleFactor);
    this.polRadius = toWebGLUnits(CONSTANTS.SATURN.RADIUS_POLAR, this.scaleFactor);
    this.ringInner = toWebGLUnits(CONSTANTS.SATURN.RING_INNER_EDGE, this.scaleFactor);
    this.ringOuter = toWebGLUnits(CONSTANTS.SATURN.RING_OUTER_EDGE, this.scaleFactor);
    this.eRingInner = toWebGLUnits(CONSTANTS.SATURN.E_RING_INNER, this.scaleFactor);
    this.eRingOuter = toWebGLUnits(CONSTANTS.SATURN.E_RING_OUTER, this.scaleFactor);
    this.enceladusOrbit = toWebGLUnits(CONSTANTS.ENCELADUS.ORBIT_SEMI_MAJOR, this.scaleFactor);
    this.eRingThickness = (this.eRingOuter - this.eRingInner) * 0.06;

    // Misma dirección de luz para la atmósfera, los anillos y la Tierra.
    this.sunDirection = new THREE.Vector3(1.0, 0.35, 0.35).normalize();

    this.initSaturn();
    this.initRings();
  }

  initSaturn() {
    // Usamos una esfera base, pero la aplastamos matemáticamente
    const geometry = new THREE.SphereGeometry(this.eqRadius, 128, 128);

    // Aplicar el achatamiento deformando el eje Y
    geometry.scale(1.0, this.polRadius / this.eqRadius, 1.0);

    if (this.assets.saturnAlbedo) {
      this.assets.saturnAlbedo.wrapS = THREE.RepeatWrapping;
    }

    const material = new THREE.ShaderMaterial({
      vertexShader: saturnVert,
      fragmentShader: saturnFrag,
      uniforms: {
        uEqRadius: { value: this.eqRadius },
        uPolRadius: { value: this.polRadius },
        // Pasamos los límites escalados para que GLSL (RingOptics) calcule la sombra
        uRingInnerRadius: { value: this.ringInner },
        uRingOuterRadius: { value: this.ringOuter },
        uSunDirection: { value: this.sunDirection },
        uSaturnTexture: { value: this.assets.saturnAlbedo || null },
        uRingAlphaTex: { value: this.assets.ringAlpha || null },
        uTime: { value: 0.0 },
        uAuroraIntensity: { value: 0.0 },
        uStormIntensity: { value: 0.0 }
      }
    });

    this.saturnMesh = new THREE.Mesh(geometry, material);
    this.saturnMesh.name = 'Saturn';

    const labelElement = document.createElement('div');
    labelElement.className = 'celestial-label';
    labelElement.textContent = 'Saturn';
    this.label = new CSS2DObject(labelElement);
    this.label.position.set(0, this.eqRadius * 1.2, 0);
    this.saturnMesh.add(this.label);

    this.ambientSound = null;
    if (this.listener && this.assets.saturnAudioBuffer) {
      const sound = new THREE.PositionalAudio(this.listener);
      sound.setBuffer(this.assets.saturnAudioBuffer);
      sound.setLoop(true);
      sound.setRefDistance(this.eqRadius * 2);
      sound.setMaxDistance(this.eqRadius * 20);
      this.saturnMesh.add(sound);
      this.ambientSound = sound;
    }

    this.scene.add(this.saturnMesh);
  }

  initRings() {
    // El plano cubre también el toro volumétrico del Anillo E.
    const geometry = new THREE.PlaneGeometry(this.eRingOuter * 2, this.eRingOuter * 2);

    // Rotar para que descanse en el plano XZ (Y=0) como asume RingOptics.js
    geometry.rotateX(-Math.PI / 2);

    if (this.assets.ringColor) {
      this.assets.ringColor.wrapS = THREE.ClampToEdgeWrapping;
      this.assets.ringColor.wrapT = THREE.ClampToEdgeWrapping;
    }
    if (this.assets.ringAlpha) {
      this.assets.ringAlpha.wrapS = THREE.ClampToEdgeWrapping;
      this.assets.ringAlpha.wrapT = THREE.ClampToEdgeWrapping;
    }

    const material = new THREE.ShaderMaterial({
      vertexShader: ringsVert,
      fragmentShader: ringsFrag,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      uniforms: {
        uEqRadius: { value: this.eqRadius },
        uPolRadius: { value: this.polRadius },
        uInnerRadius: { value: this.ringInner },
        uOuterRadius: { value: this.ringOuter },
        uERingInnerRadius: { value: this.eRingInner },
        uERingOuterRadius: { value: this.eRingOuter },
        uEnceladusOrbitRadius: { value: this.enceladusOrbit },
        uERingThickness: { value: this.eRingThickness },
        uSunDirection: { value: this.sunDirection },
        uRingTexture: { value: this.assets.ringColor || null },
        uRingAlphaTex: { value: this.assets.ringAlpha || null },
        uTime: { value: 0.0 }
      }
    });

    this.ringsMesh = new THREE.Mesh(geometry, material);
    this.ringsMesh.name = 'Rings';
    this.scene.add(this.ringsMesh);
  }
}
