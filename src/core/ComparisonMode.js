// src/core/ComparisonMode.js
import * as THREE from 'three';
import { getEarthToSaturnRatio } from '../math/AstroScale.js';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

export class ComparisonMode {
  constructor(scene, saturnSimulator, camera, assets = null) {
    this.scene = scene;
    this.saturnSimulator = saturnSimulator;
    this.camera = camera;
    this.assets = assets;

    this.earthMesh = null;
    this.earthRadius = 0;
    this.framingTarget = new THREE.Vector3();
    this.isActive = false;

    this.initEarth();
  }

  initEarth() {
    // 1. Obtener la proporción validada por las pruebas unitarias (~9.449)
    const scaleRatio = getEarthToSaturnRatio();

    // 2. Derivar el radio de la Tierra basándose en el tamaño actual de Saturno en el motor
    const saturnRadiusWebGL = this.saturnSimulator.eqRadius;
    const earthRadiusWebGL = saturnRadiusWebGL / scaleRatio;
    this.earthRadius = earthRadiusWebGL;

    // 3. Construir la malla terrestre
    const geometry = new THREE.SphereGeometry(earthRadiusWebGL, 64, 64);
    const material = new THREE.MeshStandardMaterial({
      color: this.assets?.earthAlbedo ? 0xffffff : 0x3a82f8,
      map: this.assets?.earthAlbedo || null,
      roughness: 0.85,
      metalness: 0.0
    });

    this.earthMesh = new THREE.Mesh(geometry, material);
    this.earthMesh.name = 'Earth';

    // 4. Posicionamiento Estratégico
    // Colocamos la Tierra justo fuera del borde exterior del anillo F para evitar colisiones visuales
    const padding = saturnRadiusWebGL * 1.5;
    const spawnX = this.saturnSimulator.ringOuter + padding;

    this.earthMesh.position.set(spawnX, 0, 0);
    this.earthMesh.visible = false;

    const labelElement = document.createElement('div');
    labelElement.className = 'celestial-label';
    labelElement.textContent = 'Earth';
    this.label = new CSS2DObject(labelElement);
    this.label.position.set(0, earthRadiusWebGL * 1.2, 0);
    this.earthMesh.add(this.label);

    this.scene.add(this.earthMesh);
  }

  toggleComparison() {
    this.isActive = !this.isActive;
    this.earthMesh.visible = this.isActive;

    if (this.isActive) {
      this.triggerCinematicFraming();
    } else {
      this.resetCamera();
    }
  }

  triggerCinematicFraming() {
    // Encuadrar el disco completo de los anillos y la Tierra, no solo sus centros.
    const leftEdge = -this.saturnSimulator.ringOuter;
    const rightEdge = this.earthMesh.position.x + this.earthRadius;
    const centerX = (leftEdge + rightEdge) / 2;

    const verticalFov = THREE.MathUtils.degToRad(this.camera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * this.camera.aspect);
    const halfWidth = ((rightEdge - leftEdge) / 2) * 1.15;
    const halfHeight = this.saturnSimulator.eqRadius * 2.2;

    const distanceForWidth = halfWidth / Math.tan(horizontalFov / 2);
    const distanceForHeight = halfHeight / Math.tan(verticalFov / 2);
    const requiredDistance = Math.max(distanceForWidth, distanceForHeight);

    this.framingTarget.set(centerX, 0, 0);
    this.camera.position.set(centerX, this.saturnSimulator.eqRadius * 2, requiredDistance);
    this.camera.lookAt(this.framingTarget);
  }

  resetCamera() {
    // Devolver la cámara a la órbita estándar de Saturno
    this.framingTarget.set(0, 0, 0);
    this.camera.position.set(
      0,
      this.saturnSimulator.eqRadius * 3,
      this.saturnSimulator.ringOuter * 2
    );
    this.camera.lookAt(this.framingTarget);
  }
}
