// src/core/AssetFetcher.js
import * as THREE from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { WHITE_TEXTURE, FLAT_NORMAL_TEXTURE } from './MoonTextures.js';

export class AssetFetcher {
  constructor(options = {}) {
    this.textureLoader = options.textureLoader || new THREE.TextureLoader();
    this.audioLoader = options.audioLoader || new THREE.AudioLoader();
    this.retryDelayMs = options.retryDelayMs ?? 250;
    this.maxConcurrency = Math.max(1, options.maxConcurrency ?? 6);
    this.maxAnisotropy = Math.max(1, options.maxAnisotropy ?? 1);
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch?.bind(globalThis);
    this.activeRequests = 0;
    this.requestQueue = [];
    this.assets = {
      saturnAlbedo: null,
      ringColor: null,
      ringAlpha: null,
      earthAlbedo: null, // Para el ComparisonMode
      starmap: null,
      galacticMap: null,
      mimasColor: null,
      mimasNormal: null,
      mimasAo: null,
      tethysColor: null,
      tethysNormal: null,
      tethysAo: null,
      dioneColor: null,
      dioneNormal: null,
      dioneAo: null,
      rheaColor: null,
      rheaNormal: null,
      rheaAo: null,
      iapetusColor: null,
      iapetusNormal: null,
      iapetusAo: null,
      saturnAudioBuffer: null,
      titanAudioBuffer: null,
      enceladusAudioBuffer: null,
      mimasAudioBuffer: null,
      minorMoons: null
    };
  }

  /**
   * Carga todas las texturas requeridas de forma asíncrona con concurrencia acotada,
   * reintentos automáticos y respaldos seguros para evitar fallos transitorios de red.
   */
  async loadAllAssets() {
    console.log("Iniciando descarga de texturas de la misión Cassini...");

    try {
      let [
        saturn,
        rColor,
        rAlpha,
        earth,
        starmap,
        galacticMap,
        mimas,
        tethys,
        dione,
        rhea,
        iapetus,
        saturnAudio,
        titanAudio,
        enceladusAudio,
        mimasAudio,
        minorMoons
      ] = await Promise.all([
        this.loadTextureAsync(this.assetUrl('textures/saturn_atmosphere_8k.jpg')),
        this.loadTextureAsync(this.assetUrl('textures/saturn_rings_color.png')),
        // La máscara de densidad/alfa de los anillos (blanco = sólido, negro = vacío)
        this.loadTextureAsync(this.assetUrl('textures/saturn_rings_alpha.png')),
        this.loadOptionalTexture('textures/earth_daymap_4k.jpg'),
        this.loadOptionalTexture('textures/milky_way_8k.jpg'),
        this.loadGalacticMap(),
        this.loadMoonTextureSet('mimas'),
        this.loadMoonTextureSet('tethys'),
        this.loadMoonTextureSet('dione'),
        this.loadMoonTextureSet('rhea'),
        this.loadMoonTextureSet('iapetus'),
        this.loadAudioAsync(this.assetUrl('audio/saturn_deep_rumble.wav')),
        this.loadAudioAsync(this.assetUrl('audio/titan_winds.wav')),
        this.loadAudioAsync(this.assetUrl('audio/enceladus_ice_crackle.wav')),
        this.loadAudioAsync(this.assetUrl('audio/mimas_rocky_rumble.wav')),
        this.loadMinorMoons()
      ]);

      // Configuración estricta de espacios de color
      // Mapas de color (Albedo) deben estar en sRGB
      saturn.colorSpace = THREE.SRGBColorSpace;
      rColor.colorSpace = THREE.SRGBColorSpace;
      if (earth) {
        earth.colorSpace = THREE.SRGBColorSpace;
      }
      if (starmap) {
        starmap.colorSpace = THREE.SRGBColorSpace;
        starmap.mapping = THREE.EquirectangularReflectionMapping;
      }
      if (galacticMap) {
        this.configureGalacticMap(galacticMap);
      } else if (typeof starmap?.clone === 'function') {
        galacticMap = starmap.clone();
        this.configureGalacticMap(galacticMap);
      }

      // Mapas de datos (Alpha/Densidad, Normales) DEBEN mantenerse en Linear
      // Si el alpha se convierte a sRGB, la curva matemática de la sombra fallará
      rAlpha.colorSpace = THREE.LinearSRGBColorSpace;

      this.assets.saturnAlbedo = saturn;
      this.assets.ringColor = rColor;
      this.assets.ringAlpha = rAlpha;
      this.assets.earthAlbedo = earth;
      this.assets.starmap = starmap;
      this.assets.galacticMap = galacticMap;
      this.assets.mimasColor = mimas.color;
      this.assets.mimasNormal = mimas.normal;
      this.assets.mimasAo = mimas.ao;
      this.assets.tethysColor = tethys.color;
      this.assets.tethysNormal = tethys.normal;
      this.assets.tethysAo = tethys.ao;
      this.assets.dioneColor = dione.color;
      this.assets.dioneNormal = dione.normal;
      this.assets.dioneAo = dione.ao;
      this.assets.rheaColor = rhea.color;
      this.assets.rheaNormal = rhea.normal;
      this.assets.rheaAo = rhea.ao;
      this.assets.iapetusColor = iapetus.color;
      this.assets.iapetusNormal = iapetus.normal;
      this.assets.iapetusAo = iapetus.ao;
      this.assets.saturnAudioBuffer = saturnAudio;
      this.assets.titanAudioBuffer = titanAudio;
      this.assets.enceladusAudioBuffer = enceladusAudio;
      this.assets.mimasAudioBuffer = mimasAudio;
      this.assets.minorMoons = minorMoons;

      console.log("Texturas cargadas exitosamente.");
      return this.assets;

    } catch (error) {
      console.error("Error crítico cargando las texturas:", error);
      throw error;
    }
  }

