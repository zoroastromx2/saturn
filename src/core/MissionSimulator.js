import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { MISSIONS } from '../data/HistoricalMissions.js';
import { CONSTANTS } from '../math/AstroScale.js';

const J2000_EPOCH_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
const MS_PER_DAY = 86400000;
const MS_PER_HOUR = 3600000;
const FORWARD = new THREE.Vector3(0, 0, 1);
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const PATH_SEGMENTS = 300;
const PIONEER_REAL_WIDTH_METERS = 2.9;
const PIONEER_TACTICAL_VISIBILITY = 1e7;
const PIONEER_MODEL_ROTATION = new THREE.Euler(0, 0, 0);
const VOYAGER_REAL_WIDTH_METERS = 3.7;
const VOYAGER_TACTICAL_VISIBILITY = 1e7;
const VOYAGER_MODEL_ROTATION = new THREE.Euler(Math.PI / 2, 0, 0);

function pad2(value) {
  return String(value).padStart(2, '0');
}

function formatUtcDate(date) {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())} `
    + `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())} UTC`;
}

function colorToCss(color) {
  return `#${color.toString(16).padStart(6, '0')}`;
}

export class MissionSimulator {
  constructor(
    scene,
    saturnSimulator,
    camera,
    cameraController,
    titanSimulator = null,
    assets = null
  ) {
    this.scene = scene;
    this.saturnSimulator = saturnSimulator;
    this.camera = camera;
    this.cameraController = cameraController;
    this.titanSimulator = titanSimulator;
    this.pioneerSource = assets?.models?.pioneer11 || null;
    this.pioneerModel = null;
    this.pioneerModelWrapper = null;
    this.voyagerSource = assets?.models?.voyager1 || null;
    this.voyagerModel = null;
    this.voyagerModelWrapper = null;
    this.eqRadius = saturnSimulator.eqRadius;
    this.scaleFactor = saturnSimulator.scaleFactor
      ?? (CONSTANTS.SATURN.RADIUS_EQUATORIAL / this.eqRadius);
    this.fRingRadius = (
      CONSTANTS.SATURN.F_RING_RADIUS / CONSTANTS.SATURN.RADIUS_EQUATORIAL
    ) * this.eqRadius;

    this.activeMission = null;
    this.activeKey = null;
    this.curve = null;
    this.curveCenter = new THREE.Vector3();
    this.curveRadius = 1;
    this.eventMs = 0;
    this.currentU = 0;
    this.lastDaysSinceEpoch = 0;
    this.milestoneBadges = [];
    this.lineGeometry = null;
    this.lineMaterial = null;

    this.trajectoryGroup = new THREE.Group();
    this.trajectoryGroup.name = 'MissionTrajectory';
    this.scene.add(this.trajectoryGroup);

    this.pathGroup = new THREE.Group();
    this.pathGroup.name = 'MissionPath';
    this.trajectoryGroup.add(this.pathGroup);

    this.framingAnchor = new THREE.Object3D();
    this.framingAnchor.name = 'MissionFramingAnchor';
    this.scene.add(this.framingAnchor);

    this.tempTitanPosition = new THREE.Vector3();
    this.tempProbeWorld = new THREE.Vector3();
    this.tempMarkerWorld = new THREE.Vector3();
    this.tempTangent = new THREE.Vector3();
    this.tempRight = new THREE.Vector3();
    this.tempUp = new THREE.Vector3();
    this.tempMatrix = new THREE.Matrix4();
    this.tempFrameCenter = new THREE.Vector3();
    this.tempInstrumentWorld = new THREE.Vector3();
    this.tempOpticalTangent = new THREE.Vector3();
    this.tempOpticalQuaternion = new THREE.Quaternion();
    this.tempVelocityA = new THREE.Vector3();
    this.tempVelocityB = new THREE.Vector3();
    this.opticalTarget = new THREE.Vector3();
    this.opticalTargetA = new THREE.Vector3();
    this.opticalTargetB = new THREE.Vector3();

    this.buildProbe();
  }

