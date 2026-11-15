const translations = {
  es: {
    'app.title': 'Simulador de Saturno',
    'loader.loading': 'Cargando datos de la misión Cassini...',
    'telemetry.target': 'Objetivo activo',
    'telemetry.altitude': 'Altitud de superficie',
    'telemetry.period': 'Período orbital',
    'telemetry.days': 'días',
    'nav.focusSaturn': 'Enfocar Saturno',
    'nav.focusEarth': 'Enfocar Tierra',
    'nav.focusTitan': 'Enfocar Titán',
    'nav.focusEnceladus': 'Enfocar Encélado',
    'nav.landEnceladus': 'Aterrizar en Encélado',
    'nav.showLabels': 'Mostrar etiquetas',
    'nav.hideLabels': 'Ocultar etiquetas',
    'nav.enableAudio': '🔇 Activar audio',
    'nav.muteAudio': '🔊 Silenciar audio',
    'language.toggle': '🌐 EN',
    'language.toggleAria': 'Cambiar a inglés',
    'time.pause': '|| Pausa',
    'time.controlsAria': 'Controles de tiempo orbital',
    'body.saturn': 'Saturno',
    'body.earth': 'Tierra',
    'body.titan': 'Titán',
    'body.enceladus': 'Encélado',
    'error.bootstrap': 'Error inicializando el simulador. Revisa la consola.'
  },
  en: {
    'app.title': 'Saturn Simulator',
    'loader.loading': 'Loading Cassini mission data...',
    'telemetry.target': 'Active Target',
    'telemetry.altitude': 'Surface Altitude',
    'telemetry.period': 'Orbital Period',
    'telemetry.days': 'days',
    'nav.focusSaturn': 'Focus Saturn',
    'nav.focusEarth': 'Focus Earth',
    'nav.focusTitan': 'Focus Titan',
    'nav.focusEnceladus': 'Focus Enceladus',
    'nav.landEnceladus': 'Land on Enceladus',
    'nav.showLabels': 'Show labels',
    'nav.hideLabels': 'Hide labels',
    'nav.enableAudio': '🔇 Enable audio',
    'nav.muteAudio': '🔊 Mute audio',
    'language.toggle': '🌐 ES',
    'language.toggleAria': 'Switch to Spanish',
    'time.pause': '|| Pause',
    'time.controlsAria': 'Orbital time controls',
    'body.saturn': 'Saturn',
    'body.earth': 'Earth',
    'body.titan': 'Titan',
    'body.enceladus': 'Enceladus',
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
