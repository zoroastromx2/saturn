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
import { ComparisonMode } from './core/ComparisonMode.js';
import { CameraController } from './core/CameraController.js';
import { TelemetryController } from './core/TelemetryController.js';
import { getLanguage, setLanguage, t } from './core/Localization.js';
import './style.css';

let scene, camera, renderer, composer, labelRenderer, controls, cameraController, listener;
let saturnSim, titanSim, enceladusSim, comparisonMode, telemetryController;
let audioEnabled = false;
let timeScale = 1.0;
let orbitalTime = 0.0;
const clock = new THREE.Clock();
const surfaceMountPosition = new THREE.Vector3();

async function bootstrapApp() {
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
    saturnSim = new SaturnSimulator(scene, assets, listener);
    titanSim = new TitanSimulator(scene, saturnSim, saturnSim.scaleFactor, assets, listener);
    titanSim.update(0);
    enceladusSim = new EnceladusSimulator(scene, saturnSim, saturnSim.scaleFactor, assets, listener);
    enceladusSim.update(0);
    comparisonMode = new ComparisonMode(scene, saturnSim, camera, assets);
    telemetryController = new TelemetryController(camera, cameraController, saturnSim.scaleFactor);

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
    const surfaceEnceladusBtn = document.getElementById('btn-surface-enceladus');
    const labelsBtn = document.getElementById('btn-toggle-labels');
    const audioBtn = document.getElementById('btn-toggle-audio');
    const languageBtn = document.getElementById('btn-toggle-language');
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

    if (surfaceEnceladusBtn) {
      surfaceEnceladusBtn.addEventListener('click', () => {
        cameraController.landOnSurface(enceladusSim);
      });
    }

    if (labelsBtn) {
      labelsBtn.addEventListener('click', () => {
        const showLabels = document.body.classList.toggle('show-labels');
        labelsBtn.textContent = t(showLabels ? 'nav.hideLabels' : 'nav.showLabels');
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
          enceladusSim.ambientSound
        ].filter(Boolean);

        if (audioEnabled) {
          ambientSounds.forEach((sound) => {
            if (!sound.isPlaying) sound.play();
          });
          audioBtn.textContent = t('nav.muteAudio');
        } else {
          ambientSounds.forEach((sound) => {
            if (sound.isPlaying) sound.pause();
          });
          audioBtn.textContent = t('nav.enableAudio');
        }
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
      if (labelsBtn) {
        labelsBtn.textContent = t(
          document.body.classList.contains('show-labels') ? 'nav.hideLabels' : 'nav.showLabels'
        );
      }
      if (audioBtn) {
        audioBtn.textContent = t(audioEnabled ? 'nav.muteAudio' : 'nav.enableAudio');
      }

      saturnSim.label.element.textContent = t('body.saturn');
      titanSim.label.element.textContent = t('body.titan');
      enceladusSim.label.element.textContent = t('body.enceladus');
      comparisonMode.label.element.textContent = t('body.earth');
      telemetryController.refresh();
    };

    document.addEventListener('languagechange', updateDynamicLanguage);

    if (languageBtn) {
      languageBtn.addEventListener('click', () => {
        setLanguage(getLanguage() === 'es' ? 'en' : 'es');
      });
    }

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

  if (saturnSim && saturnSim.ringsMesh) {
    saturnSim.ringsMesh.material.uniforms.uTime.value = orbitalTime;
  }
  if (titanSim) {
    titanSim.update(orbitalTime);
  }
  if (enceladusSim) {
    enceladusSim.update(orbitalTime, deltaTime);
  }

  // Sigue al objetivo activo y actualiza la inercia de OrbitControls.
  if (cameraController) {
    cameraController.update();
  }

  if (cameraController?.isSurfaceLocked && enceladusSim) {
    enceladusSim.surfaceCameraMount.getWorldPosition(surfaceMountPosition);
    camera.position.copy(surfaceMountPosition);
    camera.lookAt(0, 0, 0);
  }

  if (telemetryController) {
    telemetryController.update(deltaTime);
  }

  composer.render();
  labelRenderer.render(scene, camera);
}

// Arrancar la aplicación
bootstrapApp();
