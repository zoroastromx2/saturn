// src/core/CameraController.js
import * as THREE from 'three';
import { gsap } from 'gsap';
import { prefersReducedMotion, transitionDuration, watchReducedMotion } from './ReducedMotion.js';

const TRANSITION_DURATION = 2.0;

export class CameraController {
  constructor(camera, controls, { reducedMotion = prefersReducedMotion() } = {}) {
    this.camera = camera;
    this.controls = controls;
    this.reducedMotion = Boolean(reducedMotion);
    this.stopWatchingMotion = watchReducedMotion((reduced) => {
      this.reducedMotion = reduced;
    });

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
    this.defaultFov = camera.fov;
    this.isInstrumentLocked = false;
    this.activeLensMode = 'WAC';
    this.instrumentTween = null;
    this.opticsPass = null;
    this.opticsEnabled = true;
    this.activeOpticsMode = 0;
    this.surfaceMount = null;
    this.surfaceOrigin = new THREE.Vector3(0, 0, 0);
  }

  setOpticsPass(opticsPass) {
    this.opticsPass = opticsPass;
    this.applyOpticsMode(this.activeOpticsMode);
  }

  applyOpticsMode(mode) {
    this.activeOpticsMode = mode;
    const resolvedMode = this.isInstrumentLocked && this.opticsEnabled ? mode : 0;
    if (this.opticsPass?.uniforms?.uOpticsMode) {
      this.opticsPass.uniforms.uOpticsMode.value = resolvedMode;
    }
  }

  toggleOpticsEmulation() {
    if (!this.isInstrumentLocked) return this.opticsEnabled;

    this.opticsEnabled = !this.opticsEnabled;
    this.applyOpticsMode(this.activeOpticsMode);
    return this.opticsEnabled;
  }

  engageInstrumentView(missionSim) {
    const config = missionSim?.getActiveOpticalConfig?.();
    if (!missionSim?.activeMission || !config) return;

    if (this.tween) {
      this.tween.kill();
      this.tween = null;
    }

    this.isInstrumentLocked = true;
    this.isSurfaceLocked = false;
    this.surfaceMount = null;
    this.currentTarget = null;
    this.controls.enabled = false;

    const defaultFov = Number(config.defaultFov) || 32;
    this.activeLensMode = defaultFov <= 16 ? 'NAC' : 'WAC';
    this.opticsEnabled = true;
    this.applyOpticsMode(Number(missionSim.activeMission?.opticsMode) || 0);
    this.setInstrumentFov(defaultFov, 0.8);
  }

  toggleInstrumentLens() {
    if (!this.isInstrumentLocked) return this.activeLensMode;

    this.activeLensMode = this.activeLensMode === 'WAC' ? 'NAC' : 'WAC';
    this.setInstrumentFov(this.activeLensMode === 'WAC' ? 32 : 10, 0.6);
    return this.activeLensMode;
  }

  setInstrumentFov(fov, duration) {
    if (this.instrumentTween) {
      this.instrumentTween.kill();
    }

    this.instrumentTween = gsap.to(this.camera, {
      fov,
      duration: transitionDuration(duration, this.reducedMotion),
      ease: 'power2.out',
      onUpdate: () => this.camera.updateProjectionMatrix(),
      onComplete: () => {
        this.camera.updateProjectionMatrix();
        this.instrumentTween = null;
      }
    });
  }

  exitInstrumentView() {
    if (!this.isInstrumentLocked) return;

    this.isInstrumentLocked = false;
    this.isSurfaceLocked = false;
    this.surfaceMount = null;
    this.activeLensMode = 'WAC';
    this.opticsEnabled = true;
    this.applyOpticsMode(0);

    if (this.instrumentTween) {
      this.instrumentTween.kill();
      this.instrumentTween = null;
    }

    this.camera.fov = this.defaultFov;
    this.camera.updateProjectionMatrix();
    this.controls.enabled = true;
  }

  focusOn(targetMesh, distanceMultiplier, elevationBias = 0.35) {
    if (!targetMesh) return;
    const radius =
      targetMesh.geometry?.parameters?.radius ??
      targetMesh.geometry?.boundingSphere?.radius ??
      targetMesh.userData?.radius ??
      1;
    this.focusOnObject(targetMesh, radius * distanceMultiplier, elevationBias);
  }

  focusOnObject(targetObject, distance, elevationBias = 0.35) {
    if (!targetObject) return;
    this.exitInstrumentView();

    this.isSurfaceLocked = false;
    this.surfaceMount = null;
    this.controls.enabled = true;

    if (this.tween) {
      this.tween.kill();
    }

    this.currentTarget = targetObject;
    this.focusDistance = Math.max(0.05, distance);

    this.startPosition.copy(this.camera.position);
    this.startTarget.copy(this.controls.target);
    targetObject.getWorldPosition(this.targetPosition);
    this.lastTargetPosition.copy(this.targetPosition);

    // Mantiene el ángulo de visión actual y añade una ligera elevación.
    this.offsetDirection.copy(this.startPosition).sub(this.targetPosition);
    if (this.offsetDirection.lengthSq() < 1e-8) {
      this.offsetDirection.set(0, 0.5, 1);
    }
    this.offsetDirection.normalize();
    this.offsetDirection.y += elevationBias;
    this.offsetDirection.normalize();

    this.progress.value = 0;
    this.tween = gsap.to(this.progress, {
      value: 1,
      duration: transitionDuration(TRANSITION_DURATION, this.reducedMotion),
      ease: 'power3.inOut',
      onUpdate: () => this.applyTransition(),
      onComplete: () => {
        this.applyTransition();
        this.lastTargetPosition.copy(this.targetPosition);
        this.tween = null;
      }
    });
  }

  landOnSurface(targetSimulator) {
    const mount = targetSimulator?.surfaceCameraMount;
    if (!mount) return;
    this.exitInstrumentView();

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
      duration: transitionDuration(TRANSITION_DURATION, this.reducedMotion),
      ease: 'power3.inOut',
      onUpdate: () => {
        mount.getWorldPosition(this.targetPosition);
        this.camera.position.lerpVectors(
          this.startPosition,
          this.targetPosition,
          this.progress.value
        );
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
    this.currentTarget.getWorldPosition(this.targetPosition);
    this.endPosition
      .copy(this.targetPosition)
      .addScaledVector(this.offsetDirection, this.focusDistance);

    this.camera.position.lerpVectors(this.startPosition, this.endPosition, this.progress.value);
    this.controls.target.lerpVectors(this.startTarget, this.targetPosition, this.progress.value);
    this.camera.lookAt(this.controls.target);
  }

  update() {
    if (this.isInstrumentLocked) return;

    if (this.currentTarget && !this.tween && !this.isSurfaceLocked) {
      // Sigue la traslación orbital sin perder el encuadre elegido.
      this.currentTarget.getWorldPosition(this.targetPosition);
      this.followDelta.subVectors(this.targetPosition, this.lastTargetPosition);
      this.camera.position.add(this.followDelta);
      this.controls.target.copy(this.targetPosition);
      this.lastTargetPosition.copy(this.targetPosition);
    }

    this.controls.update();
  }
}
