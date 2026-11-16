// src/core/TextureStudioController.js
import * as THREE from 'three';
import { getTextureTarget } from './TexturePromptCatalog.js';

function loadImageElement(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      try {
        if (typeof img.decode === 'function') {
          await img.decode();
        }
      } catch {
        // Algunos navegadores resuelven onload aunque decode falle en SVG/data URLs.
      }
      resolve(img);
    };
    img.onerror = () => {
      reject(new Error('No se pudo decodificar la textura generada.'));
    };
    img.src = url;
  });
}

export async function defaultCreateTextureFromUrl(url, { isRing = false, maxAnisotropy = 8 } = {}) {
  const image = await loadImageElement(url);
  const texture = new THREE.Texture(image);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = isRing ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = Math.max(1, maxAnisotropy);
  texture.needsUpdate = true;
  return texture;
}

export class TextureStudioController {
  constructor({
    saturnSim,
    moonsById = {},
    fetchImpl = (...args) => fetch(...args),
    createTextureFromUrl = defaultCreateTextureFromUrl,
    maxAnisotropy = 8
  } = {}) {
    this.saturnSim = saturnSim;
    this.moonsById = moonsById;
    this.fetchImpl = fetchImpl;
    this.createTextureFromUrl = createTextureFromUrl;
    this.maxAnisotropy = maxAnisotropy;

    this.baselines = new Map();
    this.overrides = new Map();
  }

  _getTargetBinding(targetId) {
    if (targetId === 'rings') {
      const uniforms = this.saturnSim?.ringsMesh?.material?.uniforms;
      if (!uniforms?.uRingTexture) return null;
      return {
        type: 'rings',
        uniforms
      };
    }

    const moonSim = this.moonsById?.[targetId];
    const uniforms = moonSim?.mesh?.material?.uniforms;
    if (!uniforms?.tColor) return null;

    return {
      type: 'moon',
      uniforms,
      flipY: moonSim?.mesh?.userData?.textureFlipY
    };
  }

  _captureBaselineIfNeeded(targetId) {
    if (this.baselines.has(targetId)) {
      return this.baselines.get(targetId);
    }

    const binding = this._getTargetBinding(targetId);
    if (!binding) {
      throw new Error(`Target not bound in scene: ${targetId}`);
    }

    if (binding.type === 'rings') {
      const baseline = {
        type: 'rings',
        texture: binding.uniforms.uRingTexture.value ?? null
      };
      this.baselines.set(targetId, baseline);
      return baseline;
    }

    const baseColorVec = binding.uniforms.uBaseColor?.value;
    const baseline = {
      type: 'moon',
      texture: binding.uniforms.tColor.value ?? null,
      baseColor: baseColorVec
        ? { x: baseColorVec.x, y: baseColorVec.y, z: baseColorVec.z }
        : { x: 1, y: 1, z: 1 }
    };
    this.baselines.set(targetId, baseline);
    return baseline;
  }

  applyTexture(targetId, texture, meta = {}) {
    const target = getTextureTarget(targetId);
    if (!target) {
      throw new Error(`Unsupported texture target: ${targetId}`);
    }

    const binding = this._getTargetBinding(targetId);
    if (!binding) {
      throw new Error(`Target not bound in scene: ${targetId}`);
    }

    const baseline = this._captureBaselineIfNeeded(targetId);
    const previousOverride = this.overrides.get(targetId);

    if (binding.type === 'rings') {
      binding.uniforms.uRingTexture.value = texture;
    } else {
      if (binding.flipY === false) {
        texture.flipY = false;
        texture.needsUpdate = true;
      }
      binding.uniforms.tColor.value = texture;
      if (binding.uniforms.uBaseColor?.value?.set) {
        binding.uniforms.uBaseColor.value.set(1.0, 1.0, 1.0);
      }
    }

    if (
      previousOverride?.texture &&
      previousOverride.texture !== texture &&
      previousOverride.texture !== baseline.texture &&
      typeof previousOverride.texture.dispose === 'function'
    ) {
      previousOverride.texture.dispose();
    }

    const record = {
      targetId,
      texture,
      dataUrl: meta.dataUrl || '',
      mimeType: meta.mimeType || 'image/png',
      resolution: meta.resolution || '2K',
      aspectRatio: meta.aspectRatio || target.aspectRatio,
      promptUsed: meta.promptUsed || '',
      generatedAt: meta.generatedAt || Date.now()
    };

    this.overrides.set(targetId, record);
    return record;
  }

  async applyImageUrl(targetId, url, meta = {}) {
    const isRing = targetId === 'rings';
    const texture = await this.createTextureFromUrl(url, {
      isRing,
      maxAnisotropy: this.maxAnisotropy
    });
    return this.applyTexture(targetId, texture, {
      ...meta,
      dataUrl: meta.dataUrl || url
    });
  }

  async generateAndApply({ targetId, resolution = '2K', customPrompt = '' }) {
    const response = await this.fetchImpl('/api/textures/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        targetId,
        resolution,
        customPrompt
      })
    });

    let payload;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const message =
        payload?.error || `Error HTTP ${response.status} al generar la textura.`;
      throw new Error(message);
    }

    if (!payload?.dataUrl) {
      throw new Error('La respuesta del servidor no incluyó ninguna imagen.');
    }

    return this.applyImageUrl(targetId, payload.dataUrl, payload);
  }

  resetTarget(targetId) {
    const baseline = this.baselines.get(targetId);
    const binding = this._getTargetBinding(targetId);
    const override = this.overrides.get(targetId);

    if (baseline && binding) {
      if (binding.type === 'rings') {
        binding.uniforms.uRingTexture.value = baseline.texture;
      } else {
        binding.uniforms.tColor.value = baseline.texture;
        if (binding.uniforms.uBaseColor?.value?.set && baseline.baseColor) {
          binding.uniforms.uBaseColor.value.set(
            baseline.baseColor.x,
            baseline.baseColor.y,
            baseline.baseColor.z
          );
        }
      }
    }

    if (
      override?.texture &&
      (!baseline || override.texture !== baseline.texture) &&
      typeof override.texture.dispose === 'function'
    ) {
      override.texture.dispose();
    }

    return this.overrides.delete(targetId);
  }

  resetAll() {
    for (const targetId of Array.from(this.overrides.keys())) {
      this.resetTarget(targetId);
    }
  }

  hasOverride(targetId) {
    return this.overrides.has(targetId);
  }

  getOverride(targetId) {
    return this.overrides.get(targetId) ?? null;
  }
}
