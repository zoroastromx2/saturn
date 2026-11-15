import { describe, it, expect } from 'vitest';
import { AssetFetcher } from '../src/core/AssetFetcher';
import { WHITE_TEXTURE, FLAT_NORMAL_TEXTURE } from '../src/core/MoonTextures';

function createMockTexture(url) {
  return { url, colorSpace: null, wrapS: null, mapping: null };
}

describe('AssetFetcher - Resiliencia y reintentos de carga', () => {
  it('debería reintentar una textura fallida (ej. iapetus_color.jpg) con parámetro retry y recuperarse', async () => {
    const requestedUrls = [];
    const mockTextureLoader = {
      load(url, onLoad, _onProgress, onError) {
        requestedUrls.push(url);
        if (url.includes('iapetus_color.jpg') && !url.includes('retry=2')) {
          onError(new Error('transient network error'));
          return;
        }
        onLoad(createMockTexture(url));
      }
    };

    const fetcher = new AssetFetcher({
      textureLoader: mockTextureLoader,
      audioLoader: { load: (url, onLoad) => onLoad({ url }) },
      retryDelayMs: 0,
      maxConcurrency: 4
    });

    const assets = await fetcher.loadAllAssets();

    expect(assets.iapetusColor).not.toBe(WHITE_TEXTURE);
    expect(assets.iapetusColor.url).toContain('iapetus_color.jpg?retry=2');
    expect(requestedUrls.filter((u) => u.includes('iapetus_color.jpg'))).toHaveLength(3);
  });

  it('debería usar texturas base de respaldo si una luna falla tras agotar reintentos sin abortar la app', async () => {
    const mockTextureLoader = {
      load(url, onLoad, _onProgress, onError) {
        if (url.includes('iapetus_color.jpg') || url.includes('iapetus_normal.jpg') || url.includes('iapetus_ao.jpg')) {
          onError(new Error('persistent 503'));
          return;
        }
        onLoad(createMockTexture(url));
      }
    };

    const fetcher = new AssetFetcher({
      textureLoader: mockTextureLoader,
      audioLoader: { load: (_url, _onLoad, _onProgress, onError) => onError(new Error('audio error')) },
      retryDelayMs: 0,
      maxConcurrency: 3
    });

    const assets = await fetcher.loadAllAssets();

    expect(assets.iapetusColor).toBe(WHITE_TEXTURE);
    expect(assets.iapetusNormal).toBe(FLAT_NORMAL_TEXTURE);
    expect(assets.iapetusAo).toBe(WHITE_TEXTURE);
    expect(assets.saturnAudioBuffer).toBeNull();
    expect(assets.saturnAlbedo).toBeTruthy();
  });

  it('debería respetar el límite de concurrencia al cargar los recursos', async () => {
    let active = 0;
    let maxObserved = 0;

    const mockTextureLoader = {
      load(url, onLoad) {
        active++;
        maxObserved = Math.max(maxObserved, active);
        setTimeout(() => {
          active--;
          onLoad(createMockTexture(url));
        }, 5);
      }
    };

    const mockAudioLoader = {
      load(url, onLoad) {
        active++;
        maxObserved = Math.max(maxObserved, active);
        setTimeout(() => {
          active--;
          onLoad({ url });
        }, 5);
      }
    };

    const fetcher = new AssetFetcher({
      textureLoader: mockTextureLoader,
      audioLoader: mockAudioLoader,
      retryDelayMs: 0,
      maxConcurrency: 4
    });

    await fetcher.loadAllAssets();

    expect(maxObserved).toBeLessThanOrEqual(4);
  });
});
