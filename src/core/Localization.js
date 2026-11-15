const translations = {
  es: {
    'app.title': 'Simulador de Saturno',
    'app.subtitle': 'Observatorio volumétrico de Saturno / 01',
    'loader.loading': 'Cargando datos de la misión Cassini...',
    'telemetry.target': 'Objetivo activo',
    'telemetry.altitude': 'Altitud de superficie',
    'telemetry.period': 'Período orbital',
    'telemetry.velocity': 'Velocidad orbital',
    'telemetry.sunDistance': 'Distancia al Sol',
    'telemetry.eccentricity': 'Excentricidad orbital',
    'telemetry.apoapsis': 'Apoápsis',
    'telemetry.periapsis': 'Periápsis',
    'telemetry.days': 'días',
    'nav.focusSaturn': 'Ir a Saturno',
    'nav.focusEarth': 'Ir a Tierra',
    'nav.focusTitan': 'Ir a Titán',
    'nav.focusEnceladus': 'Ir a Encélado',
    'nav.landEnceladus': 'Aterrizar en Encélado',
    'nav.focusMimas': 'Ir a Mimas',
    'nav.focusTethys': 'Ir a Tetis',
    'nav.focusDione': 'Ir a Dione',
    'nav.focusRhea': 'Ir a Rea',
    'nav.focusIapetus': 'Ir a Jápeto',
    'nav.landMimas': 'Aterrizar en Mimas',
    'nav.showLabels': 'Mostrar etiquetas',
    'nav.hideLabels': 'Ocultar etiquetas',
    'nav.enableAudio': 'Activar audio',
    'nav.muteAudio': 'Silenciar audio',
    'language.toggle': 'Idioma · EN',
    'language.toggleAria': 'Cambiar a inglés',
    'ui.showControls': 'Mostrar controles',
    'ui.hideControls': 'Ocultar controles',
    'aurora.on': 'Auroras: ON',
    'aurora.off': 'Auroras: OFF',
    'hexagon.on': 'Hexágono: ON',
    'hexagon.off': 'Hexágono: OFF',
    'time.pause': '|| Pausa',
    'time.controlsAria': 'Controles de tiempo orbital',
    'console.telemetry': 'Telemetría',
    'console.navigation': 'Controles',
    'console.time': 'Tiempo orbital',
    'console.goTo': 'Ir a',
    'console.landOn': 'Aterrizar en',
    'console.system': 'Sistema',
    'console.labels': 'Etiquetas',
    'console.audio': 'Audio',
    'console.language': 'Idioma',
    'console.hexagon': 'Hexágono',
    'console.auroras': 'Auroras',
    'state.on': 'ON',
    'state.off': 'OFF',
    'language.code': 'ES',
    'body.saturn': 'Saturno',
    'body.earth': 'Tierra',
    'body.titan': 'Titán',
    'body.enceladus': 'Encélado',
    'body.mimas': 'Mimas',
    'body.tethys': 'Tetis',
    'body.dione': 'Dione',
    'body.rhea': 'Rea',
    'body.iapetus': 'Jápeto',
    'error.bootstrap': 'Error inicializando el simulador. Revisa la consola.'
  },
  en: {
    'app.title': 'Saturn Simulator',
    'app.subtitle': 'Volumetric Saturn Observatory / 01',
    'loader.loading': 'Loading Cassini mission data...',
    'telemetry.target': 'Active Target',
    'telemetry.altitude': 'Surface Altitude',
    'telemetry.period': 'Orbital Period',
    'telemetry.velocity': 'Orbital Velocity',
    'telemetry.sunDistance': 'Distance from Sun',
    'telemetry.eccentricity': 'Orbital Eccentricity',
    'telemetry.apoapsis': 'Apoapsis',
    'telemetry.periapsis': 'Periapsis',
    'telemetry.days': 'days',
    'nav.focusSaturn': 'Focus Saturn',
    'nav.focusEarth': 'Focus Earth',
    'nav.focusTitan': 'Focus Titan',
    'nav.focusEnceladus': 'Focus Enceladus',
    'nav.landEnceladus': 'Land on Enceladus',
    'nav.focusMimas': 'Focus Mimas',
    'nav.focusTethys': 'Focus Tethys',
    'nav.focusDione': 'Focus Dione',
    'nav.focusRhea': 'Focus Rhea',
    'nav.focusIapetus': 'Focus Iapetus',
    'nav.landMimas': 'Land on Mimas',
    'nav.showLabels': 'Show labels',
    'nav.hideLabels': 'Hide labels',
    'nav.enableAudio': 'Enable audio',
    'nav.muteAudio': 'Mute audio',
    'language.toggle': 'Language · ES',
    'language.toggleAria': 'Switch to Spanish',
    'ui.showControls': 'Show controls',
    'ui.hideControls': 'Hide controls',
    'aurora.on': 'Auroras: ON',
    'aurora.off': 'Auroras: OFF',
    'hexagon.on': 'Hexagon: ON',
    'hexagon.off': 'Hexagon: OFF',
    'time.pause': '|| Pause',
    'time.controlsAria': 'Orbital time controls',
    'console.telemetry': 'Telemetry',
    'console.navigation': 'Controls',
    'console.time': 'Orbital time',
    'console.goTo': 'Go to',
    'console.landOn': 'Land on',
    'console.system': 'System',
    'console.labels': 'Labels',
    'console.audio': 'Audio',
    'console.language': 'Language',
    'console.hexagon': 'Hexagon',
    'console.auroras': 'Auroras',
    'state.on': 'ON',
    'state.off': 'OFF',
    'language.code': 'EN',
    'body.saturn': 'Saturn',
    'body.earth': 'Earth',
    'body.titan': 'Titan',
    'body.enceladus': 'Enceladus',
    'body.mimas': 'Mimas',
    'body.tethys': 'Tethys',
    'body.dione': 'Dione',
    'body.rhea': 'Rhea',
    'body.iapetus': 'Iapetus',
    'error.bootstrap': 'Error initializing the simulator. Check the console.'
  }
};

let currentLanguage = 'es';

export function t(key) {
  return translations[currentLanguage]?.[key] ?? translations.es[key] ?? key;
}

export function getLanguage() {
  return currentLanguage;
}

export function setLanguage(language) {
  if (!translations[language]) return;

  currentLanguage = language;
  document.documentElement.lang = language;
  document.title = t('app.title');

  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });

  document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
    element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel));
  });

  document.dispatchEvent(new CustomEvent('languagechange', { detail: { language } }));
}
