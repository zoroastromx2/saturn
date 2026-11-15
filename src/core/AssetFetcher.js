// src/core/AssetFetcher.js
import * as THREE from 'three';

export class AssetFetcher {
  constructor() {
    this.textureLoader = new THREE.TextureLoader();
    this.audioLoader = new THREE.AudioLoader();
    this.assets = {
      saturnAlbedo: null,
      ringColor: null,
      ringAlpha: null,
      earthAlbedo: null, // Para el ComparisonMode
      starmap: null,
      mimasColor: null,
      mimasNormal: null,
      saturnAudioBuffer: null,
      titanAudioBuffer: null,
      enceladusAudioBuffer: null,
      mimasAudioBuffer: null
    };
  }

  /**
   * Carga todas las texturas requeridas de forma asíncrona.
   * El agente debe asegurar que esta promesa se resuelva en main.js
   * antes de inicializar SaturnSimulator.
   */
  async loadAllAssets() {
    console.log("Iniciando descarga de texturas de la misión Cassini...");

    try {
      const [saturn, rColor, rAlpha, earth, starmap, mimasColor, mimasNormal, saturnAudio, titanAudio, enceladusAudio, mimasAudio] = await Promise.all([
        this.loadTextureAsync(this.assetUrl('textures/saturn_atmosphere_8k.jpg')),
        this.loadTextureAsync(this.assetUrl('textures/saturn_rings_color.png')),
        // La máscara de densidad/alfa de los anillos (blanco = sólido, negro = vacío)
        this.loadTextureAsync(this.assetUrl('textures/saturn_rings_alpha.png')),
        this.loadTextureAsync(this.assetUrl('textures/earth_daymap_4k.jpg')),
        this.loadTextureAsync(this.assetUrl('textures/milky_way_8k.jpg')),
        this.loadTextureAsync(this.assetUrl('textures/mimas_color.jpg')),
        this.loadTextureAsync(this.assetUrl('textures/mimas_normal.jpg')),
        this.loadAudioAsync(this.assetUrl('audio/saturn_deep_rumble.wav')),
        this.loadAudioAsync(this.assetUrl('audio/titan_winds.wav')),
        this.loadAudioAsync(this.assetUrl('audio/enceladus_ice_crackle.wav')),
        this.loadAudioAsync(this.assetUrl('audio/mimas_rocky_rumble.wav'))
      ]);

      // Configuración estricta de espacios de color
      // Mapas de color (Albedo) deben estar en sRGB
      saturn.colorSpace = THREE.SRGBColorSpace;
      rColor.colorSpace = THREE.SRGBColorSpace;
      earth.colorSpace = THREE.SRGBColorSpace;
      starmap.colorSpace = THREE.SRGBColorSpace;
      starmap.mapping = THREE.EquirectangularReflectionMapping;
      mimasColor.colorSpace = THREE.SRGBColorSpace;
      mimasColor.wrapS = THREE.RepeatWrapping;
      mimasNormal.colorSpace = THREE.LinearSRGBColorSpace;
      mimasNormal.wrapS = THREE.RepeatWrapping;

      // Mapas de datos (Alpha/Densidad, Normales) DEBEN mantenerse en Linear
      // Si el alpha se convierte a sRGB, la curva matemática de la sombra fallará
      rAlpha.colorSpace = THREE.LinearSRGBColorSpace;

      this.assets.saturnAlbedo = saturn;
      this.assets.ringColor = rColor;
      this.assets.ringAlpha = rAlpha;
      this.assets.earthAlbedo = earth;
      this.assets.starmap = starmap;
      this.assets.mimasColor = mimasColor;
      this.assets.mimasNormal = mimasNormal;
      this.assets.saturnAudioBuffer = saturnAudio;
      this.assets.titanAudioBuffer = titanAudio;
      this.assets.enceladusAudioBuffer = enceladusAudio;
      this.assets.mimasAudioBuffer = mimasAudio;

      console.log("Texturas cargadas exitosamente.");
      return this.assets;
      
    } catch (error) {
      console.error("Error crítico cargando las texturas:", error);
      throw error;
    }
  }

  /**
   * Envuelve el TextureLoader de Three.js en una Promesa moderna
   */
  assetUrl(path) {
    return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
  }

  loadTextureAsync(url) {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => resolve(texture),
        undefined, // onProgress
        (err) => reject(new Error(`Fallo al cargar textura: ${url}`))
      );
    });
  }

  loadAudioAsync(url) {
    return new Promise((resolve, reject) => {
      this.audioLoader.load(
        url,
        (buffer) => resolve(buffer),
        undefined,
        (err) => reject(new Error(`Fallo al cargar audio: ${url}`))
      );
    });
  }
}