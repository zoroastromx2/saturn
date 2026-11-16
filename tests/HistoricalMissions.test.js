import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { MISSIONS, MISSION_ORDER } from '../src/data/HistoricalMissions.js';
import { MissionSimulator } from '../src/core/MissionSimulator.js';

globalThis.document = {
  createElement: () => ({
    style: { setProperty() {} },
    dataset: {},
    className: '',
    textContent: '',
    setAttribute() {},
    addEventListener() {},
    remove() {}
  })
};

const J2000_EPOCH_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
const MS_PER_DAY = 86400000;

function daysSinceJ2000(timestamp) {
  return (Date.parse(timestamp) - J2000_EPOCH_MS) / MS_PER_DAY;
}

function createSimulator(cameraController = { focusOnObject() {} }) {
  const scene = new THREE.Scene();
  const saturn = { eqRadius: 6.0268 };
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000000);
  camera.position.set(0, 18, 28);
  const titan = { mesh: new THREE.Object3D() };
  titan.mesh.position.set(100, 0, 50);
  scene.add(titan.mesh);

  return {
    scene,
    titan,
    simulator: new MissionSimulator(scene, saturn, camera, cameraController, titan)
  };
}

describe('HistoricalMissions - Catálogo y cinemática', () => {
  it('debería contener las seis misiones históricas con sus hitos', () => {
    expect(MISSION_ORDER).toHaveLength(6);
    expect(Object.keys(MISSIONS)).toHaveLength(6);

    MISSION_ORDER.forEach((key) => {
      const mission = MISSIONS[key];
      expect(mission.key).toBe(key);
      expect(Number.isNaN(Date.parse(mission.timestamp))).toBe(false);
      expect([1, 2, 3]).toContain(mission.opticsMode);
      expect(mission.controlPoints.length).toBeGreaterThanOrEqual(4);
      expect(mission.milestones.length).toBeGreaterThanOrEqual(3);
      mission.milestones.forEach((milestone) => {
        expect(milestone.t).toBeGreaterThanOrEqual(0);
        expect(milestone.t).toBeLessThanOrEqual(1);
        expect(milestone.title.length).toBeGreaterThan(0);
        expect([
          'SATURN', 'TITAN', 'ENCELADUS', 'TETIS', 'RING_F', 'VELOCITY_VECTOR'
        ]).toContain(milestone.targetKey);
        expect(milestone.targetOffset).toBeInstanceOf(THREE.Vector3);
        expect(milestone.instrumentName.length).toBeGreaterThan(0);
        expect(milestone.defaultFov).toBeGreaterThan(0);
      });
    });
  });

  it('debería crear la spline, la sonda y un marcador por hito', () => {
    const { simulator } = createSimulator();
    const mission = simulator.loadMission('pioneer11', daysSinceJ2000(MISSIONS.pioneer11.timestamp));

    expect(mission).toBe(MISSIONS.pioneer11);
    expect(simulator.activeMission).toBe(MISSIONS.pioneer11);
    expect(simulator.curve).toBeInstanceOf(THREE.CatmullRomCurve3);
    expect(simulator.pathGroup.children).toHaveLength(4);
    expect(simulator.probeGroup.visible).toBe(true);
    expect(simulator.milestoneBadges).toHaveLength(3);
    expect(simulator.milestoneBadges.map(({ element }) => element.textContent)).toEqual(
      MISSIONS.pioneer11.milestones.map(({ title }) => title)
    );
    expect(simulator.milestoneBadges[0].element.className).toBe('milestone-badge');
    expect(simulator.instrumentMount).toBeInstanceOf(THREE.Object3D);
    expect(simulator.probeVisual.children).toContain(simulator.instrumentMount);
  });

  it('debería mover la sonda a lo largo de la spline según la fecha simulada', () => {
    const { simulator } = createSimulator();
    const eventDays = daysSinceJ2000(MISSIONS.pioneer11.timestamp);

    simulator.loadMission('pioneer11', eventDays);
    const before = simulator.probeGroup.position.clone();
    simulator.update(eventDays + 0.25);
    const after = simulator.probeGroup.position.clone();

    expect(after.distanceTo(before)).toBeGreaterThan(0);
    expect(Number.isFinite(after.x)).toBe(true);
    expect(Number.isFinite(after.y)).toBe(true);
    expect(Number.isFinite(after.z)).toBe(true);
  });

  it('debería interpolar el apuntamiento óptico entre hitos', () => {
    const { simulator, titan } = createSimulator();
    const eventDays = daysSinceJ2000(MISSIONS.voyager1.timestamp);
    simulator.loadMission('voyager1', eventDays);

    titan.mesh.position.set(80, 4, -30);
    titan.mesh.updateMatrixWorld(true);
    const titanTarget = simulator.getOpticalTargetPosition(0.2, {
      saturnSim: { saturnMesh: null },
      titanSim: titan
    });
    const expectedTitanTarget = titan.mesh.getWorldPosition(new THREE.Vector3())
      .addScaledVector(MISSIONS.voyager1.milestones[0].targetOffset, simulator.eqRadius);
    expect(titanTarget.distanceTo(expectedTitanTarget)).toBeLessThan(1e-5);

    const saturnTarget = simulator.getOpticalTargetPosition(0.5, {
      saturnSim: { saturnMesh: null },
      titanSim: titan
    });
    const expectedSaturnTarget = new THREE.Vector3()
      .addScaledVector(MISSIONS.voyager1.milestones[1].targetOffset, simulator.eqRadius);
    expect(saturnTarget.distanceTo(expectedSaturnTarget)).toBeLessThan(1e-5);

    const midTarget = simulator.getOpticalTargetPosition(0.35, {
      saturnSim: { saturnMesh: null },
      titanSim: titan
    });
    const midpoint = expectedTitanTarget.clone().lerp(expectedSaturnTarget, 0.5);
    expect(midTarget.distanceTo(midpoint)).toBeLessThan(1e-5);
    expect(simulator.getRelativeVelocityKmS(0.35)).toBeGreaterThan(0);
  });

  it('debería anclar el descenso de Huygens a Titán y tocar su superficie', () => {
    const { simulator, titan } = createSimulator();
    const eventDays = daysSinceJ2000(MISSIONS.huygens.timestamp);

    simulator.loadMission('huygens', eventDays);
    simulator.update(eventDays);

    const titanWorld = titan.mesh.getWorldPosition(new THREE.Vector3());
    expect(simulator.trajectoryGroup.position.distanceTo(titanWorld)).toBeCloseTo(0, 6);

    const finalPoint = simulator.curve.getPointAt(1);
    const finalWorld = simulator.trajectoryGroup.localToWorld(finalPoint.clone());
    const titanSurfaceRadius = 2574.7 / 10000;
    expect(finalWorld.distanceTo(titanWorld)).toBeCloseTo(titanSurfaceRadius, 5);

    titan.mesh.position.set(-80, 12, 45);
    simulator.update(eventDays);
    const movedTitanWorld = titan.mesh.getWorldPosition(new THREE.Vector3());
    expect(simulator.trajectoryGroup.position.distanceTo(movedTitanWorld)).toBeCloseTo(0, 6);
  });

  it('debería enmarcar la misión y limpiar todos los recursos al deseleccionarla', () => {
    let framedTarget = null;
    let framedDistance = 0;
    const cameraController = {
      focusOnObject(target, distance) {
        framedTarget = target;
        framedDistance = distance;
      }
    };
    const { simulator } = createSimulator(cameraController);

    simulator.loadMission('voyager1', daysSinceJ2000(MISSIONS.voyager1.timestamp));
    simulator.frameMission();

    expect(framedTarget).toBe(simulator.framingAnchor);
    expect(framedDistance).toBeGreaterThan(0);

    simulator.clearMission();
    expect(simulator.pathGroup.children).toHaveLength(0);
    expect(simulator.milestoneBadges).toHaveLength(0);
    expect(simulator.activeMission).toBeNull();
    expect(simulator.probeGroup.visible).toBe(false);
  });
});
