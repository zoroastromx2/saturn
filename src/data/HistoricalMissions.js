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
    name: 'Pioneer 11',
    timestamp: '1979-09-01T16:29:00Z',
    dateLabel: '1979-09-01 16:29 UTC',
    description: 'Sobrevuelo hiperbólico bajo los anillos, con máxima aproximación de 20.000 km sobre las nubes.',
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
        title: 'Cruce del plano exterior de anillos',
        targetKey: 'RING_F',
        targetOffset: new THREE.Vector3(0, 0.02, 0),
        instrumentName: 'Pioneer IPP - Photopolarimeter',
        defaultFov: 35
      },
      {
        t: 0.5,
        title: 'Máxima aproximación (<20,000 km de las nubes)',
        targetKey: 'SATURN',
        targetOffset: new THREE.Vector3(0, 0.28, 0.95),
        instrumentName: 'Pioneer IPP - Photopolarimeter',
        defaultFov: 12
      },
      {
        t: 0.8,
        title: 'Descubrimiento del Anillo F y Epimeteo',
        targetKey: 'RING_F',
        targetOffset: new THREE.Vector3(0, 0, 0),
        instrumentName: 'Pioneer IPP - Photopolarimeter',
        defaultFov: 12
      }
    ]
  },

  voyager1: {
    key: 'voyager1',
    name: 'Voyager 1',
    timestamp: '1980-11-12T23:46:00Z',
    dateLabel: '1980-11-12 23:46 UTC',
    description: 'Encuentro con Titán, paso bajo el polo sur y deflexión norte sobre el plano de los anillos.',
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
        title: 'Sobrevuelo cercano a Titán (estudio atmosférico)',
        targetKey: 'TITAN',
        targetOffset: new THREE.Vector3(0, 0.02, 0.03),
        instrumentName: 'Voyager ISS - Narrow Angle (NAC)',
        defaultFov: 12
      },
      {
        t: 0.5,
        title: 'Periapsis sobre el hemisferio sur (124,000 km)',
        targetKey: 'SATURN',
        targetOffset: new THREE.Vector3(0, -0.92, 0.38),
        instrumentName: 'Voyager ISS - Narrow Angle (NAC)',
        defaultFov: 10
      },
      {
        t: 0.85,
        title: 'Inclinación de salida hacia el espacio interestelar',
        targetKey: 'SATURN',
        targetOffset: new THREE.Vector3(0, 0.38, 0.92),
        instrumentName: 'Voyager ISS - Wide Angle (WAC)',
        defaultFov: 35
      }
    ]
  },

  voyager2: {
    key: 'voyager2',
    name: 'Voyager 2',
    timestamp: '1981-08-25T03:24:00Z',
    dateLabel: '1981-08-25 03:24 UTC',
    description: 'Paso veloz junto a Encélado y Tetis, captura de los anillos y descenso hacia el plano exterior rumbo a Urano.',
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
        title: 'Captura de alta resolución de los anillos',
        targetKey: 'RING_F',
        targetOffset: new THREE.Vector3(0, 0.015, 0),
        instrumentName: 'Voyager ISS - Narrow Angle (NAC)',
        defaultFov: 10
      },
      {
        t: 0.55,
        title: 'Aproximación cercana a Encélado y Tetis',
        targetKey: 'ENCELADUS',
        targetOffset: new THREE.Vector3(0, 0.004, 0.006),
        instrumentName: 'Voyager ISS - Narrow Angle (NAC)',
        defaultFov: 12
      },
      {
        t: 0.8,
        title: 'Cruce descendente del plano de anillos rumbo a Urano',
        targetKey: 'RING_F',
        targetOffset: new THREE.Vector3(0, -0.02, 0),
        instrumentName: 'Voyager ISS - Wide Angle (WAC)',
        defaultFov: 35
      }
    ]
  },

  cassiniInsertion: {
    key: 'cassiniInsertion',
    name: 'Cassini-Huygens',
    timestamp: '2004-07-01T01:12:00Z',
    dateLabel: '2004-07-01 01:12 UTC',
    description: 'Ascenso por la brecha F-G, encendido de inserción orbital y captura en una órbita elíptica alrededor de Saturno.',
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
        title: 'Ascenso a través de la brecha de los anillos F y G',
        targetKey: 'RING_F',
        targetOffset: new THREE.Vector3(0, 0.01, 0),
        instrumentName: 'Cassini ISS - Wide Angle (WAC)',
        defaultFov: 35
      },
      {
        t: 0.5,
        title: 'Encendido de motor de 96 minutos (Inserción Orbital)',
        targetKey: 'SATURN',
        targetOffset: new THREE.Vector3(0, 0.78, 0.62),
        instrumentName: 'Cassini ISS - Narrow Angle (NAC)',
        defaultFov: 12
      },
      {
        t: 0.85,
        title: 'Captura exitosa en órbita de Saturno (13 años de misión)',
        targetKey: 'SATURN',
        targetOffset: new THREE.Vector3(0, 0.25, 0.97),
        instrumentName: 'Cassini ISS - Wide Angle (WAC)',
        defaultFov: 35
      }
    ]
  },

  huygens: {
    key: 'huygens',
    name: 'Sonda Huygens',
    timestamp: '2005-01-14T10:13:00Z',
    dateLabel: '2005-01-14 10:13 UTC',
    description: 'Descenso de Huygens desde la alta atmósfera de Titán hasta la superficie, anclado a la posición viva de la luna.',
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
        title: 'Entrada en la densa atmósfera de nitrógeno y metano',
        targetKey: 'TITAN',
        targetOffset: new THREE.Vector3(0.01, 0.01, 0.03),
        instrumentName: 'Huygens DISR',
        defaultFov: 35
      },
      {
        t: 0.5,
        title: 'Despliegue de paracaídas e imágenes de ríos de metano',
        targetKey: 'TITAN',
        targetOffset: new THREE.Vector3(0.015, 0.005, 0.035),
        instrumentName: 'Huygens DISR',
        defaultFov: 35
      },
      {
        t: 1.0,
        title: 'Aterrizaje histórico en la superficie de Titán',
        targetKey: 'TITAN',
        targetOffset: new THREE.Vector3(0.015, 0, 0.035),
        instrumentName: 'Huygens DISR',
        defaultFov: 35
      }
    ]
  },

  cassiniGrandFinale: {
    key: 'cassiniGrandFinale',
    name: 'Cassini · Gran Final',
    timestamp: '2017-09-15T11:55:00Z',
    dateLabel: '2017-09-15 11:55 UTC',
    description: 'Inmersión final entre el Anillo D y la atmósfera, entrada a 113.000 km/h y desintegración sobre las nubes de Saturno.',
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
        title: 'Último cruce entre el Anillo D y la atmósfera',
        targetKey: 'SATURN',
        targetOffset: new THREE.Vector3(0.25, 0.95, 0),
        instrumentName: 'Cassini ISS - Narrow Angle (NAC)',
        defaultFov: 10
      },
      {
        t: 0.65,
        title: 'Entrada atmosférica a 113,000 km/h (Propulsores al 100%)',
        targetKey: 'VELOCITY_VECTOR',
        targetOffset: new THREE.Vector3(0, 0, 0),
        instrumentName: 'Cassini ISS - Wide Angle (WAC)',
        defaultFov: 35
      },
      {
        t: 1.0,
        title: 'Fin de transmisión: Desintegración en las nubes de Saturno',
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
