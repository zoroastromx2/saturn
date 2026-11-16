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

function createVoyager2Source() {
  const source = new THREE.Group();
  source.name = 'Voyager2Source';
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(2, 3, 5),
    new THREE.MeshStandardMaterial({ color: 0xdddddd })
  );
  mesh.position.set(1, 2, 3);
  source.add(mesh);
  return source;
}

function createSimulator(voyager2Model = null) {
  const scene = new THREE.Scene();
  const saturn = {
    eqRadius: 6.0268,
    scaleFactor: 10000,
    sunDirection: new THREE.Vector3(1, 0.35, 0.35).normalize()
  };
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000000);
  const titan = { mesh: new THREE.Object3D() };
  scene.add(titan.mesh);
  const assets = voyager2Model ? { models: { voyager2: voyager2Model } } : null;

  return new MissionSimulator(scene, saturn, camera, { focusOnObject() {} }, titan, assets);
}

describe('Voyager 2 GLB - Normalización y wrapper', () => {
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

    const model = await fetcher.loadVoyager2Model();

    expect(requestedUrl).toContain('models/voyager_2.glb');
    expect(model).toBe(scene);
  });

  it('debería centrar, normalizar y alinear la antena al eje +Z', () => {
    const simulator = createSimulator(createVoyager2Source());
    const eventDays = daysSinceJ2000(MISSIONS.voyager2.timestamp);

    simulator.loadMission('voyager2', eventDays);

    expect(simulator.voyager2Model).not.toBeNull();
    expect(simulator.voyager2Model).not.toBe(simulator.voyager2Source);
    expect(simulator.voyager2ModelWrapper).toBeInstanceOf(THREE.Group);
    expect(simulator.voyager2ModelWrapper.visible).toBe(true);
    expect(simulator.proceduralProbe.visible).toBe(false);
    expect(simulator.probeGroup.visible).toBe(true);
    expect(simulator.probeVisual.children).toContain(simulator.voyager2ModelWrapper);
    expect(simulator.probeVisual.children).toContain(simulator.instrumentMount);
    expect(simulator.voyager2ModelWrapper.rotation.x).toBeCloseTo(Math.PI / 2);

    const localModel = simulator.voyager2Model.clone(true);
    const box = new THREE.Box3().setFromObject(localModel);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    expect(Math.max(size.x, size.y, size.z)).toBeCloseTo(3.7, 4);
    expect(center.length()).toBeLessThan(1e-4);

    simulator.voyager2Model.traverse((child) => {
      if (child.isMesh) {
        expect(child.material.envMapIntensity).toBe(1.5);
        expect(child.castShadow).toBe(true);
        expect(child.receiveShadow).toBe(true);
      }
    });
  });

  it('debería alternar entre la sonda procedural y el modelo GLB', () => {
    const simulator = createSimulator(createVoyager2Source());

    simulator.loadMission('voyager1', daysSinceJ2000(MISSIONS.voyager1.timestamp));
    expect(simulator.proceduralProbe.visible).toBe(true);
    expect(simulator.voyager2ModelWrapper.visible).toBe(false);

    simulator.loadMission('voyager2', daysSinceJ2000(MISSIONS.voyager2.timestamp));
    expect(simulator.proceduralProbe.visible).toBe(false);
    expect(simulator.voyager2ModelWrapper.visible).toBe(true);

    simulator.clearMission();
    expect(simulator.probeGroup.visible).toBe(false);
    expect(simulator.voyager2ModelWrapper.visible).toBe(false);
  });
});
