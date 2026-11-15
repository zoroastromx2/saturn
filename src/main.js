// src/main.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { AssetFetcher } from './core/AssetFetcher.js';
import { SaturnSimulator } from './core/SaturnSimulator.js';
import { TitanSimulator } from './core/TitanSimulator.js';
import { EnceladusSimulator } from './core/EnceladusSimulator.js';
import { MimasSimulator } from './core/MimasSimulator.js';
import { TethysSimulator } from './core/TethysSimulator.js';
import { DioneSimulator } from './core/DioneSimulator.js';
import { RheaSimulator } from './core/RheaSimulator.js';
import { IapetusSimulator } from './core/IapetusSimulator.js';
import { FRingSimulator } from './core/FRingSimulator.js';
import { ComparisonMode } from './core/ComparisonMode.js';
import { CameraController } from './core/CameraController.js';
import { TelemetryController } from './core/TelemetryController.js';
import { StatsController } from './core/StatsController.js';
import { getLanguage, setLanguage, t } from './core/Localization.js';
import './style.css';

let scene, camera, renderer, composer, labelRenderer, controls, cameraController, listener;
let saturnSim, titanSim, enceladusSim, mimasSim;
let tethysSim, dioneSim, rheaSim, iapetusSim;
let fRingSim, comparisonMode, telemetryController, statsController;
let audioEnabled = false;
let timeScale = 1.0;
let orbitalTime = 0.0;
let simulationDate = new Date();
let uiCollapsed = false;
let currentTheme = 'dark';
const THEME_STORAGE_KEY = 'saturn-sim-theme';
const clock = new THREE.Clock();
const surfaceMountPosition = new THREE.Vector3();
const MOBILE_UI_QUERY = '(max-width: 1024px), (pointer: coarse)';
const J2000_EPOCH_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
const MS_PER_DAY = 86400000;

function getDaysSinceJ2000() {
  return (simulationDate.getTime() - J2000_EPOCH_MS) / MS_PER_DAY;
}

function setUiCollapsed(collapsed) {
  uiCollapsed = collapsed;
  document.body.classList.toggle('ui-collapsed', collapsed);

  const button = document.getElementById('btn-toggle-ui');
  if (!button) return;

  button.setAttribute('aria-expanded', String(!collapsed));
  const label = t(collapsed ? 'ui.showControls' : 'ui.hideControls');
  button.setAttribute('aria-label', label);
  button.setAttribute('title', label);
}

