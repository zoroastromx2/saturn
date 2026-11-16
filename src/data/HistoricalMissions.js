import * as THREE from 'three';
import { CONSTANTS } from '../math/AstroScale.js';

const TITAN_RADIUS_IN_SATURN_RADII = CONSTANTS.TITAN.RADIUS / CONSTANTS.SATURN.RADIUS_EQUATORIAL;
const SATURN_POLAR_RATIO = CONSTANTS.SATURN.RADIUS_POLAR / CONSTANTS.SATURN.RADIUS_EQUATORIAL;
const GRAND_FINALE_LATITUDE = (10 * Math.PI) / 180;
const GRAND_FINALE_ENTRY_ALTITUDE = 1.07;

const grandFinaleFinalPoint = [
  Math.cos(GRAND_FINALE_LATITUDE) * GRAND_FINALE_ENTRY_ALTITUDE,
  Math.sin(GRAND_FINALE_LATITUDE) * SATURN_POLAR_RATIO * GRAND_FINALE_ENTRY_ALTITUDE,
  0
];

export const MISSIONS = {
  pioneer11: {
    key: 'pioneer11',
    name: { es: 'Pioneer 11', en: 'Pioneer 11' },
    timestamp: '1979-09-01T16:29:00Z',
    dateLabel: '1979-09-01 16:29 UTC',
    description: {
      es: 'Sobrevuelo hiperbólico bajo los anillos, con máxima aproximación de 20.000 km sobre las nubes.',
      en: 'Hyperbolic flyby beneath the rings, with a closest approach of 20,000 km above the clouds.'
    },
    color: 0x62d9ff,
    opticsMode: 1,
    peakT: 0.5,
    windowHours: 48,
    anchoredToTitan: false,
    controlPoints: [
      [-11.0, 2.4, 8.0],
      [-6.5, 1.1, 4.8],
      [-3.1, 0.3, 2.1],
      [-2.1, -0.35, 0.6],
      [-1.326, -0.1, 0.0],
      [-0.3, -0.4, -0.8],
      [2.8, -0.3, -2.8],
      [7.0, 0.6, -5.2],
      [13.0, 2.2, -9.0]
    ],
    milestones: [
      {
        t: 0.25,
        title: { es: 'Cruce del plano exterior de anillos', en: 'Outer ring-plane crossing' },
        targetKey: 'RING_F',
        targetOffset: new THREE.Vector3(0, 0.02, 0),
        instrumentName: 'Pioneer IPP - Photopolarimeter',
        defaultFov: 35
      },
      {
        t: 0.5,
        title: {
          es: 'Máxima aproximación (<20,000 km de las nubes)',
          en: 'Closest approach (<20,000 km above the clouds)'
        },
        targetKey: 'SATURN',
        targetOffset: new THREE.Vector3(0, 0.28, 0.95),
        instrumentName: 'Pioneer IPP - Photopolarimeter',
        defaultFov: 12
      },
      {
        t: 0.8,
        title: {
          es: 'Descubrimiento del Anillo F y Epimeteo',
          en: 'Discovery of the F ring and Epimetheus'
        },
        targetKey: 'RING_F',
        targetOffset: new THREE.Vector3(0, 0, 0),
        instrumentName: 'Pioneer IPP - Photopolarimeter',
        defaultFov: 12
      }
    ]
  },

  voyager1: {
    key: 'voyager1',
    name: { es: 'Voyager 1', en: 'Voyager 1' },
    timestamp: '1980-11-12T23:46:00Z',
    dateLabel: '1980-11-12 23:46 UTC',
    description: {
      es: 'Encuentro con Titán, paso bajo el polo sur y deflexión norte sobre el plano de los anillos.',
      en: 'Titan encounter, pass beneath the south pole, and northward deflection above the ring plane.'
    },
    color: 0x62d9ff,
    opticsMode: 2,
    peakT: 0.5,
    windowHours: 48,
    anchoredToTitan: false,
    controlPoints: [
      [24.0, 4.0, -14.0],
      [20.0, 2.8, -10.0],
      [14.0, 1.4, -6.0],
      [7.0, 0.2, -2.5],
      [2.9, -1.0, 0.5],
      [1.7, 1.4, 0.8],
      [4.5, 5.5, 3.5],
      [12.0, 11.0, 8.0],
      [20.0, 17.0, 13.0]
    ],
    milestones: [
      {
        t: 0.2,
        title: {
          es: 'Sobrevuelo cercano a Titán (estudio atmosférico)',
          en: 'Close Titan flyby (atmospheric study)'
        },
        targetKey: 'TITAN',
        targetOffset: new THREE.Vector3(0, 0.02, 0.03),
        instrumentName: 'Voyager ISS - Narrow Angle (NAC)',
        defaultFov: 12
      },
      {
        t: 0.5,
        title: {
          es: 'Periapsis sobre el hemisferio sur (124,000 km)',
          en: 'Periapsis over the southern hemisphere (124,000 km)'
        },
        targetKey: 'SATURN',
        targetOffset: new THREE.Vector3(0, -0.92, 0.38),
        instrumentName: 'Voyager ISS - Narrow Angle (NAC)',
        defaultFov: 10
      },
      {
        t: 0.85,
        title: {
          es: 'Inclinación de salida hacia el espacio interestelar',
          en: 'Outbound inclination toward interstellar space'
        },
        targetKey: 'SATURN',
        targetOffset: new THREE.Vector3(0, 0.38, 0.92),
        instrumentName: 'Voyager ISS - Wide Angle (WAC)',
        defaultFov: 35
      }
    ]
  },

  voyager2: {
    key: 'voyager2',
    name: { es: 'Voyager 2', en: 'Voyager 2' },
    timestamp: '1981-08-25T03:24:00Z',
    dateLabel: '1981-08-25 03:24 UTC',
    description: {
      es: 'Paso veloz junto a Encélado y Tetis, captura de los anillos y descenso hacia el plano exterior rumbo a Urano.',
      en: 'Fast pass by Enceladus and Tethys, ring imaging, and descent toward the outer plane en route to Uranus.'
    },
    color: 0x62d9ff,
    opticsMode: 2,
    peakT: 0.5,
    windowHours: 48,
    anchoredToTitan: false,
    controlPoints: [
      [-14.0, -3.5, 9.0],
      [-9.0, -1.8, 6.0],
      [-5.2, -0.3, 3.4],
      [-3.3, -0.5, 1.2],
      [-1.2, -1.2, -0.4],
      [1.8, -2.2, -1.8],
      [5.5, -4.6, -4.0],
      [10.0, -7.5, -7.0],
      [16.0, -11.0, -11.0]
    ],
    milestones: [
      {
        t: 0.3,
        title: {
          es: 'Captura de alta resolución de los anillos',
          en: 'High-resolution ring imaging'
        },
        targetKey: 'RING_F',
        targetOffset: new THREE.Vector3(0, 0.015, 0),
        instrumentName: 'Voyager ISS - Narrow Angle (NAC)',
        defaultFov: 10
      },
      {
        t: 0.55,
        title: {
          es: 'Aproximación cercana a Encélado y Tetis',
          en: 'Close approach to Enceladus and Tethys'
        },
        targetKey: 'ENCELADUS',
        targetOffset: new THREE.Vector3(0, 0.004, 0.006),
        instrumentName: 'Voyager ISS - Narrow Angle (NAC)',
        defaultFov: 12
      },
      {
        t: 0.8,
        title: {
          es: 'Cruce descendente del plano de anillos rumbo a Urano',
          en: 'Descending ring-plane crossing en route to Uranus'
        },
        targetKey: 'RING_F',
        targetOffset: new THREE.Vector3(0, -0.02, 0),
        instrumentName: 'Voyager ISS - Wide Angle (WAC)',
        defaultFov: 35
      }
    ]
  },

  cassiniInsertion: {
    key: 'cassiniInsertion',
    name: { es: 'Cassini-Huygens', en: 'Cassini-Huygens' },
    timestamp: '2004-07-01T01:12:00Z',
    dateLabel: '2004-07-01 01:12 UTC',
    description: {
      es: 'Ascenso por la brecha F-G, encendido de inserción orbital y captura en una órbita elíptica alrededor de Saturno.',
      en: 'Ascent through the F-G gap, orbital insertion burn, and capture into an elliptical orbit around Saturn.'
    },
    color: 0xf0a33c,
    opticsMode: 3,
    peakT: 0.5,
    windowHours: 48,
    anchoredToTitan: false,
    controlPoints: [
      [10.5, -0.8, 7.2],
      [6.4, -0.3, 4.3],
      [3.4, 0.05, 2.4],
      [2.55, 0.12, 1.1],
      [1.35, 0.25, 0.25],
      [2.3, -0.3, -1.4],
      [5.4, -0.4, -3.9],
      [8.8, 0.2, -6.2],
      [10.4, 0.7, -7.4]
    ],
    milestones: [
      {
        t: 0.2,
        title: {
          es: 'Ascenso a través de la brecha de los anillos F y G',
          en: 'Ascent through the F and G ring gap'
        },
        targetKey: 'RING_F',
        targetOffset: new THREE.Vector3(0, 0.01, 0),
        instrumentName: 'Cassini ISS - Wide Angle (WAC)',
        defaultFov: 35
      },
      {
        t: 0.5,
        title: {
          es: 'Encendido de motor de 96 minutos (Inserción Orbital)',
          en: '96-minute engine burn (Orbital Insertion)'
        },
        targetKey: 'SATURN',
        targetOffset: new THREE.Vector3(0, 0.78, 0.62),
        instrumentName: 'Cassini ISS - Narrow Angle (NAC)',
        defaultFov: 12
      },
      {
        t: 0.85,
        title: {
          es: 'Captura exitosa en órbita de Saturno (13 años de misión)',
          en: 'Successful capture into Saturn orbit (13-year mission)'
        },
        targetKey: 'SATURN',
        targetOffset: new THREE.Vector3(0, 0.25, 0.97),
        instrumentName: 'Cassini ISS - Wide Angle (WAC)',
        defaultFov: 35
      }
    ]
  },

  huygens: {
    key: 'huygens',
    name: { es: 'Sonda Huygens', en: 'Huygens Probe' },
    timestamp: '2005-01-14T10:13:00Z',
    dateLabel: '2005-01-14 10:13 UTC',
    description: {
      es: 'Descenso de Huygens desde la alta atmósfera de Titán hasta la superficie, anclado a la posición viva de la luna.',
      en: 'Huygens descent from the upper atmosphere of Titan to the surface, anchored to the live position of the moon.'
    },
    color: 0xffc45c,
    opticsMode: 3,
    peakT: 1.0,
    windowHours: 48,
    anchoredToTitan: true,
    controlPoints: [
      [0.0, 0.7, 0.0],
      [0.16, 0.52, 0.06],
      [0.18, 0.32, 0.05],
      [0.08, 0.14, 0.0],
      [0.0, TITAN_RADIUS_IN_SATURN_RADII, 0.0]
    ],
    milestones: [
      {
        t: 0.15,
        title: {
          es: 'Entrada en la densa atmósfera de nitrógeno y metano',
          en: 'Entry into the dense nitrogen-methane atmosphere'
        },
        targetKey: 'TITAN',
        targetOffset: new THREE.Vector3(0.01, 0.01, 0.03),
        instrumentName: 'Huygens DISR',
        defaultFov: 35
      },
      {
        t: 0.5,
        title: {
          es: 'Despliegue de paracaídas e imágenes de ríos de metano',
          en: 'Parachute deployment and images of methane rivers'
        },
        targetKey: 'TITAN',
        targetOffset: new THREE.Vector3(0.015, 0.005, 0.035),
        instrumentName: 'Huygens DISR',
        defaultFov: 35
      },
      {
        t: 1.0,
        title: {
          es: 'Aterrizaje histórico en la superficie de Titán',
          en: 'Historic landing on the surface of Titan'
        },
        targetKey: 'TITAN',
        targetOffset: new THREE.Vector3(0.015, 0, 0.035),
        instrumentName: 'Huygens DISR',
        defaultFov: 35
      }
    ]
  },

  cassiniGrandFinale: {
    key: 'cassiniGrandFinale',
    name: { es: 'Cassini · Gran Final', en: 'Cassini · Grand Finale' },
    timestamp: '2017-09-15T11:55:00Z',
    dateLabel: '2017-09-15 11:55 UTC',
    description: {
      es: 'Inmersión final entre el Anillo D y la atmósfera, entrada a 113.000 km/h y desintegración sobre las nubes de Saturno.',
      en: 'Final plunge between the D ring and the atmosphere, entry at 113,000 km/h, and disintegration above the clouds of Saturn.'
    },
    color: 0xff8a3d,
    opticsMode: 3,
    peakT: 1.0,
    windowHours: 48,
    anchoredToTitan: false,
    controlPoints: [
      [3.2, 4.4, 1.2],
      [2.4, 3.0, 0.8],
      [1.5, 1.6, 0.35],
      [1.24, 0.9, 0.12],
      [1.12, 0.45, 0.05],
      grandFinaleFinalPoint
    ],
    milestones: [
      {
        t: 0.25,
        title: {
          es: 'Último cruce entre el Anillo D y la atmósfera',
          en: 'Last crossing between the D ring and the atmosphere'
        },
        targetKey: 'SATURN',
        targetOffset: new THREE.Vector3(0.25, 0.95, 0),
        instrumentName: 'Cassini ISS - Narrow Angle (NAC)',
        defaultFov: 10
      },
      {
        t: 0.65,
        title: {
          es: 'Entrada atmosférica a 113,000 km/h (Propulsores al 100%)',
          en: 'Atmospheric entry at 113,000 km/h (thrusters at 100%)'
        },
        targetKey: 'VELOCITY_VECTOR',
        targetOffset: new THREE.Vector3(0, 0, 0),
        instrumentName: 'Cassini ISS - Wide Angle (WAC)',
        defaultFov: 35
      },
      {
        t: 1.0,
        title: {
          es: 'Fin de transmisión: Desintegración en las nubes de Saturno',
          en: 'End of transmission: disintegration in the clouds of Saturn'
        },
        targetKey: 'VELOCITY_VECTOR',
        targetOffset: new THREE.Vector3(0, 0, 0),
        instrumentName: 'Cassini ISS - Narrow Angle (NAC)',
        defaultFov: 10
      }
    ]
  }
};

export const MISSION_ORDER = [
  'pioneer11',
  'voyager1',
  'voyager2',
  'cassiniInsertion',
  'huygens',
  'cassiniGrandFinale'
];
