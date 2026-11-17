import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import {
  FLYBY_MOON_KEYS,
  FLYBY_PROFILES,
  generateFlybyPath,
  resolveTargetRadius
} from '../src/core/FlybyPathGenerator.js';
import { FlybyController } from '../src/core/FlybyController.js';
import { CameraController } from '../src/core/CameraController.js';

function createMoonMesh(name, radius, position = new THREE.Vector3(20, 0, 0)) {
  const geometry = new THREE.SphereGeometry(radius, 12, 12);
  geometry.computeBoundingSphere();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
  mesh.name = name;
  mesh.position.copy(position);
  mesh.updateMatrixWorld(true);
  return mesh;
}

function createTargetsFixture() {
  return {
    dione: createMoonMesh('Dione', 0.056, new THREE.Vector3(37.7, 0, 0)),
    rhea: createMoonMesh('Rhea', 0.076, new THREE.Vector3(52.7, 0, 0)),
    titan: createMoonMesh('Titan', 0.257, new THREE.Vector3(122, 0, 0)),
    enceladus: createMoonMesh('Enceladus', 0.025, new THREE.Vector3(23.8, 0, 0)),
    mimas: createMoonMesh('Mimas', 0.019, new THREE.Vector3(18.5, 0, 0)),
    tethys: createMoonMesh('Tethys', 0.053, new THREE.Vector3(29.4, 0, 0)),
    hyperion: createMoonMesh('Hyperion', 0.014, new THREE.Vector3(148, 0, 0)),
    iapetus: createMoonMesh('Iapetus', 0.073, new THREE.Vector3(356, 0, 0))
  };
}

function createCameraControllerFixture() {
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 100000);
  camera.position.set(0, 10, 40);
  const controls = {
    enabled: true,
    target: new THREE.Vector3(0, 0, 0),
    update: vi.fn()
  };
  return {
    camera,
    controls,
    controller: new CameraController(camera, controls, { reducedMotion: false })
  };
}

describe('FlybyPathGenerator', () => {
  it('starts major moon order with Dione and Rhea and exposes 4 distinct profiles', () => {
    expect(FLYBY_MOON_KEYS[0]).toBe('dione');
    expect(FLYBY_MOON_KEYS[1]).toBe('rhea');
    expect(FLYBY_PROFILES.length).toBe(4);
  });

  it('resolves target radius from geometry parameters or boundingSphere fallback', () => {
    const sphereMesh = createMoonMesh('Dione', 0.056);
    expect(resolveTargetRadius(sphereMesh)).toBeCloseTo(0.056, 5);

    const customGeo = new THREE.IcosahedronGeometry(0.12, 1);
    customGeo.computeBoundingSphere();
    const customMesh = new THREE.Mesh(customGeo);
    expect(resolveTargetRadius(customMesh)).toBeCloseTo(customGeo.boundingSphere.radius, 5);
  });

  it('enforces safe minimum clearance >= 1.48R across all profiles for Dione and Rhea', () => {
    const dioneMesh = createMoonMesh('Dione', 0.056, new THREE.Vector3(37.7, 0, 0));
    const rheaMesh = createMoonMesh('Rhea', 0.076, new THREE.Vector3(52.7, 0, 0));
    const sunDirection = new THREE.Vector3(1, 0.35, 0.35).normalize();

    for (const [key, mesh] of [
      ['dione', dioneMesh],
      ['rhea', rheaMesh]
    ]) {
      for (let profileIndex = 0; profileIndex < FLYBY_PROFILES.length; profileIndex++) {
        const path = generateFlybyPath({
          targetMesh: mesh,
          targetKey: key,
          sunDirection,
          profileIndex,
          seed: 1 + profileIndex,
          scaleFactor: 10000
        });

        expect(path.trailPoints.length).toBe(73);
        expect(path.periapsisRadius).toBeGreaterThanOrEqual(path.moonRadius * 1.48 - 1e-6);
        expect(path.periapsisAltitudeKm).toBeGreaterThan(0);

        for (let i = 0; i <= 20; i++) {
          const pt = path.curve.getPointAt(i / 20);
          const look = path.lookCurve.getPointAt(i / 20);
          expect(Number.isFinite(pt.x)).toBe(true);
          expect(Number.isFinite(pt.y)).toBe(true);
          expect(Number.isFinite(pt.z)).toBe(true);
          expect(Number.isFinite(look.x)).toBe(true);
          expect(pt.length()).toBeGreaterThanOrEqual(path.moonRadius * 1.48 - 1e-4);
        }
      }
    }
  });

  it('generates distinct trajectories when profileIndex or seed changes', () => {
    const rheaMesh = createMoonMesh('Rhea', 0.076, new THREE.Vector3(52.7, 0, 0));
    const pathA = generateFlybyPath({
      targetMesh: rheaMesh,
      targetKey: 'rhea',
      profileIndex: 0,
      seed: 1
    });
    const pathB = generateFlybyPath({
      targetMesh: rheaMesh,
      targetKey: 'rhea',
      profileIndex: 1,
      seed: 2
    });

    expect(pathA.profileId).not.toBe(pathB.profileId);
    const midA = pathA.curve.getPointAt(0.5);
    const midB = pathB.curve.getPointAt(0.5);
    expect(midA.distanceTo(midB)).toBeGreaterThan(0.01);
  });
});

