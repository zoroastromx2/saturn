// src/core/TexturePromptCatalog.js

export const VALID_RESOLUTIONS = ['1K', '2K', '4K'];
export const DEFAULT_RESOLUTION = '2K';
export const MAX_CUSTOM_PROMPT_LENGTH = 400;

export const TEXTURE_TARGETS = [
  {
    id: 'rings',
    labelKey: 'textureStudio.target.rings',
    category: 'rings',
    aspectRatio: '4:1',
    basePrompt:
      'High-resolution scientific 1D radial lookup strip texture of Saturn planetary ring system, ' +
      'strictly flat 2D texture strip filling the entire frame edge-to-edge with zero borders, zero black margins, no planet sphere, no perspective, and no text. ' +
      'Composed exclusively of crisp parallel vertical bands running straight from the top edge to the bottom edge, ' +
      'varying horizontally from left (innermost C Ring) to right (outermost A Ring): ' +
      'translucent dusky charcoal-brown C Ring on the left, dense luminous cream, champagne-gold, and pale ochre B Ring ringlets in the center-left, ' +
      'a sharp dark Cassini Division gap near center-right, and finely grooved icy beige-ivory A Ring bands with a narrow Encke gap near the right edge. ' +
      'Photorealistic Cassini spacecraft imaging style, uniform flat illumination, micro-scale icy ringlet detail.'
  },
  {
    id: 'titan',
    labelKey: 'body.titan',
    category: 'moon',
    aspectRatio: '16:9',
    basePrompt:
      'Seamless equirectangular planetary surface albedo texture map of Saturn moon Titan filling the entire frame edge-to-edge. ' +
      'Flat unlit cylindrical map projection with zero stars, zero space background, zero sphere curvature, and zero shadows. ' +
      'Golden-amber organic tholin haze bands, dark hydrocarbon seas and Kraken Mare polar basins, bright equatorial dune fields of Shangri-La and Xanadu highlands, ' +
      'Cassini ISS infrared/radar false-natural cartographic detail, crisp surface geology.'
  },
  {
    id: 'enceladus',
    labelKey: 'body.enceladus',
    category: 'moon',
    aspectRatio: '16:9',
    basePrompt:
      'Seamless equirectangular planetary surface albedo texture map of Saturn icy moon Enceladus filling the entire frame edge-to-edge. ' +
      'Flat unlit cylindrical map projection with zero stars, zero space background, zero sphere curvature, and zero shadows. ' +
      'Brilliant fresh snow-white water-ice plains, subtle blue-cyan tectonic tiger stripe fractures near the southern latitudes, ' +
      'grooved ridged terrains contrasting with ancient cratered northern regions, photorealistic Cassini ISS mosaic detail.'
  },
  {
    id: 'mimas',
    labelKey: 'body.mimas',
    category: 'moon',
    aspectRatio: '16:9',
    basePrompt:
      'Seamless equirectangular planetary surface albedo texture map of Saturn moon Mimas filling the entire frame edge-to-edge. ' +
      'Flat unlit cylindrical map projection with zero stars, zero space background, zero sphere curvature, and zero shadows. ' +
      'Heavily cratered ancient silvery-grey water-ice regolith dominated by the giant Herschel impact basin with a prominent central peak and terraced rim, ' +
      'dense overlapping micro-craters and subtle albedo variations, photorealistic Cassini spacecraft cartographic mosaic.'
  },
  {
    id: 'tethys',
    labelKey: 'body.tethys',
    category: 'moon',
    aspectRatio: '16:9',
    basePrompt:
      'Seamless equirectangular planetary surface albedo texture map of Saturn icy moon Tethys filling the entire frame edge-to-edge. ' +
      'Flat unlit cylindrical map projection with zero stars, zero space background, zero sphere curvature, and zero shadows. ' +
      'High-albedo frost-white icy crust with subtle reddish equatorial tinting, the massive Odysseus impact basin, and the sweeping Ithaca Chasma rift canyon system, ' +
      'photorealistic Cassini ISS global map detail.'
  },
  {
    id: 'dione',
    labelKey: 'body.dione',
    category: 'moon',
    aspectRatio: '16:9',
    basePrompt:
      'Seamless equirectangular planetary surface albedo texture map of Saturn moon Dione filling the entire frame edge-to-edge. ' +
      'Flat unlit cylindrical map projection with zero stars, zero space background, zero sphere curvature, and zero shadows. ' +
      'Bright icy plains crossed by dramatic wispy white tectonic ice cliff fractures (chasmata) on the trailing hemisphere, ' +
      'cratered silicate-tinted frost highlands, high-contrast Cassini spacecraft planetary mosaic.'
  },
  {
    id: 'rhea',
    labelKey: 'body.rhea',
    category: 'moon',
    aspectRatio: '16:9',
    basePrompt:
      'Seamless equirectangular planetary surface albedo texture map of Saturn moon Rhea filling the entire frame edge-to-edge. ' +
      'Flat unlit cylindrical map projection with zero stars, zero space background, zero sphere curvature, and zero shadows. ' +
      'Bright ancient heavily cratered dirty water-ice crust with wispy bright fracture streaks, ray craters like Inktomi, and subtle darker trailing terrain, ' +
      'photorealistic Cassini ISS global surface map.'
  },
  {
    id: 'iapetus',
    labelKey: 'body.iapetus',
    category: 'moon',
    aspectRatio: '16:9',
    basePrompt:
      'Seamless equirectangular planetary surface albedo texture map of Saturn two-tone moon Iapetus filling the entire frame edge-to-edge. ' +
      'Flat unlit cylindrical map projection with zero stars, zero space background, zero sphere curvature, and zero shadows. ' +
      'Dramatic dichotomy between the dark carbonaceous Cassini Regio equatorial swath and the brilliant snow-white cratered icy highlands and Roncevaux Terra, ' +
      'featuring the narrow equatorial ridge line and crisp crater detail, photorealistic Cassini global mosaic.'
  }
];