async function bootstrapApp() {
  const uiToggleButton = document.getElementById('btn-toggle-ui');
  if (uiToggleButton) {
    uiToggleButton.addEventListener('click', () => setUiCollapsed(!uiCollapsed));
  }
  setUiCollapsed(window.matchMedia(MOBILE_UI_QUERY).matches);

  if (window.matchMedia('(max-width: 760px)').matches) {
    document.querySelectorAll('#hud details.control-section').forEach((section) => {
      section.open = false;
    });
  }

  // 1. Configuración base de Three.js
  const canvas = document.querySelector('#webgl-canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  // Fundamental para evitar que las texturas en sRGB se vean deslavadas
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  scene = new THREE.Scene();

  // La cámara se configura inicialmente para encuadrar a Saturno.
  // La distancia real se fija tras construir el simulador con sus unidades.
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000000);
  camera.position.set(0, 18, 28);
  listener = new THREE.AudioListener();
  camera.add(listener);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  cameraController = new CameraController(camera, controls);

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.2,
    0.5,
    0.8
  ));
  composer.addPass(new OutputPass());

  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0px';
  labelRenderer.domElement.style.left = '0px';
  labelRenderer.domElement.style.pointerEvents = 'none';
  labelRenderer.domElement.style.zIndex = '5';
  document.body.appendChild(labelRenderer.domElement);

  try {
    // 2. Bloquear la inicialización gráfica hasta que las texturas estén en RAM
    const fetcher = new AssetFetcher();
    const assets = await fetcher.loadAllAssets();
    scene.background = assets.starmap;
    scene.backgroundIntensity = 0.15;
    scene.environment = assets.starmap;
    scene.environmentIntensity = 1.0;

    // 3. Inyectar dependencias a los simuladores
    // Le pasamos los assets para que SaturnSimulator los asigne a los uniforms de GLSL
    simulationDate = new Date();
    const initialDaysSinceJ2000 = getDaysSinceJ2000();
    saturnSim = new SaturnSimulator(scene, assets, listener);
    titanSim = new TitanSimulator(scene, saturnSim, saturnSim.scaleFactor, assets, listener);
    titanSim.update(initialDaysSinceJ2000);
    enceladusSim = new EnceladusSimulator(scene, saturnSim, saturnSim.scaleFactor, assets, listener);
    enceladusSim.update(initialDaysSinceJ2000);
    mimasSim = new MimasSimulator(scene, saturnSim, saturnSim.scaleFactor, assets, listener);
    mimasSim.update(initialDaysSinceJ2000);
    tethysSim = new TethysSimulator(scene, saturnSim, saturnSim.scaleFactor, assets);
    tethysSim.update(initialDaysSinceJ2000);
    dioneSim = new DioneSimulator(scene, saturnSim, saturnSim.scaleFactor, assets);
    dioneSim.update(initialDaysSinceJ2000);
    rheaSim = new RheaSimulator(scene, saturnSim, saturnSim.scaleFactor, assets);
    rheaSim.update(initialDaysSinceJ2000);
    iapetusSim = new IapetusSimulator(scene, saturnSim, saturnSim.scaleFactor, assets);
    iapetusSim.update(initialDaysSinceJ2000);
    fRingSim = new FRingSimulator(scene, saturnSim, saturnSim.scaleFactor);
    comparisonMode = new ComparisonMode(scene, saturnSim, camera, assets);
    telemetryController = new TelemetryController(camera, cameraController, saturnSim.scaleFactor, saturnSim.sunDirection);
    statsController = new StatsController(renderer);
    statsController.refresh();

    // 4. Iluminar la Tierra con la misma dirección solar que usan los shaders
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.6);
    sunLight.position.copy(saturnSim.sunDirection).multiplyScalar(1000);
    scene.add(sunLight);
    scene.add(new THREE.AmbientLight(0x8899bb, 0.18));

    // 5. Encuadrar la órbita estándar de Saturno
    comparisonMode.resetCamera();
    controls.target.set(0, 0, 0);
    controls.update();

    // 6. Conectar la navegación del HUD
    const saturnBtn = document.getElementById('btn-saturn');
    const earthBtn = document.getElementById('btn-earth');
    const titanBtn = document.getElementById('btn-titan');
    const enceladusBtn = document.getElementById('btn-enceladus');
    const mimasBtn = document.getElementById('btn-mimas');
    const tethysBtn = document.getElementById('btn-tethys');
    const dioneBtn = document.getElementById('btn-dione');
    const rheaBtn = document.getElementById('btn-rhea');
    const iapetusBtn = document.getElementById('btn-iapetus');
    const surfaceEnceladusBtn = document.getElementById('btn-surface-enceladus');
    const surfaceMimasBtn = document.getElementById('btn-surface-mimas');
    const labelsBtn = document.getElementById('btn-toggle-labels');
    const audioBtn = document.getElementById('btn-toggle-audio');
    const stormBtn = document.getElementById('btn-toggle-hexagon');
    const auroraBtn = document.getElementById('btn-toggle-aurora');
    const languageBtn = document.getElementById('btn-toggle-language');
    const themeBtn = document.getElementById('btn-toggle-theme');
    const themeLabel = document.getElementById('theme-label');
    const uiContainer = document.getElementById('ui-container');
    let stormEnabled = false;
    let auroraEnabled = false;
    const labelsState = document.getElementById('labels-state');
    const audioState = document.getElementById('audio-state');
    const languageState = document.getElementById('language-state');
    const hexagonState = document.getElementById('hexagon-state');
    const auroraState = document.getElementById('aurora-state');
    const timeButtons = [
      { element: document.getElementById('btn-time-pause'), scale: 0.0 },
      { element: document.getElementById('btn-time-1'), scale: 1.0 },
      { element: document.getElementById('btn-time-10'), scale: 10.0 },
      { element: document.getElementById('btn-time-100'), scale: 100.0 }
    ].filter(({ element }) => element);

    if (saturnBtn) {
      saturnBtn.addEventListener('click', () => {
        cameraController.focusOn(saturnSim.saturnMesh, 3.0);
      });
    }

    if (earthBtn) {
      earthBtn.addEventListener('click', () => {
        comparisonMode.earthMesh.visible = true;
        comparisonMode.isActive = true;
        cameraController.focusOn(comparisonMode.earthMesh, 5.0);
      });
    }

    if (titanBtn) {
      titanBtn.addEventListener('click', () => {
        cameraController.focusOn(titanSim.mesh, 5.0);
      });
    }

    if (enceladusBtn) {
      enceladusBtn.addEventListener('click', () => {
        cameraController.focusOn(enceladusSim.mesh, 5.0);
      });
    }

    if (mimasBtn) {
      mimasBtn.addEventListener('click', () => {
        cameraController.focusOn(mimasSim.mesh, 8.0, 0.0);
      });
    }

    if (tethysBtn) {
      tethysBtn.addEventListener('click', () => {
        cameraController.focusOn(tethysSim.mesh, 5.0);
      });
    }

    if (dioneBtn) {
      dioneBtn.addEventListener('click', () => {
        cameraController.focusOn(dioneSim.mesh, 5.0);
      });
    }

    if (rheaBtn) {
      rheaBtn.addEventListener('click', () => {
        cameraController.focusOn(rheaSim.mesh, 5.0);
      });
    }

    if (iapetusBtn) {
      iapetusBtn.addEventListener('click', () => {
        cameraController.focusOn(iapetusSim.mesh, 5.0);
      });
    }

    if (surfaceEnceladusBtn) {
      surfaceEnceladusBtn.addEventListener('click', () => {
        cameraController.landOnSurface(enceladusSim);
      });
    }

    if (surfaceMimasBtn) {
      surfaceMimasBtn.addEventListener('click', () => {
        cameraController.landOnSurface(mimasSim);
      });
    }

    const updateLabelsButton = () => {
      if (!labelsBtn) return;
      const visible = document.body.classList.contains('show-labels');
      labelsBtn.setAttribute('aria-pressed', String(visible));
      labelsBtn.classList.toggle('active', visible);
      if (labelsState) labelsState.textContent = t(visible ? 'state.on' : 'state.off');
    };

    const updateAudioButton = () => {
      if (!audioBtn) return;
      audioBtn.setAttribute('aria-pressed', String(audioEnabled));
      audioBtn.classList.toggle('active', audioEnabled);
      if (audioState) audioState.textContent = t(audioEnabled ? 'state.on' : 'state.off');
    };

    const updateLanguageState = () => {
      const activeLang = getLanguage();
      if (languageState) languageState.textContent = t('language.code');
      if (languageBtn) languageBtn.dataset.activeLang = activeLang;
    };

    const applyTheme = (theme) => {
      currentTheme = theme === 'light' ? 'light' : 'dark';
      const isLight = currentTheme === 'light';

      if (uiContainer) {
        uiContainer.classList.toggle('light', isLight);
      }

      if (themeBtn) {
        themeBtn.dataset.theme = currentTheme;
        themeBtn.setAttribute('aria-pressed', String(isLight));
        const ariaKey = isLight ? 'theme.toDarkAria' : 'theme.toLightAria';
        themeBtn.dataset.i18nAriaLabel = ariaKey;
        themeBtn.setAttribute('aria-label', t(ariaKey));
      }

      if (themeLabel) {
        const labelKey = isLight ? 'theme.light' : 'theme.dark';
        themeLabel.dataset.i18n = labelKey;
        themeLabel.textContent = t(labelKey);
      }
    };

    const updateAuroraButton = () => {
      if (!auroraBtn) return;
      auroraBtn.setAttribute('aria-pressed', String(auroraEnabled));
      auroraBtn.classList.toggle('active', auroraEnabled);
      if (auroraState) auroraState.textContent = t(auroraEnabled ? 'state.on' : 'state.off');
    };

    const updateStormButton = () => {
      if (!stormBtn) return;
      stormBtn.setAttribute('aria-pressed', String(stormEnabled));
      stormBtn.classList.toggle('active', stormEnabled);
      if (hexagonState) hexagonState.textContent = t(stormEnabled ? 'state.on' : 'state.off');
    };

    if (stormBtn) {
      stormBtn.addEventListener('click', () => {
        stormEnabled = !stormEnabled;
        saturnSim.saturnMesh.material.uniforms.uStormIntensity.value = stormEnabled ? 1.0 : 0.0;
        updateStormButton();
      });
    }

    if (auroraBtn) {
      auroraBtn.addEventListener('click', () => {
        auroraEnabled = !auroraEnabled;
        saturnSim.saturnMesh.material.uniforms.uAuroraIntensity.value = auroraEnabled ? 1.5 : 0.0;
        updateAuroraButton();
      });
    }

    if (labelsBtn) {
      labelsBtn.addEventListener('click', () => {
        document.body.classList.toggle('show-labels');
        updateLabelsButton();
      });
    }

    if (audioBtn) {
      audioBtn.addEventListener('click', async () => {
        if (listener.context.state === 'suspended') {
          await listener.context.resume();
        }

        audioEnabled = !audioEnabled;
        const ambientSounds = [
          saturnSim.ambientSound,
          titanSim.ambientSound,
          enceladusSim.ambientSound,
          mimasSim.ambientSound
        ].filter(Boolean);

        if (audioEnabled) {
          ambientSounds.forEach((sound) => {
            if (!sound.isPlaying) sound.play();
          });
        } else {
          ambientSounds.forEach((sound) => {
            if (sound.isPlaying) sound.pause();
          });
        }
        updateAudioButton();
      });
    }

    const setTimeScale = (scale, activeButton) => {
      timeScale = scale;

      timeButtons.forEach(({ element }) => {
        const isActive = element === activeButton;
        element.classList.toggle('active', isActive);
        element.setAttribute('aria-pressed', String(isActive));
      });
    };

    timeButtons.forEach(({ element, scale }) => {
      element.addEventListener('click', () => setTimeScale(scale, element));
    });

    const updateDynamicLanguage = () => {
      saturnSim.label.element.textContent = t('body.saturn');
      titanSim.label.element.textContent = t('body.titan');
      enceladusSim.label.element.textContent = t('body.enceladus');
      mimasSim.label.element.textContent = t('body.mimas');
      tethysSim.label.element.textContent = t('body.tethys');
      dioneSim.label.element.textContent = t('body.dione');
      rheaSim.label.element.textContent = t('body.rhea');
      iapetusSim.label.element.textContent = t('body.iapetus');
      comparisonMode.label.element.textContent = t('body.earth');
      setUiCollapsed(uiCollapsed);
      updateLabelsButton();
      updateAudioButton();
      updateLanguageState();
      updateStormButton();
      updateAuroraButton();
      telemetryController.refresh();
      statsController.refresh();
      applyTheme(currentTheme);
    };

    document.addEventListener('languagechange', updateDynamicLanguage);

    if (languageBtn) {
      languageBtn.addEventListener('click', () => {
        setLanguage(getLanguage() === 'es' ? 'en' : 'es');
      });
    }

    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme(nextTheme);
        try {
          localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        } catch {
          // Ignorar errores de almacenamiento en entornos restringidos.
        }
      });
    }

    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark') {
        currentTheme = savedTheme;
      }
    } catch {
      // Usar el tema oscuro por defecto.
    }

    applyTheme(currentTheme);
    setLanguage('es');

    // 7. Iniciar el bucle de renderizado solo cuando todo está listo
    window.addEventListener('resize', onWindowResize);

    // Ocultar pantalla de carga del DOM si existe
    const loaderUi = document.getElementById('loader');
    if (loaderUi) loaderUi.style.display = 'none';

    clock.start();
    tick();

  } catch (error) {
    console.error("Error crítico durante el bootstrap:", error);
    document.body.innerHTML = `<h2 style="color:red; text-align:center;">${t('error.bootstrap')}</h2>`;
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
}

