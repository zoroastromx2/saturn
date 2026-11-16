import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { MinorMoonsSimulator } from '../src/core/MinorMoonsSimulator.js';
import { AssetFetcher } from '../src/core/AssetFetcher.js';

globalThis.document = {
  createElement: () => ({
    style: {},
    setAttribute() {},
    remove() {}
  })
};

const minorMoons = JSON.parse(
  readFileSync(new URL('../public/data/minor_moons.json', import.meta.url), 'utf8')
);

const REQUIRED_FIELDS = ['a', 'e', 'i', 'lan', 'argP', 'maEpoch', 'n', 'radius'];

describe('MinorMoonsSimulator - Catálogo GPU de lunas irregulares', () => {
  it('debería contener 135 lunas con los ocho elementos orbitales requeridos', () => {
    expect(minorMoons).toHaveLength(135);
    minorMoons.forEach((moon) => {
      REQUIRED_FIELDS.forEach((field) => {
        expect(typeof moon[field]).toBe('number');
        expect(Number.isFinite(moon[field])).toBe(true);
      });
    });
  });

  it('debería construir un InstancedMesh con los ocho buffers orbitales', () => {
    const scene = { add() {} };
    const sim = new MinorMoonsSimulator(scene, minorMoons);

    expect(sim.mesh).toBeInstanceOf(THREE.InstancedMesh);
    expect(sim.mesh.count).toBe(135);
    expect(sim.mesh.frustumCulled).toBe(false);
    expect(sim.mesh.geometry).toBeInstanceOf(THREE.IcosahedronGeometry);
    expect(sim.mesh.geometry.parameters.radius).toBe(1);
    expect(sim.mesh.geometry.parameters.detail).toBe(0);

    const attributeNames = [
      'aAxis',
      'aEcc',
      'aInc',
      'aLan',
      'aArgP',
      'aMaEpoch',
      'aMeanMotion',
      'aRadius'
    ];

    attributeNames.forEach((name) => {
      const attribute = sim.mesh.geometry.getAttribute(name);
      expect(attribute).toBeInstanceOf(THREE.InstancedBufferAttribute);
      expect(attribute.count).toBe(135);
      expect(attribute.itemSize).toBe(1);
    });

    expect(sim.mesh.geometry.getAttribute('aAxis').getX(12)).toBeCloseTo(minorMoons[12].a);
    expect(sim.mesh.geometry.getAttribute('aMeanMotion').getX(42)).toBeCloseTo(minorMoons[42].n);
    expect(sim.mesh.geometry.getAttribute('aRadius').getX(134)).toBeCloseTo(minorMoons[134].radius);
  });

  it('debería inyectar la mecánica kepleriana en el vertex shader y actualizar solo el uniform', () => {
    const sim = new MinorMoonsSimulator({ add() {} }, minorMoons);
    const material = sim.mesh.material;
    const shader = { vertexShader: '#include <begin_vertex>', uniforms: {} };

    material.onBeforeCompile(shader);
    sim.update(123.5);

    expect(shader.uniforms.uDaysSinceEpoch).toBe(material.userData.uDaysSinceEpoch);
    expect(material.userData.uDaysSinceEpoch.value).toBe(123.5);
    expect(shader.vertexShader).toContain('attribute float aAxis;');
    expect(shader.vertexShader).toContain('float M = aMaEpoch + (aMeanMotion * uDaysSinceEpoch);');
    expect(shader.vertexShader).toContain('vec3 transformed = vec3(position) * aRadius;');
    expect(shader.vertexShader).toContain('transformed.x += finalX;');
    expect(shader.vertexShader).not.toContain('#include <begin_vertex>');
  });

  it('debería crear una etiqueta CSS2D por grupo y animarla con la misma cinemática', () => {
    const sim = new MinorMoonsSimulator({ add() {} }, minorMoons);

    expect(sim.flagshipData).toHaveLength(3);
    expect(sim.groupLabels).toHaveLength(3);
    expect(sim.groupLabels.map(({ obj }) => obj.element.textContent)).toEqual([
      'Grupo Nórdico',
      'Grupo Galo',
      'Grupo Inuit'
    ]);
    sim.groupLabels.forEach(({ obj }) => {
      expect(obj.element.className).toBe('celestial-label minor-group-label');
      expect(sim.mesh.children).toContain(obj);
    });

    sim.update(0);
    const initialPosition = sim.groupLabels[0].obj.position.clone();
    sim.update(10);
    const updatedPosition = sim.groupLabels[0].obj.position;

    expect(updatedPosition.distanceTo(initialPosition)).toBeGreaterThan(0);
    expect(Number.isFinite(updatedPosition.x)).toBe(true);
    expect(Number.isFinite(updatedPosition.y)).toBe(true);
    expect(Number.isFinite(updatedPosition.z)).toBe(true);
  });

  it('debería ocultar y mostrar las tres etiquetas de grupo', () => {
    const sim = new MinorMoonsSimulator({ add() {} }, minorMoons);

    sim.setLabelsVisible(true);
    sim.groupLabels.forEach(({ obj }) => expect(obj.visible).toBe(true));

    sim.setLabelsVisible(false);
    sim.groupLabels.forEach(({ obj }) => expect(obj.visible).toBe(false));
  });
});

describe('AssetFetcher - Catálogo de lunas menores', () => {
  it('debería cargar y parsear minor_moons.json dentro de assets', async () => {
    let requestedUrl = null;
    const textureLoader = {
      load(url, onLoad) {
        onLoad({ url, colorSpace: null, wrapS: null, mapping: null });
      }
    };
    const audioLoader = {
      load(url, onLoad) {
        onLoad({ url });
      }
    };
    const fetcher = new AssetFetcher({
      textureLoader,
      audioLoader,
      retryDelayMs: 0,
      fetchImpl: async (url) => {
        requestedUrl = url;
        return { ok: true, json: async () => minorMoons };
      }
    });

    const assets = await fetcher.loadAllAssets();

    expect(requestedUrl).toContain('data/minor_moons.json');
    expect(assets.minorMoons).toHaveLength(135);
    expect(assets.minorMoons[0]).toEqual(minorMoons[0]);
  });
});
