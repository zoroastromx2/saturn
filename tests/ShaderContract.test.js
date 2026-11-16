import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';

import { SaturnSimulator } from '../src/core/SaturnSimulator.js';
import { TitanSimulator } from '../src/core/TitanSimulator.js';
import { EnceladusSimulator } from '../src/core/EnceladusSimulator.js';
import { DiffuseRingsSimulator } from '../src/core/DiffuseRingsSimulator.js';
import { StarfieldSimulator } from '../src/core/StarfieldSimulator.js';
import { VintageOpticsShader } from '../src/shaders/VintageOpticsShader.js';

const root = process.cwd();
const shadersDir = path.join(root, 'src/shaders');

globalThis.document = {
  createElement: () => ({
    className: '',
    textContent: '',
    style: {},
    dataset: {},
    setAttribute() {},
    addEventListener() {},
    remove() {}
  })
};

/** Quita comentarios de línea y bloque para no confundir el parser. */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

/** Extrae nombres de `uniform`/`varying`, incluyendo arrays `uX[6]`. */
export function extractDeclarations(source, keyword) {
  const pattern = new RegExp(
    `\\b${keyword}\\s+(?:(?:lowp|mediump|highp)\\s+)?\\w+\\s+(\\w+)(?:\\s*\\[[^\\]]*\\])?\\s*;`,
    'g'
  );
  const names = new Set();
  const clean = stripComments(source);

  for (const match of clean.matchAll(pattern)) {
    names.add(match[1]);
  }
  return names;
}

function readShader(name) {
  return fs.readFileSync(path.join(shadersDir, name), 'utf8');
}

function createScene() {
  return new THREE.Scene();
}

function createMaterials() {
  const scene = createScene();
  const saturn = new SaturnSimulator(scene, {});

  return [
    {
      name: 'saturn',
      vertex: readShader('saturn.vert'),
      fragment: readShader('saturn.frag'),
      uniforms: saturn.saturnMesh.material.uniforms
    },
    {
      name: 'rings',
      vertex: readShader('rings.vert'),
      fragment: readShader('rings.frag'),
      uniforms: saturn.ringsMesh.material.uniforms
    },
    {
      name: 'moon',
      vertex: readShader('moon.vert'),
      fragment: readShader('moon.frag'),
      uniforms: new TitanSimulator(scene, saturn, 10000, {}).mesh.material.uniforms
    },
    {
      name: 'plume',
      vertex: readShader('plume.vert'),
      fragment: readShader('plume.frag'),
      uniforms: new EnceladusSimulator(scene, saturn, 10000, {}).plumeMaterial.uniforms
    },
    {
      name: 'diffuse_rings',
      vertex: readShader('diffuse_rings.vert'),
      fragment: readShader('diffuse_rings.frag'),
      uniforms: new DiffuseRingsSimulator(scene, saturn).material.uniforms
    },
    {
      name: 'starfield',
      vertex: readShader('starfield.vert'),
      fragment: readShader('starfield.frag'),
      uniforms: new StarfieldSimulator(scene, null, 1).mesh.material.uniforms
    },
    {
      name: 'vintage',
      vertex: VintageOpticsShader.vertexShader,
      fragment: VintageOpticsShader.fragmentShader,
      uniforms: VintageOpticsShader.uniforms
    }
  ];
}

describe('ShaderContract - parser GLSL', () => {
  it('extrae uniforms simples y con arrays, ignorando comentarios', () => {
    const source = `
      uniform float uTime; // comentario
      uniform vec3 uMoonsPosition[6];
      // uniform float noExiste;
      /* uniform vec3 tampoco; */
      varying vec2 vUv;
    `;

    expect([...extractDeclarations(source, 'uniform')]).toEqual(['uTime', 'uMoonsPosition']);
    expect([...extractDeclarations(source, 'varying')]).toEqual(['vUv']);
  });

  it('admite calificadores de precisión', () => {
    const source = 'uniform highp sampler2D tColor; uniform mediump float uX;';
    expect([...extractDeclarations(source, 'uniform')]).toEqual(['tColor', 'uX']);
  });
});

describe('ShaderContract - uniforms y varyings', () => {
  const materials = createMaterials();

  materials.forEach((material) => {
    it(`${material.name}: todos los uniforms del GLSL existen en el material`, () => {
      const declared = extractDeclarations(`${material.vertex}\n${material.fragment}`, 'uniform');
      const missing = [...declared].filter((name) => !(name in material.uniforms));

      expect(missing).toEqual([]);
      expect(declared.size).toBeGreaterThan(0);
    });

    it(`${material.name}: cada varying del fragment está declarado en el vertex`, () => {
      const vertexVaryings = extractDeclarations(material.vertex, 'varying');
      const fragmentVaryings = extractDeclarations(material.fragment, 'varying');
      const undeclared = [...fragmentVaryings].filter((name) => !vertexVaryings.has(name));

      expect(undeclared).toEqual([]);
    });
  });
});

describe('ShaderContract - inventario', () => {
  const jsSources = fs
    .readdirSync(path.join(root, 'src'), { recursive: true })
    .filter((file) => file.endsWith('.js'))
    .map((file) => fs.readFileSync(path.join(root, 'src', file), 'utf8'))
    .join('\n');

  const shaderFiles = fs
    .readdirSync(shadersDir)
    .filter((file) => file.endsWith('.vert') || file.endsWith('.frag'));

  it('todo shader tiene al menos un importador', () => {
    const orphans = shaderFiles.filter((file) => !jsSources.includes(`shaders/${file}`));
    expect(orphans).toEqual([]);
  });

  it('no quedan los shaders huérfanos conocidos', () => {
    expect(shaderFiles).not.toContain('titan.vert');
    expect(shaderFiles).not.toContain('titan.frag');
    expect(shaderFiles).not.toContain('ering.frag');
  });
});
