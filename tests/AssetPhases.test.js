import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { AssetFetcher } from '../src/core/AssetFetcher.js';

function createInstrumentedFetcher({ tier = 'low' } = {}) {
  const calls = [];
  const fractions = [];

  const textureLoader = {
    load(url, onLoad) {
      calls.push(url);
      onLoad(new THREE.Texture());
    }
  };
  const gltfLoader = {
    load(url, onLoad) {
      calls.push(url);
      onLoad({ scene: new THREE.Group() });
    }
  };
  const audioLoader = {
    load(url, onLoad) {
      calls.push(`audio:${url}`);
      onLoad({});
    }
  };
  const fetchImpl = async () => ({ ok: false, status: 404, json: async () => [] });

  const fetcher = new AssetFetcher({
    textureLoader,
    gltfLoader,
    audioLoader,
    fetchImpl,
    tier,
    onProgress: (fraction) => fractions.push(fraction)
  });

  return { fetcher, calls, fractions };
}

describe('AssetFetcher - carga por fases', () => {
  it('la fase 0 solo descarga texturas críticas y no toca modelos ni audio', async () => {
    const { fetcher, calls, fractions } = createInstrumentedFetcher();

    await fetcher.loadCriticalAssets();

    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every((url) => url.includes('textures/low/'))).toBe(true);
    expect(calls.some((url) => url.includes('models/'))).toBe(false);
    expect(calls.some((url) => url.startsWith('audio:'))).toBe(false);
    expect(fractions.at(-1)).toBe(1);
    expect(fractions.every((value, index) => index === 0 || value >= fractions[index - 1])).toBe(
      true
    );
  });

  it('la fase 1 trae lunas y modelos, pero no audio', async () => {
    const { fetcher, calls } = createInstrumentedFetcher();

    await fetcher.loadBackgroundAssets();

    expect(calls.some((url) => url.includes('models/titan.glb'))).toBe(true);
    expect(calls.some((url) => url.startsWith('audio:'))).toBe(false);
  });

  it('el audio se descarga solo al pedirlo explícitamente', async () => {
    const { fetcher, calls } = createInstrumentedFetcher();

    await fetcher.loadAudioAssets();

    expect(calls.filter((url) => url.startsWith('audio:')).length).toBe(4);
    expect(fetcher.assets.saturnAudioBuffer).toBeTruthy();
  });

  it('el preset high usa las rutas base', async () => {
    const { fetcher, calls } = createInstrumentedFetcher({ tier: 'high' });

    await fetcher.loadCriticalAssets();

    expect(calls.every((url) => !url.includes('textures/low/'))).toBe(true);
  });
});