describe('FlybyController', () => {
  it('starts on Dione by default, attaches trajectory to scene, and disables OrbitControls', () => {
    const scene = new THREE.Scene();
    const targetsByKey = createTargetsFixture();
    const { camera, controls, controller: cameraController } = createCameraControllerFixture();
    const onTargetChange = vi.fn();

    const flyby = new FlybyController({
      targetsByKey,
      cameraController,
      scene,
      scaleFactor: 10000,
      onTargetChange
    });

    const pathData = flyby.start();
    expect(pathData).toBeTruthy();
    expect(flyby.isActive).toBe(true);
    expect(flyby.currentTargetKey).toBe('dione');
    expect(cameraController.currentTarget).toBe(targetsByKey.dione);
    expect(cameraController.isFlybyActive).toBe(true);
    expect(controls.enabled).toBe(false);
    expect(flyby.trajectoryLine.visible).toBe(true);
    expect(onTargetChange).toHaveBeenCalledWith('dione', targetsByKey.dione, pathData);

    // CameraController.update should not call OrbitControls.update during active flyby
    cameraController.update();
    expect(controls.update).not.toHaveBeenCalled();

    flyby.update(0.2);
    expect(camera.position.distanceTo(targetsByKey.dione.position)).toBeGreaterThan(0.056);

    flyby.dispose();
    expect(flyby.trajectoryLine).toBeNull();
  });

  it('tracks moving orbiting moons and auto-advances from Dione to Rhea on completion', () => {
    const scene = new THREE.Scene();
    const targetsByKey = createTargetsFixture();
    const { camera, controller: cameraController } = createCameraControllerFixture();

    const flyby = new FlybyController({
      targetsByKey,
      cameraController,
      scene,
      scaleFactor: 10000
    });

    const pass = flyby.start('auto');
    expect(flyby.currentTargetKey).toBe('dione');

    // Move Dione along its orbit and verify trajectory and camera follow it
    targetsByKey.dione.position.set(40, 2, -5);
    targetsByKey.dione.updateMatrixWorld(true);
    flyby.update(0.2);
    expect(flyby.trajectoryLine.position.x).toBeCloseTo(40, 4);
    expect(flyby.trajectoryLine.position.y).toBeCloseTo(2, 4);

    // Advance past the pass duration (clamp is 0.25s per update)
    const stepsNeeded = Math.ceil(pass.durationSeconds / 0.25) + 2;
    for (let i = 0; i < stepsNeeded; i++) {
      flyby.update(0.25);
    }

    expect(flyby.currentTargetKey).toBe('rhea');
    expect(cameraController.currentTarget).toBe(targetsByKey.rhea);
    expect(camera.position.distanceTo(targetsByKey.rhea.position)).toBeGreaterThan(0.076);

    flyby.dispose();
  });

  it('supports single-moon selection, path regeneration, pause/resume OrbitControls handoff, reducedMotion, and stop', () => {
    const scene = new THREE.Scene();
    const targetsByKey = createTargetsFixture();
    const { controls, controller: cameraController } = createCameraControllerFixture();

    const flyby = new FlybyController({
      targetsByKey,
      cameraController,
      scene,
      reducedMotion: false
    });

    flyby.selectMoon('rhea');
    expect(flyby.isActive).toBe(true);
    expect(flyby.selectedMoonKey).toBe('rhea');
    expect(flyby.currentTargetKey).toBe('rhea');
    const firstProfile = flyby.currentPath.profileId;

    flyby.regeneratePath();
    expect(flyby.currentTargetKey).toBe('rhea');
    expect(flyby.currentPath.profileId).not.toBe(firstProfile);

    // Pause restores OrbitControls around moon
    flyby.pause();
    expect(flyby.isPaused).toBe(true);
    expect(controls.enabled).toBe(true);
    expect(cameraController.isFlybyPaused).toBe(true);

    cameraController.update();
    expect(controls.update).toHaveBeenCalled();

    const elapsedWhilePaused = flyby.elapsedSeconds;
    flyby.update(0.2);
    expect(flyby.elapsedSeconds).toBe(elapsedWhilePaused);

    // Resume disables OrbitControls again and continues spline
    flyby.resume();
    expect(flyby.isPaused).toBe(false);
    expect(controls.enabled).toBe(false);

    flyby.setReducedMotion(true);
    flyby.update(0.2);
    expect(flyby.elapsedSeconds).toBeCloseTo(elapsedWhilePaused + 0.12, 5);

    flyby.prevMoon();
    expect(flyby.currentTargetKey).toBe('dione');

    flyby.nextMoon();
    expect(flyby.currentTargetKey).toBe('rhea');

    flyby.stop();
    expect(flyby.isActive).toBe(false);
    expect(cameraController.isFlybyActive).toBe(false);
    expect(controls.enabled).toBe(true);
    expect(flyby.trajectoryLine.visible).toBe(false);

    flyby.dispose();
  });
});
