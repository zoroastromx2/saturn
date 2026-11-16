import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { AssetFetcher } from '../src/core/AssetFetcher.js';
import { TitanSimulator } from '../src/core/TitanSimulator.js';
import { CameraController } from '../src/core/CameraController.js';

globalThis.document = {
  createElement: () => ({
    style: { setProperty() {} },
    className: '',
    textContent: '',
    setAttribute() {},
    addEventListener() {},
    remove() {}
  })
};

function createSaturnSimulator() {
  const moonShadowPositions = [];
  return {
    sunDirection: new THREE.Vector3(1, 0.35, 0.35).normalize(),
    saturnMesh: new THREE.Object3D(),
    eqRadius: 6.0268,
    polRadius: 5.4364,
    scaleFactor: 10000,
    moonShadowPositions,
    registerShadowMoon() {
      moonShadowPositions.push(new THREE.Vector3());
      return moonShadowPositions.length - 1;
    }
  };
}

function createTitanModelSource() {
  const texture = new THREE.Texture();
  const material = new THREE.MeshStandardMaterial({ map: texture });
  material.name = 'Titan';

  const root = new THREE.Group();
  root.rotation.x = -Math.PI / 2;
  root.scale.setScalar(0.01);
  const surface = new THREE.Mesh(new THREE.SphereGeometry(100, 16, 8), material);
  surface.name = 'Titan_Titan_0';
  root.add(surface);

  const source = new THREE.Group();
  source.name = 'TitanModelSource';
  source.add(root);
  source.updateMatrixWorld(true);

  return { source, texture };
}

describe('Titan GLB - Superficie y escala orbital', () => {
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

    const model = await fetcher.loadTitanModel();

    expect(requestedUrl).toContain('models/titan.glb');
    expect(model).toBe(scene);
  });

  it('debería usar la geometría y textura del GLB manteniendo el radio de Titán', () => {
    const scene = new THREE.Scene();
    const { source, texture } = createTitanModelSource();
    const simulator = new TitanSimulator(scene, createSaturnSimulator(), 10000, {
      models: { titan: source }
    });

    expect(simulator.mesh.material.uniforms.tColor.value).toBe(texture);
    expect(simulator.mesh.material.uniforms.uBaseColor.value.toArray()).toEqual([1, 1, 1]);
    expect(simulator.mesh.geometry.boundingSphere.radius).toBeCloseTo(simulator.radius, 6);
    expect(simulator.mesh.geometry.parameters).toBeUndefined();
  });

  it('debería conservar la esfera procedural si el GLB no está disponible', () => {
    const scene = new THREE.Scene();
    const simulator = new TitanSimulator(scene, createSaturnSimulator(), 10000, {});

    expect(simulator.mesh.geometry.parameters.radius).toBeCloseTo(simulator.radius, 6);
    expect(simulator.mesh.material.uniforms.tColor.value).toBeTruthy();
  });

  it('debería encuadrar la cámara usando el radio de la geometría del GLB', () => {
    const scene = new THREE.Scene();
    const { source } = createTitanModelSource();
    const simulator = new TitanSimulator(scene, createSaturnSimulator(), 10000, {
      models: { titan: source }
    });
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    const controller = new CameraController(camera, {
      enabled: true,
      target: new THREE.Vector3()
    });
    let capturedDistance = 0;
    controller.focusOnObject = (target, distance) => {
      capturedDistance = distance;
    };

    controller.focusOn(simulator.mesh, 5);

    expect(capturedDistance).toBeCloseTo(simulator.radius * 5, 6);
  });
});
