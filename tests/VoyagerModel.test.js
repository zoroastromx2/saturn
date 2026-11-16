import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { AssetFetcher } from '../src/core/AssetFetcher.js';
import { MissionSimulator } from '../src/core/MissionSimulator.js';
import { MISSIONS } from '../src/data/HistoricalMissions.js';

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

function createVoyagerSource() {
  const source = new THREE.Group();
  source.name = 'VoyagerSource';
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(2, 3, 5),
    new THREE.MeshStandardMaterial({ color: 0xdddddd })
  );
  mesh.position.set(1, 2, 3);
  source.add(mesh);
  return source;
}

function createSimulator(voyagerModel = null) {
  const scene = new THREE.Scene();
  const saturn = {
    eqRadius: 6.0268,
    scaleFactor: 10000,
    sunDirection: new THREE.Vector3(1, 0.35, 0.35).normalize()
  };
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000000);
  const titan = { mesh: new THREE.Object3D() };
  scene.add(titan.mesh);
  const assets = voyagerModel ? { models: { voyager1: voyagerModel } } : null;

  return new MissionSimulator(scene, saturn, camera, { focusOnObject() {} }, titan, assets);
}

describe('Voyager 1 GLB - Normalización y wrapper', () => {
  it('debería cargar el GLB mediante GLTFLoader', async () => {
    const scene = new THREE.Group();
    let requestedUrl = null;
    const fetcher = new AssetFetcher({
      gltfLoader: {
        load(url, onLoad) {
          requestedUrl = url;
          onLoad({ scene });
        }
      }
    });

    const model = await fetcher.loadVoyagerModel();

    expect(requestedUrl).toContain('models/voyager_1.glb');
    expect(model).toBe(scene);
  });

  it('debería centrar, normalizar y alinear la antena al eje +Z', () => {
    const simulator = createSimulator(createVoyagerSource());
    const eventDays = daysSinceJ2000(MISSIONS.voyager1.timestamp);

    simulator.loadMission('voyager1', eventDays);

    expect(simulator.voyagerModel).not.toBeNull();
    expect(simulator.voyagerModel).not.toBe(simulator.voyagerSource);
    expect(simulator.voyagerModelWrapper).toBeInstanceOf(THREE.Group);
    expect(simulator.voyagerModelWrapper.visible).toBe(true);
    expect(simulator.proceduralProbe.visible).toBe(false);
    expect(simulator.probeGroup.visible).toBe(true);
    expect(simulator.probeVisual.children).toContain(simulator.voyagerModelWrapper);
    expect(simulator.probeVisual.children).toContain(simulator.instrumentMount);
    expect(simulator.voyagerModelWrapper.rotation.x).toBeCloseTo(Math.PI / 2);

    const localModel = simulator.voyagerModel.clone(true);
    const box = new THREE.Box3().setFromObject(localModel);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    expect(Math.max(size.x, size.y, size.z)).toBeCloseTo(3.7, 4);
    expect(center.length()).toBeLessThan(1e-4);

    simulator.voyagerModel.traverse((child) => {
      if (child.isMesh) {
        expect(child.material.envMapIntensity).toBe(1.5);
        expect(child.castShadow).toBe(true);
        expect(child.receiveShadow).toBe(true);
      }
    });
  });

  it('debería alternar entre la sonda procedural y el modelo GLB', () => {
    const simulator = createSimulator(createVoyagerSource());

    simulator.loadMission('voyager2', daysSinceJ2000(MISSIONS.voyager2.timestamp));
    expect(simulator.proceduralProbe.visible).toBe(true);
    expect(simulator.voyagerModelWrapper.visible).toBe(false);

    simulator.loadMission('voyager1', daysSinceJ2000(MISSIONS.voyager1.timestamp));
    expect(simulator.proceduralProbe.visible).toBe(false);
    expect(simulator.voyagerModelWrapper.visible).toBe(true);

    simulator.clearMission();
    expect(simulator.probeGroup.visible).toBe(false);
    expect(simulator.voyagerModelWrapper.visible).toBe(false);
  });
});
