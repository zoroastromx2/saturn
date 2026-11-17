// src/core/FlybyController.js
import * as THREE from 'three';
import {
  FLYBY_MOON_KEYS,
  FLYBY_PROFILES,
  generateFlybyPath
} from './FlybyPathGenerator.js';

const MAX_DELTA_SECONDS = 0.25;
const ENTRY_BLEND_SECONDS = 1.35;
const REDUCED_MOTION_SPEED_FACTOR = 0.6;

function smoothstep01(value) {
  const x = Math.min(1, Math.max(0, value));
  return x * x * (3 - 2 * x);
}

export class FlybyController {
  constructor({
    moonOrder = FLYBY_MOON_KEYS,
    targetsByKey = {},
    sunDirection = new THREE.Vector3(1, 0.35, 0.35),
    scaleFactor = 10000,
    cameraController = null,
    scene = null,
    reducedMotion = false,
    onTargetChange = null,
    onStateChange = null
  } = {}) {
    this.moonOrder = Array.isArray(moonOrder) && moonOrder.length > 0 ? moonOrder : FLYBY_MOON_KEYS;
    this.targetsByKey = targetsByKey;
    this.sunDirection = sunDirection?.clone ? sunDirection.clone() : new THREE.Vector3(1, 0.35, 0.35);
    this.scaleFactor = scaleFactor;
    this.cameraController = cameraController;
    this.scene = scene;
    this.reducedMotion = Boolean(reducedMotion);
    this.onTargetChange = onTargetChange;
    this.onStateChange = onStateChange;

    this.isActive = false;
    this.isPaused = false;
    this.selectedMoonKey = 'auto';
    this.currentMoonIndex = 0;
    this.profileIndex = 0;
    this.seed = 1;
    this.elapsedSeconds = 0;
    this.blendElapsed = 0;
    this.blendDuration = ENTRY_BLEND_SECONDS;
    this.currentPath = null;
    this.currentTargetKey = null;
    this.currentTargetMesh = null;
    this.currentDistanceKm = 0;
    this.showTrajectory = true;

    // Pre-allocated scratch vectors for zero GC inside tick()
    this.tempMoonWorldPos = new THREE.Vector3();
    this.tempSplinePoint = new THREE.Vector3();
    this.tempDesiredPos = new THREE.Vector3();
    this.tempLookOffset = new THREE.Vector3();
    this.tempLookAt = new THREE.Vector3();
    this.entryStartOffset = new THREE.Vector3();
    this.entryStartLookOffset = new THREE.Vector3();

    this.trajectoryLine = this._createTrajectoryLine();
    if (this.scene && this.trajectoryLine) {
      this.scene.add(this.trajectoryLine);
    }
  }

  _createTrajectoryLine() {
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.LineBasicMaterial({
      color: 0xe8cc8c,
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    });
    const line = new THREE.Line(geometry, material);
    line.name = 'FlybyTrajectoryPath';
    line.visible = false;
    line.frustumCulled = false;
    return line;
  }

  setReducedMotion(reduced) {
    this.reducedMotion = Boolean(reduced);
  }

  getActiveMoonKeys() {
    return this.moonOrder.filter((key) => Boolean(this.targetsByKey?.[key]));
  }

  getProgress() {
    if (!this.isActive || !this.currentPath?.durationSeconds) return 0;
    return Math.min(1, Math.max(0, this.elapsedSeconds / this.currentPath.durationSeconds));
  }

  getState() {
    const activeKeys = this.getActiveMoonKeys();
    const totalMoons = activeKeys.length || this.moonOrder.length;
    return {
      isActive: this.isActive,
      isPaused: this.isPaused,
      selectedMoonKey: this.selectedMoonKey,
      currentMoonIndex: this.currentMoonIndex,
      totalMoons,
      targetKey: this.currentTargetKey,
      profileId: this.currentPath?.profileId ?? null,
      profileTitleKey: this.currentPath?.profileTitleKey ?? null,
      periapsisAltitudeKm: this.currentPath?.periapsisAltitudeKm ?? 0,
      currentDistanceKm: this.currentDistanceKm,
      progress: this.getProgress()
    };
  }

