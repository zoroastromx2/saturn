// src/main.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
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
import { MinorMoonsSimulator } from './core/MinorMoonsSimulator.js';
import { DiffuseRingsSimulator } from './core/DiffuseRingsSimulator.js';
import { MissionSimulator } from './core/MissionSimulator.js';
import { ComparisonMode } from './core/ComparisonMode.js';
import { CameraController } from './core/CameraController.js';
import { TelemetryController } from './core/TelemetryController.js';
import { StatsController } from './core/StatsController.js';
import { OrbitPathsController } from './core/OrbitPathsController.js';
import { TextureStudioController } from './core/TextureStudioController.js';
import { getTextureTarget } from './core/TexturePromptCatalog.js';
import {
  loadTimeHistory,
  parseUtcDateString,
  pushTimeHistory,
  saveTimeHistory
} from './core/TimeHistory.js';
import { getLanguage, setLanguage, t } from './core/Localization.js';
import { sliderPositionToScale, scaleToSliderPosition, formatTimeScale } from './math/TimeScale.js';
import { VintageOpticsShader } from './shaders/VintageOpticsShader.js';
import './style.css';

let scene, camera, renderer, composer, labelRenderer, controls, cameraController, listener;
let saturnSim, titanSim, enceladusSim, mimasSim;
let tethysSim, dioneSim, rheaSim, iapetusSim;
let fRingSim, minorMoonsSim, diffuseRingsSim, missionSim, comparisonMode, telemetryController, statsController, orbitPathsController, textureStudioController;
let audioEnabled = false;
let orbitsEnabled = false;
let timeScale = 1.0;
let orbitalTime = 0.0;
let simulationDate = new Date();
let uiCollapsed = false;
let currentTheme = 'dark';
let opticalSceneSimulators = null;
let instrumentHud = null;
let instrumentMissionName = null;
let instrumentName = null;
let instrumentDistance = null;
let instrumentVelocity = null;
let instrumentLensReadout = null;
let instrumentViewBtn = null;
let instrumentLensBtn = null;
let instrumentViewState = null;
let instrumentLensState = null;
let instrumentOpticsBtn = null;
let instrumentOpticsState = null;
let instrumentUiSignature = '';
let vintageOpticsPass = null;
const THEME_STORAGE_KEY = 'saturn-sim-theme';
const clock = new THREE.Clock();
const surfaceMountPosition = new THREE.Vector3();
const enceladusWorldPosition = new THREE.Vector3();
const MOBILE_UI_QUERY = '(max-width: 1024px), (pointer: coarse)';
const J2000_EPOCH_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
const MS_PER_DAY = 86400000;

function getDaysSinceJ2000() {
  return (simulationDate.getTime() - J2000_EPOCH_MS) / MS_PER_DAY;
}

function refreshInstrumentControls(force = false) {
  if (!instrumentHud) return;

  const locked = Boolean(cameraController?.isInstrumentLocked && missionSim?.activeMission);
  const missionActive = Boolean(missionSim?.activeMission);
  const lensMode = cameraController?.activeLensMode || 'WAC';
  const fov = Math.round(cameraController?.camera?.fov ?? camera?.fov ?? 45);
  const opticsEnabled = cameraController?.opticsEnabled !== false;
  const signature = `${locked}|${missionActive}|${lensMode}|${fov}|${opticsEnabled}|${getLanguage()}`;
  if (!force && signature === instrumentUiSignature) return;
  instrumentUiSignature = signature;

  instrumentHud.hidden = !locked;

  if (instrumentViewBtn) {
    instrumentViewBtn.disabled = !missionActive;
    instrumentViewBtn.setAttribute('aria-pressed', String(locked));
    instrumentViewBtn.classList.toggle('active', locked);
  }
  if (instrumentViewState) {
    instrumentViewState.textContent = t(locked ? 'state.on' : 'state.off');
  }

  if (instrumentLensBtn) {
    instrumentLensBtn.disabled = !locked;
    instrumentLensBtn.setAttribute('aria-pressed', String(locked && lensMode === 'NAC'));
    instrumentLensBtn.classList.toggle('active', locked && lensMode === 'NAC');
  }
  if (instrumentLensState) {
    instrumentLensState.textContent = locked ? `${lensMode} ${fov}°` : t('state.off');
  }
  if (instrumentLensReadout) {
    instrumentLensReadout.textContent = `${lensMode} ${fov}°`;
  }

  if (instrumentOpticsBtn) {
    instrumentOpticsBtn.disabled = !locked;
    instrumentOpticsBtn.setAttribute('aria-pressed', String(locked && opticsEnabled));
    instrumentOpticsBtn.classList.toggle('active', locked && opticsEnabled);
  }
  if (instrumentOpticsState) {
    instrumentOpticsState.textContent = t(
      opticsEnabled ? 'mission.opticsEmulation' : 'mission.opticsRaw'
    );
  }
}

