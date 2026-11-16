import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { AssetFetcher } from '../src/core/AssetFetcher.js';
import { MimasSimulator } from '../src/core/MimasSimulator.js';
import { CameraController } from '../src/core/CameraController.js';
import { TextureStudioController } from '../src/core/TextureStudioController.js';
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

function createMimasModelSource() {
  const colorTexture = new THREE.Texture();
  const normalTexture = new THREE.Texture();
  const material = new THREE.MeshStandardMaterial({
    map: colorTexture,
    normalMap: normalTexture
  });
  material.name = 'Mimas_mat';

  const root = new THREE.Group();
  root.rotation.x = -Math.PI / 2;
  const inner = new THREE.Group();
  inner.rotation.x = Math.PI / 2;
  const surface = new THREE.Mesh(
    new THREE.SphereGeometry(200, 24, 12),
    material
  );
  surface.name = 'Object_4';
  inner.add(surface);
  root.add(inner);

  const source = new THREE.Group();
  source.name = 'MimasModelSource';
  source.add(root);
  source.updateMatrixWorld(true);

  return { source, colorTexture, normalTexture };
}

describe('Mimas GLB - Superficie, texturas y escala orbital', () => {
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

    const model = await fetcher.loadMimasModel();

    expect(requestedUrl).toContain('models/mimas.glb');
    expect(model).toBe(scene);
  });

  it('debería usar geometría, color y normal del GLB manteniendo el radio de Mimas', () => {
    const scene = new THREE.Scene();
    const { source, colorTexture, normalTexture } = createMimasModelSource();
    const simulator = new MimasSimulator(
      scene,
      createSaturnSimulator(),
      10000,
      { models: { mimas: source } }
    );

    expect(simulator.mesh.material.uniforms.tColor.value).toBe(colorTexture);
    expect(simulator.mesh.material.uniforms.tNormal.value).toBe(normalTexture);
    expect(simulator.mesh.material.uniforms.tAo.value).toBe(WHITE_TEXTURE);
    expect(simulator.mesh.geometry.boundingSphere.radius).toBeCloseTo(simulator.radius, 6);
    expect(simulator.mesh.geometry.parameters).toBeUndefined();
    expect(simulator.mesh.rotation.y).toBeCloseTo(-2.45);
    expect(simulator.mesh.children).toContain(simulator.surfaceCameraMount);
  });

  it('debería conservar la esfera procedural si el GLB no está disponible', () => {
    const scene = new THREE.Scene();
    const simulator = new MimasSimulator(scene, createSaturnSimulator(), 10000, {});

    expect(simulator.mesh.geometry.parameters.radius).toBeCloseTo(simulator.radius, 6);
    expect(simulator.mesh.material.uniforms.tColor.value).toBeTruthy();
  });

  it('debería aplicar texturas generadas con la convención UV del GLB', () => {
    const scene = new THREE.Scene();
    const { source } = createMimasModelSource();
    const simulator = new MimasSimulator(
      scene,
      createSaturnSimulator(),
      10000,
      { models: { mimas: source } }
    );
    const controller = new TextureStudioController({
      moonsById: { mimas: simulator }
    });
    const generatedTexture = new THREE.Texture();

    controller.applyTexture('mimas', generatedTexture);

    expect(generatedTexture.flipY).toBe(false);
    expect(simulator.mesh.material.uniforms.tColor.value).toBe(generatedTexture);
  });

  it('debería encuadrar la cámara usando el radio de la geometría del GLB', () => {
    const scene = new THREE.Scene();
    const { source } = createMimasModelSource();
    const simulator = new MimasSimulator(
      scene,
      createSaturnSimulator(),
      10000,
      { models: { mimas: source } }
    );
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