  enqueue(task) {
    return new Promise((resolve, reject) => {
      const run = () => {
        this.activeRequests++;
        Promise.resolve()
          .then(task)
          .then(resolve, reject)
          .finally(() => {
            this.activeRequests--;
            if (this.requestQueue.length > 0) {
              const next = this.requestQueue.shift();
              next();
            }
          });
      };

      if (this.activeRequests < this.maxConcurrency) {
        run();
      } else {
        this.requestQueue.push(run);
      }
    });
  }

  delay(ms) {
    if (ms <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  withRetryParam(url, attempt) {
    if (attempt <= 0) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}retry=${attempt}`;
  }

  /**
   * Envuelve el TextureLoader de Three.js en una Promesa moderna con reintentos.
   */
  assetUrl(path) {
    const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
    return `${base}${path.replace(/^\/+/, '')}`;
  }

  async loadMinorMoons() {
    if (typeof this.fetchImpl !== 'function') {
      console.warn('No hay fetch disponible para cargar las lunas menores.');
      return [];
    }

    try {
      const response = await this.fetchImpl(this.assetUrl('data/minor_moons.json'));
      if (response.ok === false) {
        throw new Error(`Fallo al cargar lunas menores: HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('El catálogo de lunas menores no es un arreglo.');
      }
      return data;
    } catch (error) {
      console.warn('Catálogo de lunas menores no disponible:', error?.message || error);
      return [];
    }
  }

  loadSingleTexture(url) {
    return this.enqueue(() => new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => resolve(texture),
        undefined, // onProgress
        () => reject(new Error(`Fallo al cargar textura: ${url}`))
      );
    }));
  }

  async loadTextureAsync(url, retries = 3) {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (attempt > 0) {
          await this.delay(this.retryDelayMs * attempt);
        }
        return await this.loadSingleTexture(this.withRetryParam(url, attempt));
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error(`Fallo al cargar textura: ${url}`);
  }

  loadOptionalTexture(path, fallbackTexture = null) {
    return this.loadTextureAsync(this.assetUrl(path)).catch((error) => {
      console.warn(`Textura opcional no disponible (${path}), usando respaldo:`, error?.message || error);
      return fallbackTexture;
    });
  }

  loadHDRTexture(url) {
    return this.enqueue(() => new Promise((resolve, reject) => {
      new HDRLoader().load(
        url,
        (texture) => resolve(texture),
        undefined,
        () => reject(new Error(`Fallo al cargar HDR: ${url}`))
      );
    }));
  }

  async loadGalacticMap() {
    if (typeof window !== 'undefined') {
      try {
        return await this.loadHDRTexture(this.assetUrl('textures/starmap_4k.hdr'));
      } catch {
      }
    }

    try {
      return await this.loadSingleTexture(this.assetUrl('textures/starmap_4k.jpg'));
    } catch (error) {
      console.warn(
        'Mapa galáctico 4K no disponible, usando starmap base:',
        error?.message || error
      );
      return null;
    }
  }

  configureGalacticMap(texture) {
    texture.colorSpace = THREE.LinearSRGBColorSpace;
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = this.maxAnisotropy;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return texture;
  }

  loadTextureWithFallback(primaryPath, fallbackPath, fallbackTexture = WHITE_TEXTURE) {
    return this.loadTextureAsync(this.assetUrl(primaryPath))
      .catch(() => this.loadTextureAsync(this.assetUrl(fallbackPath)))
      .catch((error) => {
        console.warn(`Textura con respaldo agotado (${primaryPath}), usando textura base:`, error?.message || error);
        return fallbackTexture;
      });
  }

  async loadMoonTextureSet(name) {
    const [color, normal, ao] = await Promise.all([
      this.loadOptionalTexture(`textures/${name}_color.jpg`, WHITE_TEXTURE),
      this.loadOptionalTexture(`textures/${name}_normal.jpg`, FLAT_NORMAL_TEXTURE),
      this.loadTextureWithFallback(`textures/${name}_ao.jpg`, `textures/${name}_color.jpg`, WHITE_TEXTURE)
    ]);

    if (color !== WHITE_TEXTURE) {
      color.colorSpace = THREE.SRGBColorSpace;
      color.wrapS = THREE.RepeatWrapping;
    }
    if (normal !== FLAT_NORMAL_TEXTURE) {
      normal.colorSpace = THREE.LinearSRGBColorSpace;
      normal.wrapS = THREE.RepeatWrapping;
    }
    if (ao !== WHITE_TEXTURE) {
      ao.colorSpace = THREE.LinearSRGBColorSpace;
      ao.wrapS = THREE.RepeatWrapping;
    }

    return { color, normal, ao };
  }

  loadSingleAudio(url) {
    return this.enqueue(() => new Promise((resolve, reject) => {
      this.audioLoader.load(
        url,
        (buffer) => resolve(buffer),
        undefined,
        () => reject(new Error(`Fallo al cargar audio: ${url}`))
      );
    }));
  }

  async loadAudioAsync(url, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (attempt > 0) {
          await this.delay(this.retryDelayMs * attempt);
        }
        return await this.loadSingleAudio(this.withRetryParam(url, attempt));
      } catch (error) {
        if (attempt === retries) {
          console.warn(`Audio opcional no disponible (${url}):`, error?.message || error);
          return null;
        }
      }
    }
    return null;
  }
}