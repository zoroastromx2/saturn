// src/core/QualityTier.js
// Selección del preset de calidad y construcción de rutas de textura.

export const QUALITY_TIERS = ['low', 'medium', 'high'];
export const DEFAULT_TIER = 'medium';

const VALID_TIERS = new Set(QUALITY_TIERS);

/**
 * Elige el preset según capacidad del dispositivo. El override explícito siempre gana.
 * Sin `deviceMemory` (Safari/Firefox) se decide por `maxTextureSize` y puntero.
 */
export function resolveQualityTier({
  coarsePointer = false,
  deviceMemory = null,
  maxTextureSize = null,
  override = null
} = {}) {
  if (typeof override === 'string') {
    const normalized = override.trim().toLowerCase();
    if (VALID_TIERS.has(normalized)) return normalized;
  }

  if (typeof maxTextureSize === 'number' && maxTextureSize > 0 && maxTextureSize < 8192) {
    return 'low';
  }

  if (coarsePointer) return 'low';

  if (typeof deviceMemory === 'number' && deviceMemory > 0 && deviceMemory <= 4) {
    return 'low';
  }

  if (
    typeof deviceMemory === 'number' &&
    deviceMemory >= 8 &&
    typeof maxTextureSize === 'number' &&
    maxTextureSize >= 16384
  ) {
    return 'high';
  }

  return DEFAULT_TIER;
}

/**
 * Devuelve la ruta de una textura para el preset dado. `high` usa el archivo base;
 * `low`/`medium` viven en subcarpetas del mismo nombre.
 */
export function buildAssetPath(file, tier = DEFAULT_TIER) {
  const clean = String(file).replace(/^\/+/, '');
  if (!VALID_TIERS.has(tier) || tier === 'high') return clean;
  if (!clean.startsWith('textures/')) return clean;
  return clean.replace(/^textures\//, `textures/${tier}/`);
}

/**
 * Resuelve la ruta final de un activo usando el manifiesto generado por
 * tools/generate-texture-tiers.py. Si falta la variante, cae al archivo base.
 */
export function selectTextureVariant(manifest, key, tier = DEFAULT_TIER, fallbackFile = null) {
  const variant = manifest?.tiers?.[tier]?.[key];
  if (variant?.path) return variant.path;
  if (fallbackFile) return buildAssetPath(fallbackFile, tier);
  return null;
}
