import { describe, it, expect } from 'vitest';
import {
  buildAssetPath,
  resolveQualityTier,
  selectTextureVariant
} from '../src/core/QualityTier.js';

describe('QualityTier - selección de preset', () => {
  it('el override explícito gana a cualquier heurística', () => {
    expect(
      resolveQualityTier({
        coarsePointer: true,
        deviceMemory: 2,
        maxTextureSize: 4096,
        override: 'high'
      })
    ).toBe('high');
  });

  it('ignora overrides inválidos y usa la heurística', () => {
    expect(resolveQualityTier({ override: 'ultra', deviceMemory: 16, maxTextureSize: 16384 })).toBe(
      'high'
    );
  });

  it('elige low con puntero grueso, poca memoria o maxTextureSize reducido', () => {
    expect(resolveQualityTier({ coarsePointer: true })).toBe('low');
    expect(resolveQualityTier({ deviceMemory: 4, maxTextureSize: 16384 })).toBe('low');
    expect(resolveQualityTier({ deviceMemory: 16, maxTextureSize: 4096 })).toBe('low');
  });

  it('elige high solo con memoria y maxTextureSize suficientes', () => {
    expect(resolveQualityTier({ deviceMemory: 8, maxTextureSize: 16384 })).toBe('high');
    expect(resolveQualityTier({ deviceMemory: 8, maxTextureSize: 8192 })).toBe('medium');
    expect(resolveQualityTier({ deviceMemory: 8 })).toBe('medium');
  });

  it('cae a medium cuando no hay señales (Safari sin deviceMemory)', () => {
    expect(resolveQualityTier()).toBe('medium');
    expect(resolveQualityTier({ deviceMemory: 0, maxTextureSize: null })).toBe('medium');
  });
});

describe('QualityTier - rutas de activos', () => {
  it('high conserva el archivo base y low/medium usan subcarpeta', () => {
    expect(buildAssetPath('textures/saturn_atmosphere_8k.jpg', 'high')).toBe(
      'textures/saturn_atmosphere_8k.jpg'
    );
    expect(buildAssetPath('textures/saturn_atmosphere_8k.jpg', 'low')).toBe(
      'textures/low/saturn_atmosphere_8k.jpg'
    );
    expect(buildAssetPath('/textures/earth_daymap_4k.jpg', 'medium')).toBe(
      'textures/medium/earth_daymap_4k.jpg'
    );
    expect(buildAssetPath('models/titan.glb', 'low')).toBe('models/titan.glb');
  });

  it('usa el manifiesto y cae al archivo base si falta la variante', () => {
    const manifest = {
      tiers: { low: { saturnAlbedo: { path: 'textures/low/saturn.jpg' } } }
    };
    expect(selectTextureVariant(manifest, 'saturnAlbedo', 'low')).toBe('textures/low/saturn.jpg');
    expect(
      selectTextureVariant(manifest, 'earthAlbedo', 'low', 'textures/earth_daymap_4k.jpg')
    ).toBe('textures/low/earth_daymap_4k.jpg');
    expect(selectTextureVariant(manifest, 'unknown', 'low')).toBeNull();
  });
});
