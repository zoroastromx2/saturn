import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { AssetFetcher } from '../src/core/AssetFetcher.js';
import { EnceladusSimulator } from '../src/core/EnceladusSimulator.js';
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
    ringsMesh: {
      material: {
        uniforms: {
          uEnceladusPosition: { value: new THREE.Vector3() }
        }
      }
    },
    registerShadowMoon() {
      moonShadowPositions.push(new THREE.Vector3());
      return moonShadowPositions.length - 1;
    }
  };
}

function createEnceladusModelSource() {
  const colorTexture = new THREE.Texture();
  const plumeTexture = new THREE.Texture();

  const root = new THREE.Group();
  root.rotation.x = -Math.PI / 2;

  const plumeMaterial = new THREE.MeshStandardMaterial({ map: plumeTexture });
  plumeMaterial.name = 'material';
  const plume = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 8), plumeMaterial);
  plume.name = 'gaspluim';
  plume.position.set(0.2, -0.1, -0.95);
  root.add(plume);

  const surfaceMaterial = new THREE.MeshStandardMaterial({ map: colorTexture });
  surfaceMaterial.name = 'Enceladus';
  const surface = new THREE.Mesh(
    new THREE.SphereGeometry(1, 24, 12),
    surfaceMaterial
  );
  surface.name = 'Enceladus';
  root.add(surface);

  const source = new THREE.Group();
  source.name = 'EnceladusModelSource';
  source.add(root);
  source.updateMatrixWorld(true);

  return { source, colorTexture, plumeTexture };
}

describe('Enceladus GLB - Superficie, textura y escala orbital', () => {
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

    const model = await fetcher.loadEnceladusModel();

    expect(requestedUrl).toContain('models/enceladus.glb');
    expect(model).toBe(scene);
  });

  it('debería usar geometría y color del GLB manteniendo el radio de Encélado', () => {
    const scene = new THREE.Scene();
    const { source, colorTexture, plumeTexture } = createEnceladusModelSource();
    const simulator = new EnceladusSimulator(
      scene,
      createSaturnSimulator(),
      10000,
      { models: { enceladus: source } }
    );

    expect(simulator.mesh.material.uniforms.tColor.value).toBe(colorTexture);
    expect(simulator.mesh.material.uniforms.tColor.value).not.toBe(plumeTexture);
    expect(simulator.mesh.material.uniforms.tAo.value).toBe(WHITE_TEXTURE);
    expect(simulator.mesh.geometry.boundingSphere.radius).toBeCloseTo(simulator.radius, 6);
    expect(simulator.mesh.geometry.parameters).toBeUndefined();
    expect(simulator.mesh.children).toContain(simulator.surfaceCameraMount);
    expect(simulator.plume.name).toBe('EnceladusPlume');
  });

  it('debería conservar la esfera procedural si el GLB no está disponible', () => {
    const scene = new THREE.Scene();
    const simulator = new EnceladusSimulator(scene, createSaturnSimulator(), 10000, {});

    expect(simulator.mesh.geometry.parameters.radius).toBeCloseTo(simulator.radius, 6);
    expect(simulator.mesh.material.uniforms.tColor.value).toBeTruthy();
  });

  it('debería aplicar texturas generadas con la convención UV del GLB', () => {
    const scene = new THREE.Scene();
    const { source } = createEnceladusModelSource();
    const simulator = new EnceladusSimulator(
      scene,
      createSaturnSimulator(),
      10000,
      { models: { enceladus: source } }
    );
    const controller = new TextureStudioController({
      moonsById: { enceladus: simulator }
    });
    const generatedTexture = new THREE.Texture();

    controller.applyTexture('enceladus', generatedTexture);

    expect(generatedTexture.flipY).toBe(false);
    expect(simulator.mesh.material.uniforms.tColor.value).toBe(generatedTexture);
  });

  it('debería encuadrar la cámara usando el radio de la geometría del GLB', () => {
    const scene = new THREE.Scene();
    const { source } = createEnceladusModelSource();
    const simulator = new EnceladusSimulator(
      scene,
      createSaturnSimulator(),
      10000,
      { models: { enceladus: source } }
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