  _notifyState() {
    this.onStateChange?.(this.getState());
  }

  _updateTrajectoryGeometry(pathData) {
    if (!this.trajectoryLine || !pathData?.trailPoints?.length) return;

    const points = pathData.trailPoints;
    const positions = new Float32Array(points.length * 3);
    for (let i = 0; i < points.length; i++) {
      const offset = i * 3;
      positions[offset] = points[i].x;
      positions[offset + 1] = points[i].y;
      positions[offset + 2] = points[i].z;
    }

    this.trajectoryLine.geometry.dispose();
    const nextGeometry = new THREE.BufferGeometry();
    nextGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.trajectoryLine.geometry = nextGeometry;
  }

  _captureEntryBlendFromCurrentCamera() {
    const cam = this.cameraController?.camera;
    const controls = this.cameraController?.controls;
    if (!cam || !this.currentTargetMesh) {
      this.blendDuration = 0;
      return;
    }

    this.currentTargetMesh.getWorldPosition(this.tempMoonWorldPos);
    this.entryStartOffset.subVectors(cam.position, this.tempMoonWorldPos);
    if (controls?.target) {
      this.entryStartLookOffset.subVectors(controls.target, this.tempMoonWorldPos);
    } else {
      this.entryStartLookOffset.set(0, 0, 0);
    }

    this.blendElapsed = 0;
    this.blendDuration = this.reducedMotion ? 0 : ENTRY_BLEND_SECONDS;
  }

  _beginPass(targetKey, profileIdx = this.profileIndex) {
    const targetMesh = this.targetsByKey?.[targetKey] ?? null;
    if (!targetMesh) return null;

    targetMesh.getWorldPosition(this.tempMoonWorldPos);
    const pathData = generateFlybyPath({
      targetMesh,
      targetKey,
      moonPosition: this.tempMoonWorldPos,
      sunDirection: this.sunDirection,
      profileIndex: profileIdx,
      seed: this.seed,
      scaleFactor: this.scaleFactor
    });

    this.currentTargetKey = targetKey;
    this.currentTargetMesh = targetMesh;
    this.currentPath = pathData;
    this.profileIndex = pathData.profileIndex;
    this.elapsedSeconds = 0;

    this.cameraController?.setFlybyActive?.(true, targetMesh);
    this._captureEntryBlendFromCurrentCamera();
    this._updateTrajectoryGeometry(pathData);

    if (this.trajectoryLine) {
      this.trajectoryLine.position.copy(this.tempMoonWorldPos);
      this.trajectoryLine.visible = this.showTrajectory;
    }

    // Apply initial pose immediately for reduced-motion or first frame consistency
    if (this.reducedMotion) {
      this._applyPoseAt(0.18, 1.0);
    } else {
      this._applyPoseAt(0, 0);
    }

    this.onTargetChange?.(targetKey, targetMesh, pathData);
    this._notifyState();
    return pathData;
  }

  start(moonSelection = this.selectedMoonKey) {
    const availableKeys = this.getActiveMoonKeys();
    if (availableKeys.length === 0) return null;

    this.isActive = true;
    this.isPaused = false;

    if (moonSelection && moonSelection !== 'auto' && this.targetsByKey?.[moonSelection]) {
      this.selectedMoonKey = moonSelection;
      const idx = availableKeys.indexOf(moonSelection);
      this.currentMoonIndex = idx >= 0 ? idx : 0;
    } else {
      this.selectedMoonKey = 'auto';
      this.currentMoonIndex = Math.min(this.currentMoonIndex, availableKeys.length - 1);
    }

    const targetKey = availableKeys[this.currentMoonIndex];
    return this._beginPass(targetKey, this.profileIndex);
  }