  buildProbe() {
    this.probeGroup = new THREE.Group();
    this.probeGroup.name = 'MissionProbe';
    this.probeGroup.visible = false;
    this.trajectoryGroup.add(this.probeGroup);

    this.probeVisual = new THREE.Group();
    this.probeGroup.add(this.probeVisual);

    const whiteMetal = new THREE.MeshStandardMaterial({
      color: 0xf4f1e6,
      metalness: 0.15,
      roughness: 0.42,
      side: THREE.DoubleSide
    });
    const kaptonGold = new THREE.MeshStandardMaterial({
      color: 0xffb700,
      metalness: 0.9,
      roughness: 0.2
    });
    const darkMetal = new THREE.MeshStandardMaterial({
      color: 0x2b2d33,
      metalness: 0.82,
      roughness: 0.34
    });
    const shieldMaterial = new THREE.MeshStandardMaterial({
      color: 0x76523d,
      metalness: 0.35,
      roughness: 0.72
    });

    const bus = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.62, 10, 1, false),
      kaptonGold
    );
    bus.rotation.x = Math.PI / 2;
    this.probeVisual.add(bus);

    const dishProfile = [];
    for (let i = 0; i <= 18; i++) {
      const t = i / 18;
      dishProfile.push(new THREE.Vector2(0.1 + t * 0.78, t * t * 0.28));
    }
    const dish = new THREE.Mesh(new THREE.LatheGeometry(dishProfile, 40), whiteMetal);
    dish.position.y = 0.52;
    dish.rotation.x = Math.PI;
    this.probeVisual.add(dish);

    const dishRim = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.014, 6, 48), whiteMetal);
    dishRim.position.y = 0.52;
    dishRim.rotation.x = Math.PI / 2;
    this.probeVisual.add(dishRim);

    const feedHorn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.075, 0.22, 8),
      darkMetal
    );
    feedHorn.position.y = 0.4;
    this.probeVisual.add(feedHorn);

    for (let i = 0; i < 3; i++) {
      const boomPivot = new THREE.Group();
      boomPivot.rotation.y = (i / 3) * Math.PI * 2;

      const boom = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 1.05, 6),
        darkMetal
      );
      boom.rotation.z = Math.PI / 2;
      boom.position.x = 0.72;
      boom.position.y = -0.13;
      boomPivot.add(boom);

      const rtg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.085, 0.085, 0.28, 8),
        darkMetal
      );
      rtg.rotation.z = Math.PI / 2;
      rtg.position.set(1.28, -0.13, 0);
      boomPivot.add(rtg);

      this.probeVisual.add(boomPivot);
    }

    const magnetometerBoom = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 2.15, 6),
      darkMetal
    );
    magnetometerBoom.rotation.z = Math.PI / 2;
    magnetometerBoom.position.set(1.08, 0.26, -0.05);
    this.probeVisual.add(magnetometerBoom);

    const magnetometerTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.052, 10, 8),
      darkMetal
    );
    magnetometerTip.position.set(2.16, 0.26, -0.05);
    this.probeVisual.add(magnetometerTip);

    const thruster = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.28, 12),
      darkMetal
    );
    thruster.rotation.x = Math.PI / 2;
    thruster.position.z = 0.46;
    this.probeVisual.add(thruster);

    const scanPlatformBoom = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.72, 6),
      darkMetal
    );
    scanPlatformBoom.rotation.z = Math.PI / 2;
    scanPlatformBoom.position.set(0.52, 0, -0.2);
    this.probeVisual.add(scanPlatformBoom);

    this.instrumentMount = new THREE.Object3D();
    this.instrumentMount.name = 'OpticalInstrumentMount';
    this.instrumentMount.position.set(0.98, -0.04, -0.26);
    this.probeVisual.add(this.instrumentMount);

    this.huygensShield = new THREE.Group();
    this.huygensShield.name = 'HuygensHeatShield';

    const shieldCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 0.34, 24),
      shieldMaterial
    );
    shieldCone.rotation.x = Math.PI / 2;
    shieldCone.position.z = 0.48;
    this.huygensShield.add(shieldCone);

    const shieldBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.34, 0.2, 24),
      shieldMaterial
    );
    shieldBase.rotation.x = Math.PI / 2;
    shieldBase.position.z = 0.32;
    this.huygensShield.add(shieldBase);

    this.huygensShield.visible = false;
    this.probeVisual.add(this.huygensShield);

    this.proceduralProbe = new THREE.Group();
    this.proceduralProbe.name = 'ProceduralProbe';
    const proceduralChildren = this.probeVisual.children
      .filter((child) => child !== this.instrumentMount);
    proceduralChildren.forEach((child) => this.proceduralProbe.add(child));
    this.probeVisual.add(this.proceduralProbe);
    this.buildPioneerProbe();
    this.buildVoyagerProbe();
  }

  buildPioneerProbe() {
    if (!this.pioneerSource) return;

    const pioneerMesh = this.pioneerSource.clone(true);
    pioneerMesh.name = 'Pioneer11Model';
    pioneerMesh.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(pioneerMesh);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const saturnRadiusMeters = CONSTANTS.SATURN.RADIUS_EQUATORIAL * 1000;
    const physicalWidth = (PIONEER_REAL_WIDTH_METERS / saturnRadiusMeters) * this.eqRadius;
    const targetSize = Math.max(physicalWidth * PIONEER_TACTICAL_VISIBILITY, 2.9);
    const scale = targetSize / maxDim;

    pioneerMesh.scale.setScalar(scale);
    pioneerMesh.position.set(
      -center.x * scale,
      -center.y * scale,
      -center.z * scale
    );

    pioneerMesh.traverse((child) => {
      if (!child.isMesh || !child.material) return;

      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        material.envMapIntensity = 1.5;
        material.needsUpdate = true;
      });
      child.castShadow = true;
      child.receiveShadow = true;
    });

    this.pioneerModelWrapper = new THREE.Group();
    this.pioneerModelWrapper.name = 'Pioneer11ModelWrapper';
    this.pioneerModelWrapper.rotation.copy(PIONEER_MODEL_ROTATION);
    this.pioneerModelWrapper.visible = false;
    this.pioneerModelWrapper.add(pioneerMesh);
    this.probeVisual.add(this.pioneerModelWrapper);
    this.pioneerModel = pioneerMesh;
  }

  buildVoyagerProbe() {
    if (!this.voyagerSource) return;

    const voyagerMesh = this.voyagerSource.clone(true);
    voyagerMesh.name = 'Voyager1Model';
    voyagerMesh.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(voyagerMesh);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const saturnRadiusMeters = CONSTANTS.SATURN.RADIUS_EQUATORIAL * 1000;
    const physicalWidth = (VOYAGER_REAL_WIDTH_METERS / saturnRadiusMeters) * this.eqRadius;
    const targetSize = Math.max(physicalWidth * VOYAGER_TACTICAL_VISIBILITY, 3.7);
    const scale = targetSize / maxDim;

    voyagerMesh.scale.setScalar(scale);
    voyagerMesh.position.set(
      -center.x * scale,
      -center.y * scale,
      -center.z * scale
    );

    voyagerMesh.traverse((child) => {
      if (!child.isMesh || !child.material) return;

      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        material.envMapIntensity = 1.5;
        material.needsUpdate = true;
      });
      child.castShadow = true;
      child.receiveShadow = true;
    });

    this.voyagerModelWrapper = new THREE.Group();
    this.voyagerModelWrapper.name = 'Voyager1ModelWrapper';
    this.voyagerModelWrapper.rotation.copy(VOYAGER_MODEL_ROTATION);
    this.voyagerModelWrapper.visible = false;
    this.voyagerModelWrapper.add(voyagerMesh);
    this.probeVisual.add(this.voyagerModelWrapper);
    this.voyagerModel = voyagerMesh;
  }

  loadMission(key, daysSinceEpoch = this.lastDaysSinceEpoch) {
    const mission = MISSIONS[key];
    if (!mission) {
      this.clearMission();
      return null;
    }

    this.clearMission();

    this.activeKey = key;
    this.activeMission = mission;
    this.eventMs = Date.parse(mission.timestamp);
    this.lastDaysSinceEpoch = daysSinceEpoch;

    const controlPoints = mission.controlPoints.map(([x, y, z]) => (
      new THREE.Vector3(x, y, z).multiplyScalar(this.eqRadius)
    ));
    this.curve = new THREE.CatmullRomCurve3(controlPoints, false, 'centripetal', 0.5);

    const sampledPoints = this.curve.getPoints(PATH_SEGMENTS);
    this.lineGeometry = new THREE.BufferGeometry().setFromPoints(sampledPoints);
    this.lineMaterial = new THREE.LineBasicMaterial({
      color: mission.color,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false
    });
    const trajectoryLine = new THREE.Line(this.lineGeometry, this.lineMaterial);
    trajectoryLine.name = `${mission.name}Trajectory`;
    trajectoryLine.frustumCulled = false;
    this.pathGroup.add(trajectoryLine);

    const bounds = new THREE.Box3().setFromPoints(sampledPoints);
    const boundingSphere = bounds.getBoundingSphere(new THREE.Sphere());
    this.curveCenter.copy(boundingSphere.center);
    this.curveRadius = Math.max(0.5, boundingSphere.radius);

    const missionColor = colorToCss(mission.color);

    mission.milestones.forEach((milestone) => {
      const point = this.curve.getPointAt(milestone.t);
      const marker = new THREE.Mesh(
        new THREE.OctahedronGeometry(1, 0),
        new THREE.MeshBasicMaterial({
          color: mission.color,
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false
        })
      );
      marker.position.copy(point);
      marker.name = `${mission.name}Milestone`;
      this.pathGroup.add(marker);

      const badge = document.createElement('div');
      badge.className = 'milestone-badge';
      badge.textContent = milestone.title;
      badge.dataset.expanded = 'false';
      badge.dataset.detail = `${formatUtcDate(new Date(
        this.eventMs + (milestone.t - mission.peakT) * mission.windowHours * MS_PER_HOUR
      ))} · ${mission.name}`;
      badge.style.setProperty('--mission-color', missionColor);
      badge.setAttribute('role', 'button');
      badge.setAttribute('tabindex', '0');
      badge.setAttribute('aria-expanded', 'false');

      const toggleBadge = () => {
        const expanded = badge.dataset.expanded !== 'true';
        badge.dataset.expanded = String(expanded);
        badge.setAttribute('aria-expanded', String(expanded));
      };
      badge.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleBadge();
      });
      badge.addEventListener('pointerdown', (event) => {
        event.stopPropagation();
      });
      badge.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleBadge();
        }
      });

      const label = new CSS2DObject(badge);
      label.position.set(0, 1.7, 0);
      marker.add(label);

      this.milestoneBadges.push({
        marker,
        label,
        element: badge,
        geometry: marker.geometry,
        material: marker.material
      });
    });

    const usePioneerModel = mission.key === 'pioneer11' && Boolean(this.pioneerModelWrapper);
    const useVoyagerModel = mission.key === 'voyager1' && Boolean(this.voyagerModelWrapper);
    if (this.proceduralProbe) {
      this.proceduralProbe.visible = !usePioneerModel && !useVoyagerModel;
    }
    if (this.pioneerModelWrapper) {
      this.pioneerModelWrapper.visible = usePioneerModel;
    }
    if (this.voyagerModelWrapper) {
      this.voyagerModelWrapper.visible = useVoyagerModel;
    }
    this.huygensShield.visible = mission.key === 'huygens';
    this.probeGroup.visible = true;
    this.update(daysSinceEpoch);

    return mission;
  }

  clearMission() {
    this.milestoneBadges.forEach(({ element, geometry, material }) => {
      element.remove?.();
      geometry.dispose();
      material.dispose();
    });
    this.milestoneBadges = [];

    if (this.lineGeometry) {
      this.lineGeometry.dispose();
      this.lineGeometry = null;
    }
    if (this.lineMaterial) {
      this.lineMaterial.dispose();
      this.lineMaterial = null;
    }

    this.pathGroup.clear();
    this.trajectoryGroup.position.set(0, 0, 0);
    this.pathGroup.visible = true;
    this.curve = null;
    this.activeMission = null;
    this.activeKey = null;
    this.eventMs = 0;
    this.probeGroup.visible = false;
    if (this.pioneerModelWrapper) {
      this.pioneerModelWrapper.visible = false;
    }
    if (this.voyagerModelWrapper) {
      this.voyagerModelWrapper.visible = false;
    }
    this.huygensShield.visible = false;
  }

  update(daysSinceEpoch, camera = this.camera) {
    this.lastDaysSinceEpoch = daysSinceEpoch;

    if (!this.activeMission || !this.curve) return;

    if (this.activeMission.anchoredToTitan && this.titanSimulator?.mesh) {
      this.titanSimulator.mesh.getWorldPosition(this.tempTitanPosition);
      this.trajectoryGroup.position.copy(this.tempTitanPosition);
    } else {
      this.trajectoryGroup.position.set(0, 0, 0);
    }

    const nowMs = J2000_EPOCH_MS + daysSinceEpoch * MS_PER_DAY;
    const deltaHours = (nowMs - this.eventMs) / MS_PER_HOUR;
    const u = THREE.MathUtils.clamp(
      this.activeMission.peakT + deltaHours / this.activeMission.windowHours,
      0,
      1
    );
    this.currentU = u;

    this.probeGroup.position.copy(this.curve.getPointAt(u));

    this.tempTangent.copy(this.curve.getTangentAt(u)).normalize();
    this.tempRight.crossVectors(WORLD_UP, this.tempTangent);
    if (this.tempRight.lengthSq() < 1e-8) {
      this.tempRight.set(1, 0, 0);
    } else {
      this.tempRight.normalize();
    }
    this.tempUp.crossVectors(this.tempTangent, this.tempRight).normalize();
    this.tempMatrix.makeBasis(this.tempRight, this.tempUp, this.tempTangent);
    this.probeGroup.quaternion.setFromRotationMatrix(this.tempMatrix);

    this.trajectoryGroup.updateMatrixWorld(true);
    this.probeGroup.getWorldPosition(this.tempProbeWorld);
    const cameraDistance = camera
      ? camera.position.distanceTo(this.tempProbeWorld)
      : 20;
    const probeScale = THREE.MathUtils.clamp(cameraDistance * 0.02, 0.12, 0.9);
    this.probeVisual.scale.setScalar(probeScale);

    this.milestoneBadges.forEach(({ marker }) => {
      marker.getWorldPosition(this.tempMarkerWorld);
      const markerDistance = camera
        ? camera.position.distanceTo(this.tempMarkerWorld)
        : cameraDistance;
      marker.scale.setScalar(
        THREE.MathUtils.clamp(markerDistance * 0.0065, 0.035, 2.8)
      );
    });

    this.tempFrameCenter.copy(this.curveCenter);
    this.trajectoryGroup.localToWorld(this.tempFrameCenter);
    this.framingAnchor.position.copy(this.tempFrameCenter);
    this.framingAnchor.updateMatrixWorld(true);
  }

  getMilestoneSegment(u) {
    const milestones = this.activeMission?.milestones;
    if (!milestones?.length) return null;

    const first = milestones[0];
    if (u <= first.t) {
      return { previous: first, next: first, local: 0 };
    }

    const last = milestones[milestones.length - 1];
    if (u >= last.t) {
      return { previous: last, next: last, local: 0 };
    }

    for (let i = 0; i < milestones.length - 1; i++) {
      const previous = milestones[i];
      const next = milestones[i + 1];
      if (u <= next.t) {
        const span = Math.max(1e-8, next.t - previous.t);
        return {
          previous,
          next,
          local: (u - previous.t) / span
        };
      }
    }

    return { previous: last, next: last, local: 0 };
  }

  getActiveOpticalConfig(u = this.currentU) {
    const milestones = this.activeMission?.milestones;
    if (!milestones?.length) return null;

    let active = milestones[0];
    for (const milestone of milestones) {
      if (milestone.t <= u + 1e-8) {
        active = milestone;
      }
    }
    return active;
  }

  resolveOpticalTarget(milestone, sceneSimulators, out) {
    const sims = sceneSimulators || {};

    switch (milestone.targetKey) {
      case 'TITAN': {
        const titanSim = sims.titanSim || this.titanSimulator;
        if (titanSim?.mesh) {
          titanSim.mesh.getWorldPosition(out);
        } else {
          out.set(0, 0, 0);
        }
        break;
      }
      case 'ENCELADUS': {
        if (sims.enceladusSim?.mesh) {
          sims.enceladusSim.mesh.getWorldPosition(out);
        } else {
          out.set(0, 0, 0);
        }
        break;
      }
      case 'TETIS': {
        if (sims.tethysSim?.mesh) {
          sims.tethysSim.mesh.getWorldPosition(out);
        } else {
          out.set(0, 0, 0);
        }
        break;
      }
      case 'RING_F': {
        this.instrumentMount.getWorldPosition(this.tempInstrumentWorld);
        const angle = Math.atan2(this.tempInstrumentWorld.z, this.tempInstrumentWorld.x);
        out.set(
          Math.cos(angle) * this.fRingRadius,
          0,
          Math.sin(angle) * this.fRingRadius
        );
        break;
      }
      case 'VELOCITY_VECTOR': {
        this.instrumentMount.getWorldPosition(this.tempInstrumentWorld);
        if (this.curve) {
          this.tempOpticalTangent.copy(this.curve.getTangentAt(this.currentU)).normalize();
          this.trajectoryGroup.getWorldQuaternion(this.tempOpticalQuaternion);
          this.tempOpticalTangent.applyQuaternion(this.tempOpticalQuaternion);
        } else {
          this.tempOpticalTangent.set(0, 0, 1);
        }
        out.copy(this.tempInstrumentWorld).addScaledVector(
          this.tempOpticalTangent,
          this.eqRadius * 0.05
        );
        break;
      }
      case 'SATURN':
      default: {
        const saturnSim = sims.saturnSim || this.saturnSimulator;
        if (saturnSim?.saturnMesh) {
          saturnSim.saturnMesh.getWorldPosition(out);
        } else {
          out.set(0, 0, 0);
        }
        break;
      }
    }

    if (milestone.targetOffset) {
      out.addScaledVector(milestone.targetOffset, this.eqRadius);
    }
    return out;
  }

  getOpticalTargetPosition(u, sceneSimulators = null, out = this.opticalTarget) {
    const segment = this.getMilestoneSegment(u);
    if (!segment) return null;

    this.resolveOpticalTarget(segment.previous, sceneSimulators, this.opticalTargetA);
    this.resolveOpticalTarget(segment.next, sceneSimulators, this.opticalTargetB);

    const local = THREE.MathUtils.clamp(segment.local, 0, 1);
    const eased = local * local * (3 - 2 * local);
    out.lerpVectors(this.opticalTargetA, this.opticalTargetB, eased);
    return out;
  }

  getRelativeVelocityKmS(u = this.currentU) {
    if (!this.curve || !this.activeMission) return 0;

    const deltaU = 0.001;
    const uA = THREE.MathUtils.clamp(u - deltaU, 0, 1);
    const uB = THREE.MathUtils.clamp(u + deltaU, 0, 1);
    const span = uB - uA;
    if (span < 1e-8) return 0;

    this.curve.getPointAt(uA, this.tempVelocityA);
    this.curve.getPointAt(uB, this.tempVelocityB);
    const distanceWorld = this.tempVelocityA.distanceTo(this.tempVelocityB);
    const missionSeconds = Math.max(1, this.activeMission.windowHours * 3600);

    return (distanceWorld / (span * missionSeconds)) * this.scaleFactor;
  }

  frameMission() {
    if (!this.activeMission || !this.curve || !this.cameraController) return;

    const verticalFov = THREE.MathUtils.degToRad(this.camera.fov);
    const horizontalFov = 2 * Math.atan(
      Math.tan(verticalFov / 2) * this.camera.aspect
    );
    const fittingDistance = this.curveRadius
      / Math.tan(Math.min(verticalFov, horizontalFov) / 2)
      * 1.35;

    this.cameraController.focusOnObject(
      this.framingAnchor,
      Math.max(4, fittingDistance),
      0.35
    );
  }

  getFollowDistance() {
    return Math.max(3.2, Math.min(7, this.curveRadius * 0.12));
  }
}