function updateInstrumentReadout(targetPosition) {
  if (!instrumentHud || instrumentHud.hidden || !targetPosition) return;
  const config = missionSim?.getActiveOpticalConfig();
  if (!config) return;

  const filterSuffix = config.instrumentName.includes('Cassini ISS')
    ? ' | FILTER: CL1+CL2'
    : '';
  if (instrumentName) {
    instrumentName.textContent = `${config.instrumentName}${filterSuffix}`;
  }
  if (instrumentMissionName) {
    instrumentMissionName.textContent = missionSim.activeMission.name;
  }
  if (instrumentDistance) {
    const distanceKm = camera.position.distanceTo(targetPosition) * saturnSim.scaleFactor;
    instrumentDistance.textContent = `${Math.round(distanceKm).toLocaleString()} km`;
  }
  if (instrumentVelocity) {
    const velocityKmS = missionSim.getRelativeVelocityKmS(missionSim.currentU);
    instrumentVelocity.textContent = `${velocityKmS.toFixed(2)} km/s`;
  }
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
  vintageOpticsPass = new ShaderPass(VintageOpticsShader);
  vintageOpticsPass.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
  composer.addPass(vintageOpticsPass);
  composer.addPass(new OutputPass());
  cameraController.setOpticsPass(vintageOpticsPass);

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
    if (assets.starmap) {
      scene.background = assets.starmap;
      scene.backgroundIntensity = 0.15;
      scene.environment = assets.starmap;
      scene.environmentIntensity = 1.0;
    } else {
      scene.background = new THREE.Color(0x02030a);
    }

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
    diffuseRingsSim = new DiffuseRingsSimulator(scene, saturnSim);
    if (assets.minorMoons?.length === 135) {
      minorMoonsSim = new MinorMoonsSimulator(scene, assets.minorMoons);
      minorMoonsSim.update(initialDaysSinceJ2000);
    }
    comparisonMode = new ComparisonMode(scene, saturnSim, camera, assets);
    telemetryController = new TelemetryController(
      camera,
      cameraController,
      saturnSim.scaleFactor,
      saturnSim.sunDirection,
      () => simulationDate
    );
    statsController = new StatsController(renderer);
    statsController.refresh();
    orbitPathsController = new OrbitPathsController([
      mimasSim,
      enceladusSim,
      tethysSim,
      dioneSim,
      rheaSim,
      titanSim,
      iapetusSim
    ]);
    missionSim = new MissionSimulator(scene, saturnSim, camera, cameraController, titanSim);
    textureStudioController = new TextureStudioController({
      saturnSim,
      moonsById: {
        titan: titanSim,
        enceladus: enceladusSim,
        mimas: mimasSim,
        tethys: tethysSim,
        dione: dioneSim,
        rhea: rheaSim,
        iapetus: iapetusSim
      },
      maxAnisotropy: Math.min(renderer.capabilities.getMaxAnisotropy(), 8)
    });
    opticalSceneSimulators = {
      saturnSim,
      titanSim,
      enceladusSim,
      tethysSim
    };

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
    const orbitsBtn = document.getElementById('btn-toggle-orbits');
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
    const orbitsState = document.getElementById('orbits-state');
    const audioState = document.getElementById('audio-state');
    const languageState = document.getElementById('language-state');
    const hexagonState = document.getElementById('hexagon-state');
    const auroraState = document.getElementById('aurora-state');
    const timeSlider = document.getElementById('time-speed-slider');
    const timeSpeedValue = document.getElementById('time-speed-value');
    const timeMachineInput = document.getElementById('time-machine-input');
    const jumpTimeBtn = document.getElementById('btn-jump-time');
    const timeHistoryContainer = document.getElementById('time-machine-history');
    const timeHistoryList = document.getElementById('time-history-list');
    const missionSelector = document.getElementById('mission-selector');
    const followProbeBtn = document.getElementById('btn-follow-probe');
    const followState = document.getElementById('follow-state');
    const missionDescription = document.getElementById('mission-description');
    instrumentHud = document.getElementById('instrument-hud');
    instrumentMissionName = document.getElementById('instrument-mission-name');
    instrumentName = document.getElementById('instrument-name');
    instrumentDistance = document.getElementById('instrument-distance');
    instrumentVelocity = document.getElementById('instrument-velocity');
    instrumentLensReadout = document.getElementById('instrument-lens-readout');
    instrumentViewBtn = document.getElementById('btn-instrument-view');
    instrumentLensBtn = document.getElementById('btn-instrument-lens');
    instrumentViewState = document.getElementById('instrument-view-state');
    instrumentLensState = document.getElementById('instrument-lens-state');
    instrumentOpticsBtn = document.getElementById('btn-optics-mode');
    instrumentOpticsState = document.getElementById('optics-mode-state');
    let timeHistory = loadTimeHistory();
    let activeHistoryDate = null;
    let followProbe = false;
    const timeButtons = [
      { element: document.getElementById('btn-time-pause'), scale: 0.0 },
      { element: document.getElementById('btn-time-1'), scale: 1.0 },
      { element: document.getElementById('btn-time-10'), scale: 10.0 },
      { element: document.getElementById('btn-time-100'), scale: 100.0 }
    ].filter(({ element }) => element);

    if (timeMachineInput) {
      timeMachineInput.value = simulationDate.toISOString().slice(0, 10);
    }

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
      const visible = document.body.classList.contains('show-labels');
      minorMoonsSim?.setLabelsVisible(visible);
      if (!labelsBtn) return;
      labelsBtn.setAttribute('aria-pressed', String(visible));
      labelsBtn.classList.toggle('active', visible);
      if (labelsState) labelsState.textContent = t(visible ? 'state.on' : 'state.off');
    };

    const updateOrbitsButton = () => {
      if (!orbitsBtn) return;
      orbitsBtn.setAttribute('aria-pressed', String(orbitsEnabled));
      orbitsBtn.classList.toggle('active', orbitsEnabled);
      if (orbitsState) orbitsState.textContent = t(orbitsEnabled ? 'state.on' : 'state.off');
    };

    const updateFollowButton = () => {
      if (!followProbeBtn) return;
      followProbeBtn.disabled = !missionSim?.activeMission;
      followProbeBtn.setAttribute('aria-pressed', String(followProbe));
      followProbeBtn.classList.toggle('active', followProbe);
      if (followState) followState.textContent = t(followProbe ? 'state.on' : 'state.off');
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

    if (orbitsBtn) {
      orbitsBtn.addEventListener('click', () => {
        orbitsEnabled = !orbitsEnabled;
        orbitPathsController.setEnabled(orbitsEnabled);
        orbitPathsController.setActiveTarget(cameraController.currentTarget);
        updateOrbitsButton();
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

    const setTimeScale = (scale, activeButton = null, syncSlider = true) => {
      timeScale = scale;

      const matchedButton =
        activeButton ??
        (timeButtons.find(({ scale: preset }) => Math.abs(preset - scale) < 1e-6)?.element || null);

      timeButtons.forEach(({ element }) => {
        const isActive = element === matchedButton;
        element.classList.toggle('active', isActive);
        element.setAttribute('aria-pressed', String(isActive));
      });

      const formatted = formatTimeScale(scale);
      if (timeSpeedValue) {
        timeSpeedValue.textContent = formatted;
      }

      if (timeSlider) {
        if (syncSlider) {
          timeSlider.value = String(scaleToSliderPosition(scale));
        }
        timeSlider.style.setProperty('--slider-progress', `${Number(timeSlider.value)}%`);
        timeSlider.setAttribute('aria-valuetext', formatted);
      }
    };

    timeButtons.forEach(({ element, scale }) => {
      element.addEventListener('click', () => setTimeScale(scale, element, true));
    });

    if (timeSlider) {
      timeSlider.addEventListener('input', () => {
        const nextScale = sliderPositionToScale(timeSlider.value);
        setTimeScale(nextScale, null, false);
      });
    }

    setTimeScale(timeScale);

    const renderTimeHistory = () => {
      if (!timeHistoryContainer || !timeHistoryList) return;

      timeHistoryContainer.hidden = timeHistory.length === 0;
      timeHistoryList.replaceChildren();

      timeHistory.forEach((dateStr) => {
        const itemBtn = document.createElement('button');
        itemBtn.type = 'button';
        itemBtn.className = 'time-history-item';
        itemBtn.dataset.date = dateStr;
        itemBtn.setAttribute('role', 'listitem');
        itemBtn.textContent = dateStr;
        itemBtn.setAttribute('aria-label', `${t('time.historyJumpAria')}: ${dateStr}`);

        const isActive = dateStr === activeHistoryDate;
        itemBtn.classList.toggle('active', isActive);
        itemBtn.setAttribute('aria-pressed', String(isActive));

        itemBtn.addEventListener('click', () => {
          jumpToDateString(dateStr);
        });

        timeHistoryList.appendChild(itemBtn);
      });
    };

    const rememberDate = (dateStr) => {
      activeHistoryDate = dateStr;
      timeHistory = pushTimeHistory(timeHistory, dateStr);
      saveTimeHistory(timeHistory);
      renderTimeHistory();
    };

    const jumpToDateString = (dateStr) => {
      const selectedDate = parseUtcDateString(dateStr);
      if (!selectedDate) return;

      simulationDate = selectedDate;
      if (timeMachineInput) {
        timeMachineInput.value = dateStr;
      }
      rememberDate(dateStr);
      setTimeScale(0.0);
      telemetryController?.refresh();
    };

    const jumpToSelectedDate = () => {
      const selectedDateStr = timeMachineInput?.value;
      if (!selectedDateStr) return;
      jumpToDateString(selectedDateStr);
    };

    renderTimeHistory();

    if (jumpTimeBtn) {
      jumpTimeBtn.addEventListener('click', jumpToSelectedDate);
    }

    if (timeMachineInput) {
      timeMachineInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          jumpToSelectedDate();
        }
      });
    }

    const selectMission = (missionKey) => {
      if (cameraController.isInstrumentLocked) {
        cameraController.exitInstrumentView();
      }

      if (!missionKey) {
        missionSim.clearMission();
        followProbe = false;
        updateFollowButton();
        refreshInstrumentControls(true);
        if (missionDescription) {
          missionDescription.hidden = true;
          missionDescription.textContent = '';
        }
        return;
      }

      const mission = missionSim.loadMission(missionKey, getDaysSinceJ2000());
      if (!mission) return;

      simulationDate = new Date(mission.timestamp);
      const dateStr = mission.timestamp.slice(0, 10);
      if (timeMachineInput) {
        timeMachineInput.value = dateStr;
      }
      rememberDate(dateStr);

      titanSim.update(getDaysSinceJ2000());
      missionSim.update(getDaysSinceJ2000());
      setTimeScale(100);
      followProbe = false;
      updateFollowButton();
      missionSim.frameMission();
      refreshInstrumentControls(true);

      if (missionDescription) {
        missionDescription.textContent = `${mission.dateLabel} — ${mission.description}`;
        missionDescription.hidden = false;
      }
      telemetryController?.refresh();
    };

    if (missionSelector) {
      missionSelector.addEventListener('change', () => {
        selectMission(missionSelector.value);
      });
    }

    if (followProbeBtn) {
      followProbeBtn.addEventListener('click', () => {
        if (!missionSim.activeMission) return;
        if (cameraController.isInstrumentLocked) {
          cameraController.exitInstrumentView();
          refreshInstrumentControls(true);
        }
        followProbe = !followProbe;
        updateFollowButton();
        if (followProbe) {
          cameraController.focusOnObject(
            missionSim.probeGroup,
            missionSim.getFollowDistance(),
            0.25
          );
        } else {
          missionSim.frameMission();
        }
      });
    }

    if (instrumentViewBtn) {
      instrumentViewBtn.addEventListener('click', () => {
        if (!missionSim.activeMission) return;

        followProbe = false;
        updateFollowButton();

        if (cameraController.isInstrumentLocked) {
          cameraController.exitInstrumentView();
          missionSim.frameMission();
        } else {
          cameraController.engageInstrumentView(missionSim);
        }
        refreshInstrumentControls(true);
      });
    }

    if (instrumentLensBtn) {
      instrumentLensBtn.addEventListener('click', () => {
        if (!cameraController.isInstrumentLocked) return;
        cameraController.toggleInstrumentLens();
        refreshInstrumentControls(true);
      });
    }

    if (instrumentOpticsBtn) {
      instrumentOpticsBtn.addEventListener('click', () => {
        if (!cameraController.isInstrumentLocked) return;
        cameraController.toggleOpticsEmulation();
        refreshInstrumentControls(true);
      });
    }

    updateFollowButton();
    refreshInstrumentControls(true);

    const textureTargetSelect = document.getElementById('texture-target-select');
    const textureResolutionSelect = document.getElementById('texture-resolution-select');
    const texturePromptInput = document.getElementById('texture-prompt-input');
    const generateTextureBtn = document.getElementById('btn-generate-texture');
    const generateTextureState = document.getElementById('texture-generate-state');
    const focusTextureTargetBtn = document.getElementById('btn-focus-texture-target');
    const resetTextureBtn = document.getElementById('btn-reset-texture');
    const resetTextureState = document.getElementById('texture-reset-state');
    const texturePreviewWrap = document.getElementById('texture-preview-wrap');
    const texturePreviewThumb = document.getElementById('texture-preview-thumb');
    const textureStudioStatus = document.getElementById('texture-studio-status');
    let isGeneratingTexture = false;
    let lastTextureStatus = null;

    const getTextureTargetLabel = (targetId) => {
      const target = getTextureTarget(targetId);
      return target ? t(target.labelKey) : targetId;
    };

    const focusTextureTarget = (targetId) => {
      if (targetId === 'rings') {
        cameraController.focusOn(saturnSim.saturnMesh, 3.0);
        return;
      }
      const moonMap = {
        titan: [titanSim, 5.0],
        enceladus: [enceladusSim, 5.0],
        mimas: [mimasSim, 8.0, 0.0],
        tethys: [tethysSim, 5.0],
        dione: [dioneSim, 5.0],
        rhea: [rheaSim, 5.0],
        iapetus: [iapetusSim, 5.0]
      };
      const entry = moonMap[targetId];
      if (entry?.[0]) {
        cameraController.focusOn(entry[0].mesh, entry[1], entry[2]);
      }
    };

    const setTextureStatus = (statusObj) => {
      lastTextureStatus = statusObj;
      if (!textureStudioStatus) return;

      if (!statusObj) {
        textureStudioStatus.hidden = true;
        textureStudioStatus.textContent = '';
        textureStudioStatus.classList.remove('is-error');
        return;
      }

      textureStudioStatus.hidden = false;
      textureStudioStatus.classList.toggle('is-error', Boolean(statusObj.isError));
      if (statusObj.type === 'generating') {
        textureStudioStatus.textContent = t('textureStudio.generating');
      } else if (statusObj.type === 'applied') {
        textureStudioStatus.textContent = t('textureStudio.applied')
          .replace('{res}', statusObj.resolution)
          .replace('{target}', getTextureTargetLabel(statusObj.targetId));
      } else if (statusObj.type === 'restored') {
        textureStudioStatus.textContent = t('textureStudio.restored')
          .replace('{target}', getTextureTargetLabel(statusObj.targetId));
      } else {
        textureStudioStatus.textContent = statusObj.text || '';
      }
    };

    const refreshTextureStudioControls = () => {
      const targetId = textureTargetSelect?.value || 'rings';
      const resolution = textureResolutionSelect?.value || '2K';
      const override = textureStudioController?.getOverride(targetId);

      if (generateTextureBtn) {
        generateTextureBtn.disabled = isGeneratingTexture;
        generateTextureBtn.classList.toggle('active', isGeneratingTexture);
      }
      if (generateTextureState) {
        generateTextureState.textContent = isGeneratingTexture
          ? t('textureStudio.stateBusy')
          : resolution;
      }
      if (resetTextureBtn) {
        resetTextureBtn.disabled = isGeneratingTexture || !override;
        resetTextureBtn.classList.toggle('active', Boolean(override));
      }
      if (resetTextureState) {
        resetTextureState.textContent = override
          ? `${t('textureStudio.stateCustom')} ${override.resolution}`
          : t('textureStudio.stateBase');
      }
      if (texturePreviewWrap && texturePreviewThumb) {
        if (override?.dataUrl) {
          texturePreviewThumb.src = override.dataUrl;
          texturePreviewThumb.alt = t('textureStudio.previewAlt').replace(
            '{target}',
            getTextureTargetLabel(targetId)
          );
          texturePreviewWrap.hidden = false;
        } else {
          texturePreviewWrap.hidden = true;
          texturePreviewThumb.removeAttribute('src');
          texturePreviewThumb.alt = '';
        }
      }
      if (lastTextureStatus) {
        setTextureStatus(lastTextureStatus);
      }
    };

    if (textureTargetSelect) {
      textureTargetSelect.addEventListener('change', () => {
        refreshTextureStudioControls();
      });
    }

    if (textureResolutionSelect) {
      textureResolutionSelect.addEventListener('change', () => {
        refreshTextureStudioControls();
      });
    }

    if (focusTextureTargetBtn) {
      focusTextureTargetBtn.addEventListener('click', () => {
        focusTextureTarget(textureTargetSelect?.value || 'rings');
      });
    }

    if (generateTextureBtn) {
      generateTextureBtn.addEventListener('click', async () => {
        if (isGeneratingTexture) return;
        const targetId = textureTargetSelect?.value || 'rings';
        const resolution = textureResolutionSelect?.value || '2K';
        const customPrompt = texturePromptInput?.value || '';

        isGeneratingTexture = true;
        setTextureStatus({ type: 'generating' });
        refreshTextureStudioControls();

        try {
          const applied = await textureStudioController.generateAndApply({
            targetId,
            resolution,
            customPrompt
          });
          statsController?.refresh();
          setTextureStatus({
            type: 'applied',
            targetId: applied.targetId,
            resolution: applied.resolution
          });
          textureStudioStatus?.scrollIntoView({ block: 'nearest' });
        } catch (error) {
          setTextureStatus({
            type: 'error',
            isError: true,
            text: error instanceof Error ? error.message : String(error)
          });
          textureStudioStatus?.scrollIntoView({ block: 'nearest' });
        } finally {
          isGeneratingTexture = false;
          refreshTextureStudioControls();
        }
      });
    }

    if (resetTextureBtn) {
      resetTextureBtn.addEventListener('click', () => {
        const targetId = textureTargetSelect?.value || 'rings';
        if (textureStudioController.resetTarget(targetId)) {
          statsController?.refresh();
          setTextureStatus({ type: 'restored', targetId });
        }
        refreshTextureStudioControls();
      });
    }

    refreshTextureStudioControls();

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
      updateOrbitsButton();
      updateFollowButton();
      refreshInstrumentControls(true);
      updateAudioButton();
      updateLanguageState();
      updateStormButton();
      updateAuroraButton();
      telemetryController.refresh();
      statsController.refresh();
      renderTimeHistory();
      refreshTextureStudioControls();
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
  if (vintageOpticsPass) {
    vintageOpticsPass.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
  }
}