  stop() {
    if (!this.isActive) return;
    this.isActive = false;
    this.isPaused = false;
    this.elapsedSeconds = 0;
    this.currentPath = null;

    if (this.trajectoryLine) {
      this.trajectoryLine.visible = false;
    }
    this.cameraController?.setFlybyActive?.(false);
    this._notifyState();
  }

  pause() {
    if (!this.isActive || this.isPaused) return;
    this.isPaused = true;
    this.cameraController?.setFlybyPaused?.(true);
    this._notifyState();
  }

  resume() {
    if (!this.isActive || !this.isPaused) return;
    this.isPaused = false;
    this.cameraController?.setFlybyPaused?.(false);
    this._captureEntryBlendFromCurrentCamera();
    this._notifyState();
  }

  toggle() {
    if (this.isActive) {
      this.stop();
    } else {
      this.start(this.selectedMoonKey);
    }
    return this.isActive;
  }

  togglePause() {
    if (!this.isActive) return false;
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
    return this.isPaused;
  }

  selectMoon(moonKey) {
    const availableKeys = this.getActiveMoonKeys();
    if (availableKeys.length === 0) return null;

    if (moonKey === 'auto' || !moonKey) {
      this.selectedMoonKey = 'auto';
      if (!this.isActive) {
        return this.start('auto');
      }
      this._notifyState();
      return this.currentPath;
    }

    if (!this.targetsByKey?.[moonKey]) return null;
    this.selectedMoonKey = moonKey;
    const idx = availableKeys.indexOf(moonKey);
    if (idx >= 0) {
      this.currentMoonIndex = idx;
    }
    this.seed += 1;

    if (!this.isActive) {
      return this.start(moonKey);
    }

    this.isPaused = false;
    return this._beginPass(moonKey, this.profileIndex);
  }

  regeneratePath() {
    const availableKeys = this.getActiveMoonKeys();
    if (availableKeys.length === 0) return null;

    this.profileIndex = (this.profileIndex + 1) % FLYBY_PROFILES.length;
    this.seed += 1;

    if (!this.isActive) {
      return this.start(this.selectedMoonKey);
    }

    this.isPaused = false;
    const targetKey = this.currentTargetKey || availableKeys[this.currentMoonIndex];
    return this._beginPass(targetKey, this.profileIndex);
  }

  nextMoon() {
    const availableKeys = this.getActiveMoonKeys();
    if (availableKeys.length === 0) return null;

    this.currentMoonIndex = (this.currentMoonIndex + 1) % availableKeys.length;
    const nextKey = availableKeys[this.currentMoonIndex];
    if (this.selectedMoonKey !== 'auto') {
      this.selectedMoonKey = nextKey;
    }
    this.profileIndex = (this.profileIndex + 1) % FLYBY_PROFILES.length;
    this.seed += 1;

    if (!this.isActive) {
      this.isActive = true;
      this.isPaused = false;
    } else {
      this.isPaused = false;
    }
    return this._beginPass(nextKey, this.profileIndex);
  }

  prevMoon() {
    const availableKeys = this.getActiveMoonKeys();
    if (availableKeys.length === 0) return null;

    this.currentMoonIndex = (this.currentMoonIndex - 1 + availableKeys.length) % availableKeys.length;
    const prevKey = availableKeys[this.currentMoonIndex];
    if (this.selectedMoonKey !== 'auto') {
      this.selectedMoonKey = prevKey;
    }
    this.profileIndex = (this.profileIndex - 1 + FLYBY_PROFILES.length) % FLYBY_PROFILES.length;
    this.seed += 1;

    if (!this.isActive) {
      this.isActive = true;
      this.isPaused = false;
    } else {
      this.isPaused = false;
    }
    return this._beginPass(prevKey, this.profileIndex);
  }

  setTrajectoryVisible(visible) {
    this.showTrajectory = Boolean(visible);
    if (this.trajectoryLine) {
      this.trajectoryLine.visible = this.isActive && this.showTrajectory;
    }
  }

