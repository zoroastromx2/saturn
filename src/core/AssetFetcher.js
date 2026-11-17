// src/core/AssetFetcher.js
import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import tiersManifest from '../data/TextureTiers.js';
import { createByteProgress } from './LoadProgress.js';
import { selectTextureVariant } from './QualityTier.js';
import { WHITE_TEXTURE, FLAT_NORMAL_TEXTURE } from './MoonTextures.js';

export class AssetFetcher {
  constructor(options = {}) {
    this.textureLoader = options.textureLoader || new THREE.TextureLoader();
    this.audioLoader = options.audioLoader || new THREE.AudioLoader();
    this.gltfLoader = options.gltfLoader || new GLTFLoader();
    this.hasCustomGltfLoader = Boolean(options.gltfLoader);
    this.dracoLoader = null;
    if (!this.hasCustomGltfLoader) {
      this.dracoLoader = new DRACOLoader();
      this.gltfLoader.setDRACOLoader(this.dracoLoader);
    }
    this.retryDelayMs = options.retryDelayMs ?? 250;
    this.maxConcurrency = Math.max(1, options.maxConcurrency ?? 6);
    this.maxAnisotropy = Math.max(1, options.maxAnisotropy ?? 1);
    this.manifest = options.manifest ?? tiersManifest;
    this.tier = options.tier ?? 'high';
    this.onProgress = options.onProgress ?? null;
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
      minorMoons: null,
      models: {
        pioneer11: null,
        voyager1: null,
        voyager2: null,
        cassiniHuygens: null,
        huygens: null,
        titan: null,
        mimas: null,
        enceladus: null,
        hyperion: null
      }
    };
  }

  /**
   * Carga todas las texturas requeridas de forma asíncrona con concurrencia acotada,
   * reintentos automáticos y respaldos seguros para evitar fallos transitorios de red.
   */
  /** Bytes del activo en el preset actual (0 si no hay manifiesto). */
  textureBytes(key) {
    return this.manifest?.tiers?.[this.tier]?.[key]?.bytes ?? 0;
  }

  /** Ruta relativa del activo para el preset, con respaldo al archivo base. */
  texturePath(key, fallbackFile) {
    return selectTextureVariant(this.manifest, key, this.tier, fallbackFile) ?? fallbackFile;
  }

  loadTextureByKey(key, fallbackFile) {
    return this.loadTextureAsync(this.assetUrl(this.texturePath(key, fallbackFile)));
  }

  loadOptionalTextureByKey(key, fallbackFile) {
    return this.loadOptionalTexture(this.texturePath(key, fallbackFile));
  }

  /**
   * Fase 0: lo mínimo para el primer frame (Saturno, anillos, fondo y Tierra).
   * Informa del progreso por bytes mediante `onProgress`.
   */
  async loadCriticalAssets() {
    const criticalKeys = ['saturnAlbedo', 'ringColor', 'ringAlpha', 'earthAlbedo', 'starmap'];
    const totalBytes = criticalKeys.reduce((sum, key) => sum + this.textureBytes(key), 0);
    const progress = createByteProgress(totalBytes, (fraction) => this.onProgress?.(fraction));
    const track = (key, promise) =>
      promise.then((result) => {
        progress.add(this.textureBytes(key));
        return result;
      });

    const [saturn, rColor, rAlpha, earth, starmap] = await Promise.all([
      track(
        'saturnAlbedo',
        this.loadTextureByKey('saturnAlbedo', 'textures/saturn_atmosphere_8k.jpg')
      ),
      track('ringColor', this.loadTextureByKey('ringColor', 'textures/saturn_rings_color.png')),
      track('ringAlpha', this.loadTextureByKey('ringAlpha', 'textures/saturn_rings_alpha.png')),
      track(
        'earthAlbedo',
        this.loadOptionalTextureByKey('earthAlbedo', 'textures/earth_daymap_4k.jpg')
      ),
      track('starmap', this.loadOptionalTextureByKey('starmap', 'textures/milky_way_8k.jpg'))
    ]);

    saturn.colorSpace = THREE.SRGBColorSpace;
    rColor.colorSpace = THREE.SRGBColorSpace;
    // La máscara de densidad debe permanecer lineal o la sombra deja de ser correcta.
    rAlpha.colorSpace = THREE.LinearSRGBColorSpace;
    if (earth) earth.colorSpace = THREE.SRGBColorSpace;
    if (starmap) {
      starmap.colorSpace = THREE.SRGBColorSpace;
      starmap.mapping = THREE.EquirectangularReflectionMapping;
    }

    this.assets.saturnAlbedo = saturn;
    this.assets.ringColor = rColor;
    this.assets.ringAlpha = rAlpha;
    this.assets.earthAlbedo = earth;
    this.assets.starmap = starmap;
    // Un único mapa galáctico: el entorno PBR usa una copia reducida (EnvironmentProbe).
    this.assets.galacticMap = starmap;

    progress.finish();
    return this.assets;
  }

  /** Fase 1: lunas, audio, modelos GLB y catálogo de lunas menores. */
  async loadBackgroundAssets() {
    const [
      mimas,
      tethys,
      dione,
      rhea,
      iapetus,
      minorMoons,
      pioneerModel,
      voyagerModel,
      voyager2Model,
      cassiniHuygensModel,
      huygensModel,
      titanModel,
      mimasModel,
      enceladusModel,
      hyperionModel
    ] = await Promise.all([
      this.loadMoonTextureSet('mimas'),
      this.loadMoonTextureSet('tethys'),
      this.loadMoonTextureSet('dione'),
      this.loadMoonTextureSet('rhea'),
      this.loadMoonTextureSet('iapetus'),
      this.loadMinorMoons(),
      this.loadPioneerModel(),
      this.loadVoyagerModel(),
      this.loadVoyager2Model(),
      this.loadCassiniHuygensModel(),
      this.loadHuygensModel(),
      this.loadTitanModel(),
      this.loadMimasModel(),
      this.loadEnceladusModel(),
      this.loadHyperionModel()
    ]);

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
    this.assets.saturnAudioBuffer = null;
    this.assets.titanAudioBuffer = null;
    this.assets.enceladusAudioBuffer = null;
    this.assets.mimasAudioBuffer = null;
    this.assets.minorMoons = minorMoons;
    this.assets.models.pioneer11 = pioneerModel;
    this.assets.models.voyager1 = voyagerModel;
    this.assets.models.voyager2 = voyager2Model;
    this.assets.models.cassiniHuygens = cassiniHuygensModel;
    this.assets.models.huygens = huygensModel;
    this.assets.models.titan = titanModel;
    this.assets.models.mimas = mimasModel;
    this.assets.models.enceladus = enceladusModel;
    this.assets.models.hyperion = hyperionModel;

    return this.assets;
  }

  /** Audio bajo demanda: no se descarga hasta que el usuario activa el sonido. */
  async loadAudioAssets() {
    const [saturn, titan, enceladus, mimas] = await Promise.all([
      this.loadAudioAsync(this.assetUrl('audio/saturn_deep_rumble.wav')),
      this.loadAudioAsync(this.assetUrl('audio/titan_winds.wav')),
      this.loadAudioAsync(this.assetUrl('audio/enceladus_ice_crackle.wav')),
      this.loadAudioAsync(this.assetUrl('audio/mimas_rocky_rumble.wav'))
    ]);

    this.assets.saturnAudioBuffer = saturn;
    this.assets.titanAudioBuffer = titan;
    this.assets.enceladusAudioBuffer = enceladus;
    this.assets.mimasAudioBuffer = mimas;
    return this.assets;
  }

  /**
   * Carga completa (compatibilidad con pruebas y consumidores que no necesitan fases).
   */
  async loadAllAssets() {
    console.log('Iniciando descarga de texturas de la misión Cassini...');
    await this.loadCriticalAssets();
    await this.loadBackgroundAssets();
    console.log('Texturas cargadas exitosamente.');
    return this.assets;
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
    return this.enqueue(
      () =>
        new Promise((resolve, reject) => {
          this.textureLoader.load(
            url,
            (texture) => resolve(texture),
            undefined, // onProgress
            () => reject(new Error(`Fallo al cargar textura: ${url}`))
          );
        })
    );
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
      console.warn(
        `Textura opcional no disponible (${path}), usando respaldo:`,
        error?.message || error
      );
      return fallbackTexture;
    });
  }

  loadModel(url) {
    return this.enqueue(
      () =>
        new Promise((resolve, reject) => {
          this.gltfLoader.load(
            url,
            (gltf) => resolve(gltf.scene),
            undefined,
            () => reject(new Error(`Fallo al cargar modelo: ${url}`))
          );
        })
    );
  }

  async loadPioneerModel() {
    if (typeof window === 'undefined' && !this.hasCustomGltfLoader) {
      return null;
    }

    try {
      return await this.loadModel(this.assetUrl('models/pioneer_11.glb'));
    } catch (error) {
      console.warn(
        'Modelo Pioneer 11 no disponible, usando sonda procedural:',
        error?.message || error
      );
      return null;
    }
  }

  async loadVoyagerModel() {
    if (typeof window === 'undefined' && !this.hasCustomGltfLoader) {
      return null;
    }

    try {
      return await this.loadModel(this.assetUrl('models/voyager_1.glb'));
    } catch (error) {
      console.warn(
        'Modelo Voyager 1 no disponible, usando sonda procedural:',
        error?.message || error
      );
      return null;
    }
  }

  async loadVoyager2Model() {
    if (typeof window === 'undefined' && !this.hasCustomGltfLoader) {
      return null;
    }

    try {
      return await this.loadModel(this.assetUrl('models/voyager_2.glb'));
    } catch (error) {
      console.warn(
        'Modelo Voyager 2 no disponible, usando sonda procedural:',
        error?.message || error
      );
      return null;
    }
  }

  async loadCassiniHuygensModel() {
    if (typeof window === 'undefined' && !this.hasCustomGltfLoader) {
      return null;
    }

    try {
      return await this.loadModel(this.assetUrl('models/cassinihuygens.glb'));
    } catch (error) {
      console.warn(
        'Modelo Cassini-Huygens no disponible, usando sonda procedural:',
        error?.message || error
      );
      return null;
    }
  }

  async loadHuygensModel() {
    if (typeof window === 'undefined' && !this.hasCustomGltfLoader) {
      return null;
    }

    try {
      return await this.loadModel(this.assetUrl('models/Huygens.glb'));
    } catch (error) {
      console.warn(
        'Modelo Huygens no disponible, usando sonda procedural:',
        error?.message || error
      );
      return null;
    }
  }

  async loadTitanModel() {
    if (typeof window === 'undefined' && !this.hasCustomGltfLoader) {
      return null;
    }

    try {
      return await this.loadModel(this.assetUrl('models/titan.glb'));
    } catch (error) {
      console.warn(
        'Modelo Titan no disponible, usando esfera procedural:',
        error?.message || error
      );
      return null;
    }
  }

  async loadMimasModel() {
    if (typeof window === 'undefined' && !this.hasCustomGltfLoader) {
      return null;
    }

    try {
      return await this.loadModel(this.assetUrl('models/mimas.glb'));
    } catch (error) {
      console.warn(
        'Modelo Mimas no disponible, usando esfera procedural:',
        error?.message || error
      );
      return null;
    }
  }

  async loadEnceladusModel() {
    if (typeof window === 'undefined' && !this.hasCustomGltfLoader) {
      return null;
    }

    try {
      return await this.loadModel(this.assetUrl('models/enceladus.glb'));
    } catch (error) {
      console.warn(
        'Modelo Enceladus no disponible, usando esfera procedural:',
        error?.message || error
      );
      return null;
    }
  }

  async loadHyperionModel() {
    if (typeof window === 'undefined' && !this.hasCustomGltfLoader) {
      return null;
    }

    try {
      return await this.loadModel(this.assetUrl('models/hyperion.glb'));
    } catch (error) {
      console.warn(
        'Modelo Hyperion no disponible, usando esfera procedural:',
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
        console.warn(
          `Textura con respaldo agotado (${primaryPath}), usando textura base:`,
          error?.message || error
        );
        return fallbackTexture;
      });
  }

  async loadMoonTextureSet(name) {
    const colorKey = `${name}Color`;
    const normalKey = `${name}Normal`;
    const aoKey = `${name}Ao`;
    const colorPath = this.texturePath(colorKey, `textures/${name}_color.jpg`);
    const normalPath = this.texturePath(normalKey, `textures/${name}_normal.jpg`);

    const [color, normal, ao] = await Promise.all([
      this.loadOptionalTexture(colorPath, WHITE_TEXTURE),
      this.loadOptionalTexture(normalPath, FLAT_NORMAL_TEXTURE),
      this.loadTextureWithFallback(
        this.texturePath(aoKey, `textures/${name}_ao.jpg`),
        colorPath,
        WHITE_TEXTURE
      )
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
    return this.enqueue(
      () =>
        new Promise((resolve, reject) => {
          this.audioLoader.load(
            url,
            (buffer) => resolve(buffer),
            undefined,
            () => reject(new Error(`Fallo al cargar audio: ${url}`))
          );
        })
    );
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