function tick() {
  requestAnimationFrame(tick);

  // El tiempo alimenta la rotación kepleriana diferencial de los anillos
  const deltaTime = clock.getDelta();
  if (vintageOpticsPass) {
    vintageOpticsPass.uniforms.uTime.value = clock.elapsedTime;
  }
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
  if (diffuseRingsSim) {
    enceladusSim.mesh.getWorldPosition(enceladusWorldPosition);
    diffuseRingsSim.update(orbitalTime, enceladusWorldPosition);
  }
  if (minorMoonsSim) {
    minorMoonsSim.update(daysSinceJ2000);
  }
  if (missionSim) {
    missionSim.update(daysSinceJ2000);
  }

  refreshInstrumentControls();

  if (cameraController?.isInstrumentLocked && missionSim?.activeMission) {
    missionSim.instrumentMount.getWorldPosition(camera.position);
    const opticalTarget = missionSim.getOpticalTargetPosition(
      missionSim.currentU,
      opticalSceneSimulators
    );
    if (opticalTarget) {
      camera.lookAt(opticalTarget);
    }

    missionSim.pathGroup.visible = false;
    labelRenderer.domElement.style.visibility = 'hidden';
    updateInstrumentReadout(opticalTarget);
  } else {
    if (missionSim) {
      missionSim.pathGroup.visible = true;
    }
    labelRenderer.domElement.style.visibility = '';

    // Sigue al objetivo activo y actualiza la inercia de OrbitControls.
    if (cameraController) {
      cameraController.update();
    }

    if (cameraController?.isSurfaceLocked && cameraController.surfaceMount) {
      cameraController.surfaceMount.getWorldPosition(surfaceMountPosition);
      camera.position.copy(surfaceMountPosition);
      camera.lookAt(0, 0, 0);
    }
  }

  if (telemetryController) {
    telemetryController.update(deltaTime);
  }
  if (orbitPathsController && cameraController) {
    orbitPathsController.setActiveTarget(cameraController.currentTarget);
  }

  composer.render();
  labelRenderer.render(scene, camera);

  if (statsController) {
    statsController.update();
  }
}

// Arrancar la aplicación
bootstrapApp();