  _applyPoseAt(u, blendWeight) {
    if (!this.currentPath || !this.currentTargetMesh) return;
    const cam = this.cameraController?.camera;
    const controls = this.cameraController?.controls;
    if (!cam) return;

    this.currentTargetMesh.getWorldPosition(this.tempMoonWorldPos);
    const clampedU = Math.min(1, Math.max(0, u));

    // Evaluate curve in moon-local space (zero allocations via second Vector3 argument).
    this.currentPath.curve.getPointAt(clampedU, this.tempSplinePoint);
    this.currentPath.lookCurve.getPointAt(clampedU, this.tempLookOffset);

    if (blendWeight < 1) {
      const targetStartU = this.elapsedSeconds / this.currentPath.durationSeconds;
      this.currentPath.curve.getPointAt(Math.min(1, Math.max(0, targetStartU)), this.tempSplinePoint);
      this.tempSplinePoint.lerpVectors(this.entryStartOffset, this.tempSplinePoint, blendWeight);
      this.tempLookOffset.lerpVectors(this.entryStartLookOffset, this.tempLookOffset, blendWeight);
    }

    this.tempDesiredPos.copy(this.tempMoonWorldPos).add(this.tempSplinePoint);
    this.tempLookAt.copy(this.tempMoonWorldPos).add(this.tempLookOffset);

    cam.position.copy(this.tempDesiredPos);
    if (controls?.target) {
      controls.target.copy(this.tempLookAt);
    }
    cam.lookAt(this.tempLookAt);

    if (this.cameraController?.lastTargetPosition) {
      this.cameraController.lastTargetPosition.copy(this.tempMoonWorldPos);
    }

    if (this.trajectoryLine) {
      this.trajectoryLine.position.copy(this.tempMoonWorldPos);
    }

    const radiusDistance = this.tempDesiredPos.distanceTo(this.tempMoonWorldPos);
    this.currentDistanceKm = Math.max(
      0,
      (radiusDistance - this.currentPath.moonRadius) * this.scaleFactor
    );
  }

  update(deltaTime) {
    if (!this.isActive || !this.currentPath || !this.currentTargetMesh) return;

    // Keep trajectory aligned with orbiting moon even while paused
    if (this.isPaused) {
      if (this.trajectoryLine) {
        this.currentTargetMesh.getWorldPosition(this.tempMoonWorldPos);
        this.trajectoryLine.position.copy(this.tempMoonWorldPos);
      }
      return;
    }

    const rawDt = Math.min(Math.max(Number(deltaTime) || 0, 0), MAX_DELTA_SECONDS);
    if (rawDt <= 0) return;

    const effectiveDt = this.reducedMotion ? rawDt * REDUCED_MOTION_SPEED_FACTOR : rawDt;
    this.elapsedSeconds += effectiveDt;
    this.blendElapsed += rawDt;

    const duration = this.currentPath.durationSeconds;
    const rawU = Math.min(1, this.elapsedSeconds / duration);
    const blendWeight =
      this.blendDuration > 0 ? smoothstep01(this.blendElapsed / this.blendDuration) : 1;

    this._applyPoseAt(rawU, blendWeight);

    if (rawU >= 1 - 1e-6) {
      if (this.selectedMoonKey === 'auto') {
        this.nextMoon();
      } else {
        this.profileIndex = (this.profileIndex + 1) % FLYBY_PROFILES.length;
        this.seed += 1;
        this._beginPass(this.currentTargetKey, this.profileIndex);
      }
      return;
    }

    this._notifyState();
  }

  dispose() {
    if (this.trajectoryLine) {
      this.scene?.remove(this.trajectoryLine);
      this.trajectoryLine.geometry?.dispose?.();
      this.trajectoryLine.material?.dispose?.();
      this.trajectoryLine = null;
    }
  }
}
