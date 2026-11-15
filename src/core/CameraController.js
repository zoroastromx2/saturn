// src/core/CameraController.js
import * as THREE from 'three';
import { gsap } from 'gsap';

const TRANSITION_DURATION = 2.0;

export class CameraController {
  constructor(camera, controls) {
    this.camera = camera;
    this.controls = controls;

    this.currentTarget = null;
    this.tween = null;

    this.progress = { value: 0 };
    this.startPosition = new THREE.Vector3();
    this.startTarget = new THREE.Vector3();
    this.targetPosition = new THREE.Vector3();
    this.endPosition = new THREE.Vector3();
    this.offsetDirection = new THREE.Vector3();
    this.lastTargetPosition = new THREE.Vector3();
    this.followDelta = new THREE.Vector3();
    this.focusDistance = 0;
    this.isSurfaceLocked = false;
    this.surfaceMount = null;
    this.surfaceOrigin = new THREE.Vector3(0, 0, 0);
  }

  focusOn(targetMesh, distanceMultiplier, elevationBias = 0.35) {
    if (!targetMesh) return;

    this.isSurfaceLocked = false;
    this.surfaceMount = null;
    this.controls.enabled = true;

    if (this.tween) {
      this.tween.kill();
    }

    this.currentTarget = targetMesh;
    this.focusDistance = targetMesh.geometry.parameters.radius * distanceMultiplier;

    this.startPosition.copy(this.camera.position);
    this.startTarget.copy(this.controls.target);

    // Mantiene el ángulo de visión actual y añade una ligera elevación.
    this.offsetDirection.copy(this.startPosition).sub(targetMesh.position);
    if (this.offsetDirection.lengthSq() < 1e-8) {
      this.offsetDirection.set(0, 0.5, 1);
    }
    this.offsetDirection.normalize();
    this.offsetDirection.y += elevationBias;
    this.offsetDirection.normalize();

    this.progress.value = 0;
    this.tween = gsap.to(this.progress, {
      value: 1,
      duration: TRANSITION_DURATION,
      ease: 'power3.inOut',
      onUpdate: () => this.applyTransition(),
      onComplete: () => {
        this.applyTransition();
        this.lastTargetPosition.copy(this.currentTarget.position);
        this.tween = null;
      }
    });
  }

  landOnSurface(targetSimulator) {
    const mount = targetSimulator?.surfaceCameraMount;
    if (!mount) return;

    if (this.tween) {
      this.tween.kill();
    }

    this.currentTarget = targetSimulator.mesh;
    this.isSurfaceLocked = false;
    this.surfaceMount = mount;
    this.controls.enabled = false;

    this.startPosition.copy(this.camera.position);
    this.startTarget.copy(this.controls.target);

    this.progress.value = 0;
    this.tween = gsap.to(this.progress, {
      value: 1,
      duration: TRANSITION_DURATION,
      ease: 'power3.inOut',
      onUpdate: () => {
        mount.getWorldPosition(this.targetPosition);
        this.camera.position.lerpVectors(this.startPosition, this.targetPosition, this.progress.value);
        this.controls.target.lerpVectors(this.startTarget, this.surfaceOrigin, this.progress.value);
        this.camera.lookAt(this.controls.target);
      },
      onComplete: () => {
        mount.getWorldPosition(this.targetPosition);
        this.camera.position.copy(this.targetPosition);
        this.controls.target.copy(this.surfaceOrigin);
        this.camera.lookAt(this.surfaceOrigin);
        this.isSurfaceLocked = true;
        this.controls.enabled = false;
        this.tween = null;
      }
    });
  }

  applyTransition() {
    if (!this.currentTarget) return;

    // El destino se recalcula con la posición viva del astro en cada frame.
    this.targetPosition.copy(this.currentTarget.position);
    this.endPosition.copy(this.targetPosition)
      .addScaledVector(this.offsetDirection, this.focusDistance);

    this.camera.position.lerpVectors(this.startPosition, this.endPosition, this.progress.value);
    this.controls.target.lerpVectors(this.startTarget, this.targetPosition, this.progress.value);
    this.camera.lookAt(this.controls.target);
  }

  update() {
    if (this.currentTarget && !this.tween && !this.isSurfaceLocked) {
      // Sigue la traslación orbital sin perder el encuadre elegido.
      this.followDelta.subVectors(this.currentTarget.position, this.lastTargetPosition);
      this.camera.position.add(this.followDelta);
      this.controls.target.copy(this.currentTarget.position);
      this.lastTargetPosition.copy(this.currentTarget.position);
    }

    this.controls.update();
  }
}
