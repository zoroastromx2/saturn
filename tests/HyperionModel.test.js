import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { CONSTANTS } from '../src/math/AstroScale.js';
import { AssetFetcher } from '../src/core/AssetFetcher.js';
import { HyperionSimulator } from '../src/core/HyperionSimulator.js';
import { CameraController } from '../src/core/CameraController.js';
import { WHITE_TEXTURE } from '../src/core/MoonTextures.js';

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
  let registerCalls = 0;
  return {
    sunDirection: new THREE.Vector3(1, 0.35, 0.35).normalize(),
    saturnMesh: new THREE.Object3D(),
    eqRadius: 6.0268,
    polRadius: 5.4364,
    scaleFactor: 10000,
    moonShadowPositions,
    get registerCalls() {
      return registerCalls;
    },
    registerShadowMoon() {
      registerCalls += 1;
      moonShadowPositions.push(new THREE.Vector3());
      return moonShadowPositions.length - 1;
    }
  };
}

function createHyperionModelSource() {
  const colorTexture = new THREE.Texture();
  const material = new THREE.MeshStandardMaterial({ map: colorTexture });
  material.name = 'default';

  const geometry = new THREE.SphereGeometry(100, 24, 12);
  geometry.scale(2, 1, 1);
  const surface = new THREE.Mesh(geometry, material);
  surface.name = 'Object_2';

  const root = new THREE.Group();
  root.position.set(10, -4, 7);
  root.rotation.set(0.3, 0.5, 0.2);
  root.add(surface);

  const source = new THREE.Group();
  source.name = 'HyperionModelSource';
  source.add(root);
  source.updateMatrixWorld(true);

  return { source, colorTexture };
}

function computeRmsRadius(geometry) {
  const positions = geometry.attributes.position;
  let sumSquares = 0;
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    sumSquares += x * x + y * y + z * z;
  }
  return Math.sqrt(sumSquares / positions.count);
}

describe('Hiperión - Constantes y modelo GLB', () => {
  it('define el radio medio y los elementos orbitales de Hiperión', () => {
    expect(CONSTANTS.HYPERION.RADIUS).toBe(135);
    expect(CONSTANTS.HYPERION.ORBIT_SEMI_MAJOR).toBe(1500930);
    expect(CONSTANTS.HYPERION.ORBIT_PERIOD).toBeCloseTo(21.2766, 4);
    expect(CONSTANTS.HYPERION.ORBIT_ECCENTRICITY).toBeCloseTo(0.1042, 4);
    expect(CONSTANTS.HYPERION.INCLINATION).toBeCloseTo(0.43, 2);
  });

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

    const model = await fetcher.loadHyperionModel();

    expect(requestedUrl).toContain('models/hyperion.glb');
    expect(model).toBe(scene);
  });

  it('debería normalizar la geometría irregular por radio RMS y usar su textura', () => {
    const scene = new THREE.Scene();
    const saturn = createSaturnSimulator();
    const { source, colorTexture } = createHyperionModelSource();
    const simulator = new HyperionSimulator(scene, saturn, 10000, {
      models: { hyperion: source }
    });

    expect(computeRmsRadius(simulator.mesh.geometry)).toBeCloseTo(simulator.radius, 6);
    expect(simulator.mesh.geometry.boundingSphere.radius).toBeGreaterThan(simulator.radius);
    expect(simulator.mesh.geometry.parameters).toBeUndefined();
    expect(simulator.mesh.material.uniforms.tColor.value).toBe(colorTexture);
    expect(simulator.mesh.material.uniforms.tAo.value).toBe(WHITE_TEXTURE);
    expect(simulator.mesh.userData.textureFlipY).toBe(false);
    expect(simulator.mesh.name).toBe('Hyperion');
    expect(simulator.label.element.textContent).toBe('Hyperion');
    expect(simulator.shadowIndex).toBe(-1);
    expect(simulator.shadowPosition).toBeNull();
    expect(saturn.registerCalls).toBe(0);
  });

  it('debería conservar la esfera procedural si el GLB no está disponible', () => {
    const scene = new THREE.Scene();
    const simulator = new HyperionSimulator(scene, createSaturnSimulator(), 10000, {});

    expect(simulator.mesh.geometry.parameters.radius).toBeCloseTo(simulator.radius, 6);
    expect(simulator.mesh.material.uniforms.tColor.value).toBe(WHITE_TEXTURE);
  });

  it('debería encuadrar la cámara usando el radio de la geometría del GLB', () => {
    const scene = new THREE.Scene();
    const { source } = createHyperionModelSource();
    const simulator = new HyperionSimulator(scene, createSaturnSimulator(), 10000, {
      models: { hyperion: source }
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

    expect(capturedDistance).toBeCloseTo(simulator.mesh.geometry.boundingSphere.radius * 5, 6);
  });
});