const TARGET_MAP = new Map(TEXTURE_TARGETS.map((entry) => [entry.id, entry]));

export function getTextureTarget(targetId) {
  return TARGET_MAP.get(targetId) ?? null;
}

export function normalizeCustomPrompt(customPrompt) {
  if (typeof customPrompt !== 'string') return '';
  return customPrompt.trim().slice(0, MAX_CUSTOM_PROMPT_LENGTH);
}

export function validateTextureRequest(payload) {
  const errors = [];
  const raw = payload && typeof payload === 'object' ? payload : {};

  const targetId = typeof raw.targetId === 'string' ? raw.targetId.trim() : '';
  const target = getTextureTarget(targetId);
  if (!target) {
    errors.push('Invalid or unsupported targetId.');
  }

  const resolution =
    typeof raw.resolution === 'string' ? raw.resolution.trim().toUpperCase() : DEFAULT_RESOLUTION;
  if (!VALID_RESOLUTIONS.includes(resolution)) {
    errors.push(`Invalid resolution. Expected one of: ${VALID_RESOLUTIONS.join(', ')}.`);
  }

  if (
    raw.customPrompt !== undefined &&
    raw.customPrompt !== null &&
    typeof raw.customPrompt !== 'string'
  ) {
    errors.push('customPrompt must be a string.');
  }

  const customPrompt = normalizeCustomPrompt(raw.customPrompt);

  return {
    valid: errors.length === 0,
    errors,
    normalized: {
      targetId,
      resolution,
      customPrompt
    }
  };
}

export function buildTexturePrompt(targetId, customPrompt = '') {
  const target = getTextureTarget(targetId);
  if (!target) {
    throw new Error(`Unsupported texture target: ${targetId}`);
  }

  const extra = normalizeCustomPrompt(customPrompt);
  const prompt = extra
    ? `${target.basePrompt} Additional surface/artistic direction: ${extra}`
    : target.basePrompt;

  return {
    prompt,
    aspectRatio: target.aspectRatio,
    target
  };
}
