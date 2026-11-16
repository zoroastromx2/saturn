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

function createPioneerSource() {
  const source = new THREE.Group();
  source.name = 'PioneerSource';
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(2, 1, 4),
    new THREE.MeshStandardMaterial({ color: 0xdddddd })
  );
  mesh.position.set(1, 2, 3);
  source.add(mesh);
  return source;
}

function createSimulator(pioneerModel = null) {
  const scene = new THREE.Scene();
  const saturn = {
    eqRadius: 6.0268,
    scaleFactor: 10000,
    sunDirection: new THREE.Vector3(1, 0.35, 0.35).normalize()
  };
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000000);
  const titan = { mesh: new THREE.Object3D() };
  scene.add(titan.mesh);
  const assets = pioneerModel ? { models: { pioneer11: pioneerModel } } : null;

  return new MissionSimulator(scene, saturn, camera, { focusOnObject() {} }, titan, assets);
}

describe('Pioneer 11 GLB - Normalización y wrapper', () => {
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

    const model = await fetcher.loadPioneerModel();

    expect(requestedUrl).toContain('models/pioneer_11.glb');
    expect(model).toBe(scene);
  });

  it('debería centrar, normalizar y envolver el modelo clonado', () => {
    const simulator = createSimulator(createPioneerSource());
    const eventDays = daysSinceJ2000(MISSIONS.pioneer11.timestamp);

    simulator.loadMission('pioneer11', eventDays);

    expect(simulator.pioneerModel).not.toBeNull();
    expect(simulator.pioneerModel).not.toBe(simulator.pioneerSource);
    expect(simulator.pioneerModelWrapper).toBeInstanceOf(THREE.Group);
    expect(simulator.pioneerModelWrapper.visible).toBe(true);
    expect(simulator.proceduralProbe.visible).toBe(false);
    expect(simulator.probeGroup.visible).toBe(true);
    expect(simulator.probeVisual.children).toContain(simulator.pioneerModelWrapper);
    expect(simulator.probeVisual.children).toContain(simulator.instrumentMount);

    const localModel = simulator.pioneerModel.clone(true);
    const box = new THREE.Box3().setFromObject(localModel);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    expect(Math.max(size.x, size.y, size.z)).toBeCloseTo(2.9, 4);
    expect(center.length()).toBeLessThan(1e-4);

    simulator.pioneerModel.traverse((child) => {
      if (child.isMesh) {
        expect(child.material.envMapIntensity).toBe(1.5);
        expect(child.castShadow).toBe(true);
        expect(child.receiveShadow).toBe(true);
      }
    });
  });

  it('debería alternar entre la sonda procedural y el modelo GLB', () => {
    const simulator = createSimulator(createPioneerSource());

    simulator.loadMission('voyager1', daysSinceJ2000(MISSIONS.voyager1.timestamp));
    expect(simulator.proceduralProbe.visible).toBe(true);
    expect(simulator.pioneerModelWrapper.visible).toBe(false);

    simulator.loadMission('pioneer11', daysSinceJ2000(MISSIONS.pioneer11.timestamp));
    expect(simulator.proceduralProbe.visible).toBe(false);
    expect(simulator.pioneerModelWrapper.visible).toBe(true);

    simulator.clearMission();
    expect(simulator.probeGroup.visible).toBe(false);
    expect(simulator.pioneerModelWrapper.visible).toBe(false);
  });
});