function tick() {
  requestAnimationFrame(tick);

  // El tiempo alimenta la rotación kepleriana diferencial de los anillos
  const deltaTime = clock.getDelta();
  orbitalTime += deltaTime * timeScale;
  simulationDate.setTime(simulationDate.getTime() + deltaTime * timeScale * 1000);
  const daysSinceJ2000 = getDaysSinceJ2000();

  if (saturnSim && saturnSim.ringsMesh) {
    saturnSim.ringsMesh.material.uniforms.uTime.value = orbitalTime;
  }
  if (saturnSim && saturnSim.saturnMesh) {
    saturnSim.saturnMesh.material.uniforms.uTime.value = orbitalTime;
  }
  if (titanSim) {
    titanSim.update(daysSinceJ2000);
  }
  if (enceladusSim) {
    enceladusSim.update(daysSinceJ2000, deltaTime);
  }
  if (mimasSim) {
    mimasSim.update(daysSinceJ2000);
  }
  if (tethysSim) {
    tethysSim.update(daysSinceJ2000);
  }
  if (dioneSim) {
    dioneSim.update(daysSinceJ2000);
  }
  if (rheaSim) {
    rheaSim.update(daysSinceJ2000);
  }
  if (iapetusSim) {
    iapetusSim.update(daysSinceJ2000);
  }
  if (fRingSim) {
    fRingSim.update(orbitalTime);
  }

  // Sigue al objetivo activo y actualiza la inercia de OrbitControls.
  if (cameraController) {
    cameraController.update();
  }

  if (cameraController?.isSurfaceLocked && cameraController.surfaceMount) {
    cameraController.surfaceMount.getWorldPosition(surfaceMountPosition);
    camera.position.copy(surfaceMountPosition);
    camera.lookAt(0, 0, 0);
  }

  if (telemetryController) {
    telemetryController.update(deltaTime);
  }

  composer.render();
  labelRenderer.render(scene, camera);

  if (statsController) {
    statsController.update();
  }
}

// Arrancar la aplicación
bootstrapApp();
