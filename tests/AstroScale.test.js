import { describe, it, expect } from 'vitest';
import { CONSTANTS, calculateOblateness, getEarthToSaturnRatio, toWebGLUnits, calculateOrbitalVelocity, calculateApsides, kmToAU } from '../src/math/AstroScale';

describe('AstroScale - Cálculos Planetarios', () => {
  it('debería calcular el achatamiento (oblateness) de Saturno correctamente (~0.09796)', () => {
    const oblateness = calculateOblateness(CONSTANTS.SATURN.RADIUS_EQUATORIAL, CONSTANTS.SATURN.RADIUS_POLAR);
    // Saturno es el planeta más achatado del sistema solar (casi un 10%)
    expect(oblateness).toBeCloseTo(0.09796, 4);
  });

  it('debería confirmar que el radio ecuatorial de Saturno es aproximadamente 9.45 veces el de la Tierra', () => {
    const ratio = getEarthToSaturnRatio();
    // Validamos la tolerancia estricta del 0.1% requerida en el prompt
    const expectedRatio = 9.449; 
    const tolerance = expectedRatio * 0.001; 
    
    expect(Math.abs(ratio - expectedRatio)).toBeLessThanOrEqual(tolerance);
  });

  it('debería escalar correctamente los kilómetros a unidades de WebGL', () => {
    // Si 1 unidad WebGL = 10,000 km
    const earthWebGL = toWebGLUnits(CONSTANTS.EARTH.RADIUS_EQUATORIAL, 10000);
    expect(earthWebGL).toBeCloseTo(0.6378, 4);

    const saturnWebGL = toWebGLUnits(CONSTANTS.SATURN.RADIUS_EQUATORIAL, 10000);
    expect(saturnWebGL).toBeCloseTo(6.0268, 4);
    
    // La relación visual en 3D debe mantenerse intacta
    expect(saturnWebGL / earthWebGL).toBeCloseTo(getEarthToSaturnRatio(), 4);
  });

  it('debería lanzar un error si se calcula un achatamiento con radio ecuatorial inválido', () => {
    expect(() => calculateOblateness(0, 5000)).toThrow(/mayor a cero/);
  });

  it('debería calcular correctamente la velocidad orbital media en km/s para Titán, Encélado y Mimas', () => {
    expect(calculateOrbitalVelocity(CONSTANTS.TITAN.ORBIT_SEMI_MAJOR, CONSTANTS.TITAN.ORBIT_PERIOD)).toBeCloseTo(5.573, 2);
    expect(calculateOrbitalVelocity(CONSTANTS.ENCELADUS.ORBIT_SEMI_MAJOR, CONSTANTS.ENCELADUS.ORBIT_PERIOD)).toBeCloseTo(12.635, 2);
    expect(calculateOrbitalVelocity(CONSTANTS.MIMAS.ORBIT_SEMI_MAJOR, CONSTANTS.MIMAS.ORBIT_PERIOD)).toBeCloseTo(14.321, 2);
  });

  it('debería lanzar un error si el semieje mayor o el período orbital son inválidos', () => {
    expect(() => calculateOrbitalVelocity(0, 1.37)).toThrow(/mayores a cero/);
    expect(() => calculateOrbitalVelocity(237948, 0)).toThrow(/mayores a cero/);
  });

  it('debería convertir distancias en km a Unidades Astronómicas (AU)', () => {
    expect(kmToAU(CONSTANTS.EARTH.SUN_DISTANCE_KM)).toBeCloseTo(1.0, 4);
    expect(kmToAU(CONSTANTS.SATURN.SUN_DISTANCE_KM)).toBeCloseTo(9.5826, 4);
  });

  it('debería lanzar un error si la distancia en km para convertir a AU es negativa', () => {
    expect(() => kmToAU(-1)).toThrow(/no puede ser negativa/);
  });

  it('debería definir excentricidades orbitales elípticas válidas para todos los cuerpos', () => {
    const eccentricities = [
      CONSTANTS.SATURN.ORBIT_ECCENTRICITY,
      CONSTANTS.EARTH.ORBIT_ECCENTRICITY,
      CONSTANTS.TITAN.ORBIT_ECCENTRICITY,
      CONSTANTS.ENCELADUS.ORBIT_ECCENTRICITY,
      CONSTANTS.MIMAS.ORBIT_ECCENTRICITY
    ];

    eccentricities.forEach((e) => {
      expect(e).toBeGreaterThanOrEqual(0);
      expect(e).toBeLessThan(1);
    });
  });

  it('debería calcular correctamente las distancias de apoápsis y periápsis en km', () => {
    const titanApsides = calculateApsides(CONSTANTS.TITAN.ORBIT_SEMI_MAJOR, CONSTANTS.TITAN.ORBIT_ECCENTRICITY);
    expect(titanApsides.apoapsisKm).toBeCloseTo(1257059.856, 2);
    expect(titanApsides.periapsisKm).toBeCloseTo(1186680.144, 2);

    const enceladusApsides = calculateApsides(CONSTANTS.ENCELADUS.ORBIT_SEMI_MAJOR, CONSTANTS.ENCELADUS.ORBIT_ECCENTRICITY);
    expect(enceladusApsides.apoapsisKm).toBeCloseTo(239066.356, 2);
    expect(enceladusApsides.periapsisKm).toBeCloseTo(236829.644, 2);
  });

  it('debería lanzar un error si los parámetros de calculateApsides son inválidos', () => {
    expect(() => calculateApsides(0, 0.01)).toThrow(/mayor a cero/);
    expect(() => calculateApsides(100000, -0.1)).toThrow(/rango/);
    expect(() => calculateApsides(100000, 1.0)).toThrow(/rango/);
  });
});