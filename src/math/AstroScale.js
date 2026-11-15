/**
 * AstroScale.js
 * Constantes y cálculos planetarios basados en los "Planetary Fact Sheets" de la NASA.
 * Todas las medidas de radio están en kilómetros (km) al nivel de 1 bar de presión.
 */

export const CONSTANTS = {
  EARTH: {
    RADIUS_EQUATORIAL: 6378.137,
    RADIUS_POLAR: 6356.752,
    SUN_DISTANCE_KM: 149597870.7,
    ORBIT_ECCENTRICITY: 0.0167
  },
  ENCELADUS: {
    RADIUS: 252.1,              // Muy pequeño comparado con Titán
    ORBIT_SEMI_MAJOR: 237948.0, // Orbita muy cerca, dentro del Anillo E
    ORBIT_PERIOD: 1.37,         // Completa una vuelta en ~1.37 días
    ORBIT_ECCENTRICITY: 0.0047,
    ECCENTRICITY: 0.0047,
    INCLINATION: 0.009,
    LAN: 0.0,
    MEAN_ANOMALY_EPOCH: 0.0
  },
  MIMAS: {
    RADIUS: 198.2,
    ORBIT_SEMI_MAJOR: 185520.0,
    ORBIT_PERIOD: 0.942,
    ORBIT_ECCENTRICITY: 0.0196,
    ECCENTRICITY: 0.0196,
    INCLINATION: 1.574,
    LAN: 0.0,
    MEAN_ANOMALY_EPOCH: 0.0
  },
  TETHYS: {
    RADIUS: 531.0,
    ORBIT_SEMI_MAJOR: 294619.0,
    ORBIT_PERIOD: 1.887,
    ORBIT_ECCENTRICITY: 0.0001,
    ECCENTRICITY: 0.0001,
    INCLINATION: 1.091,
    LAN: 0.0,
    MEAN_ANOMALY_EPOCH: 0.0
  },
  DIONE: {
    RADIUS: 561.4,
    ORBIT_SEMI_MAJOR: 377396.0,
    ORBIT_PERIOD: 2.736,
    ORBIT_ECCENTRICITY: 0.0022,
    ECCENTRICITY: 0.0022,
    INCLINATION: 0.028,
    LAN: 0.0,
    MEAN_ANOMALY_EPOCH: 0.0
  },
  RHEA: {
    RADIUS: 763.8,
    ORBIT_SEMI_MAJOR: 527108.0,
    ORBIT_PERIOD: 4.518,
    ORBIT_ECCENTRICITY: 0.0013,
    ECCENTRICITY: 0.0013,
    INCLINATION: 0.345,
    LAN: 0.0,
    MEAN_ANOMALY_EPOCH: 0.0
  },
  IAPETUS: {
    RADIUS: 734.5,
    ORBIT_SEMI_MAJOR: 3560820.0,
    ORBIT_PERIOD: 79.321,
    ORBIT_ECCENTRICITY: 0.0286,
    ECCENTRICITY: 0.0286,
    INCLINATION: 15.47,
    LAN: 140.0,
    MEAN_ANOMALY_EPOCH: 0.0
  },
  TITAN: {
    RADIUS: 2574.7,              // Radio volumétrico
    ORBIT_SEMI_MAJOR: 1221870.0, // Distancia orbital (~1.2 millones de km)
    ORBIT_PERIOD: 15.945,        // Días terrestres para una órbita completa
    ORBIT_ECCENTRICITY: 0.0288,
    ECCENTRICITY: 0.0288,
    INCLINATION: 0.34854,
    LAN: 0.0,
    MEAN_ANOMALY_EPOCH: 0.0
  },
  SATURN: {
    RADIUS_EQUATORIAL: 60268.0, 
    RADIUS_POLAR: 54364.0,
    RING_INNER_EDGE: 74500.0, // Inicio del Anillo C
    RING_OUTER_EDGE: 136775.0, // Borde exterior del Anillo F
    F_RING_RADIUS: 140180.0,
    F_RING_WIDTH: 500.0,
    E_RING_INNER: 181000.0,
    E_RING_OUTER: 483000.0,
    SUN_DISTANCE_KM: 1433530000.0,
    ORBIT_ECCENTRICITY: 0.0565
  }
  
};

/**
 * Calcula el factor de achatamiento (oblateness) de un cuerpo celeste.
 * Fórmula: f = (a - b) / a  (donde a = radio ecuatorial, b = radio polar)
 */
export function calculateOblateness(radiusEq, radiusPolar) {
  if (radiusEq <= 0) throw new Error("El radio ecuatorial debe ser mayor a cero.");
  return (radiusEq - radiusPolar) / radiusEq;
}

/**
 * Retorna el multiplicador de escala exacto entre la Tierra y Saturno.
 * Compara los radios ecuatoriales.
 */
export function getEarthToSaturnRatio() {
  return CONSTANTS.SATURN.RADIUS_EQUATORIAL / CONSTANTS.EARTH.RADIUS_EQUATORIAL;
}

/**
 * Escala una medida astronómica (en km) a unidades del mundo de WebGL (Three.js).
 * @param {number} actualKm - La medida real en kilómetros.
 * @param {number} scaleFactor - Cuántos kilómetros representa 1 unidad de WebGL.
 */
export function toWebGLUnits(actualKm, scaleFactor = 10000) {
  return actualKm / scaleFactor;
}

const SECONDS_PER_DAY = 86400.0;

/**
 * Calcula la velocidad orbital circular media (en km/s) a partir del semieje mayor (km)
 * y el período orbital (días terrestres).
 * Fórmula: v = (2 * PI * a) / (T * 86400)
 */
export function calculateOrbitalVelocity(semiMajorAxisKm, orbitPeriodDays) {
  if (semiMajorAxisKm <= 0 || orbitPeriodDays <= 0) {
    throw new Error("El semieje mayor y el período orbital deben ser mayores a cero.");
  }
  return (2 * Math.PI * semiMajorAxisKm) / (orbitPeriodDays * SECONDS_PER_DAY);
}

export const ASTRONOMICAL_UNIT_KM = 149597870.7;

/**
 * Convierte una distancia en kilómetros a Unidades Astronómicas (AU).
 */
export function kmToAU(distanceKm) {
  if (distanceKm < 0) {
    throw new Error("La distancia en kilómetros no puede ser negativa.");
  }
  return distanceKm / ASTRONOMICAL_UNIT_KM;
}

/**
 * Calcula las distancias de apoápsis y periápsis (en km) para una órbita elíptica.
 * Fórmulas: r_a = a * (1 + e), r_p = a * (1 - e)
 */
export function calculateApsides(semiMajorAxisKm, eccentricity) {
  if (semiMajorAxisKm <= 0) {
    throw new Error("El semieje mayor debe ser mayor a cero.");
  }
  if (eccentricity < 0 || eccentricity >= 1) {
    throw new Error("La excentricidad debe estar en el rango [0, 1).");
  }
  return {
    apoapsisKm: semiMajorAxisKm * (1 + eccentricity),
    periapsisKm: semiMajorAxisKm * (1 - eccentricity)
  };
}