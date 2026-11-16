import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { SnapshotExporter } from '../src/core/SnapshotExporter.js';

function createDomStub() {
  const textCalls = [];
  const context = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: '',
    textBaseline: '',
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn((text) => textCalls.push(String(text))),
    measureText: vi.fn((text) => ({ width: String(text).length * 6 }))
  };

  const outputCanvas = {
    width: 0,
    height: 0,
    getContext: () => context,
    toDataURL: vi.fn(() => 'data:image/png;base64,snapshot')
  };
  const clickedLinks = [];

  const documentStub = {
    createElement: (tag) => {
      if (tag === 'canvas') return outputCanvas;
      const link = {
        style: {},
        href: '',
        download: '',
        click: vi.fn(() => clickedLinks.push(link)),
        remove: vi.fn()
      };
      return link;
    },
    body: {
      appendChild: vi.fn()
    }
  };

  return { context, outputCanvas, clickedLinks, documentStub, textCalls };
}

describe('SnapshotExporter - Captura JPL', () => {
  it('debería renderizar, componer el pie JPL y descargar un PNG', () => {
    const dom = createDomStub();
    globalThis.document = dom.documentStub;
    const glCanvas = { width: 1600, height: 900 };
    const composer = {
      render: vi.fn(),
      renderer: { domElement: glCanvas }
    };
    const camera = { position: new THREE.Vector3(0, 0, 3) };
    const simulationDate = new Date('2026-11-16T00:00:00Z');

    const exporter = new SnapshotExporter();
    const result = exporter.capture(composer, camera, {
      simulationDate,
      sunDirection: new THREE.Vector3(1, 0, 0),
      targetPosition: new THREE.Vector3(0, 0, 0),
      targetName: 'Saturn',
      scaleFactor: 10000,
      saturnEqRadius: 6.0268,
      missionName: 'Cassini',
      instrumentName: 'Cassini ISS - Narrow Angle (NAC) | FOV 10.0°'
    });

    expect(composer.render).toHaveBeenCalledTimes(1);
    expect(dom.outputCanvas.width).toBe(1600);
    expect(dom.outputCanvas.height).toBe(990);
    expect(dom.context.drawImage).toHaveBeenCalledWith(glCanvas, 0, 0);
    expect(dom.context.strokeRect).toHaveBeenCalled();
    expect(dom.clickedLinks).toHaveLength(1);
    expect(dom.clickedLinks[0].download).toBe('JPL_SATURN_20261116_000000.png');
    expect(result.dataUrl).toBe('data:image/png;base64,snapshot');

    const text = dom.textCalls.join(' | ');
    expect(text).toContain('NASA / JPL-CALTECH / SSI ARCHIVESIM');
    expect(text).toContain('CASSINI');
    expect(text).toContain('SOLAR PHASE ANGLE:');
    expect(text).toContain('90.0°');
    expect(text).toContain('30,000 KM');
    expect(text).toContain('2026-11-16 // 00:00:00 UTC');
    expect(text).toContain('[0.000, 0.000, 0.498] RS');
  });
});
