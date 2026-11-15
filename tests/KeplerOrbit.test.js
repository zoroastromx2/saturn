import { describe, it, expect } from 'vitest';
import { CONSTANTS } from '../src/math/AstroScale';
import {
  calculateKeplerianPosition,
  sampleKeplerianOrbit,
  solveEccentricAnomaly
} from '../src/math/KeplerOrbit';

describe('KeplerOrbit - Órbitas elípticas 3D', () => {
  it('debería recorrer una órbita circular con la anomalía media correcta', () => {
    const position = calculateKeplerianPosition(
      {
        semiMajorAxis: 100,
        periodDays: 4,
        eccentricity: 0,
        meanAnomalyEpoch: 0
      },
      1
    );

    expect(position.x).toBeCloseTo(0, 10);
    expect(position.z).toBeCloseTo(100, 10);
    expect(position.distance).toBeCloseTo(100, 10);
  });

  it('debería ubicar el periastro y el apoastro a las distancias elípticas correctas', () => {
    const periastron = calculateKeplerianPosition(
      {
        semiMajorAxis: 100,
        periodDays: 10,
        eccentricity: 0.2,
        meanAnomalyEpoch: 0
      },
      0
    );
    const apoastron = calculateKeplerianPosition(
      {
        semiMajorAxis: 100,
        periodDays: 10,
        eccentricity: 0.2,
        meanAnomalyEpoch: 0
      },
      5
    );

    expect(periastron.x).toBeCloseTo(80, 8);
    expect(periastron.z).toBeCloseTo(0, 8);
    expect(apoastron.x).toBeCloseTo(-120, 8);
    expect(apoastron.z).toBeCloseTo(0, 8);
  });

  it('debería resolver la ecuación de Kepler para excentricidades altas', () => {
    const eccentricity = 0.9;
    const meanAnomaly = 2.0;
    const eccentricAnomaly = solveEccentricAnomaly(meanAnomaly, eccentricity);
    const residual = eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly;

    expect(Math.abs(residual)).toBeLessThan(1e-9);
  });

  it('debería conservar los elementos orbitales de Iapetus', () => {
    expect(CONSTANTS.IAPETUS.INCLINATION).toBe(15.47);
    expect(CONSTANTS.IAPETUS.ECCENTRICITY).toBeCloseTo(0.0286, 4);
    expect(CONSTANTS.IAPETUS.LAN).toBe(140.0);
  });

  it('debería muestrear puntos cerrados alrededor de una órbita circular y elíptica', () => {
    const circular = sampleKeplerianOrbit({ semiMajorAxis: 50, eccentricity: 0 }, 64);
    expect(circular).toHaveLength(64);
    expect(circular[0].x).toBeCloseTo(50, 8);
    expect(circular[0].z).toBeCloseTo(0, 8);
    expect(circular[16].x).toBeCloseTo(0, 8);
    expect(circular[16].z).toBeCloseTo(50, 8);

    const elliptical = sampleKeplerianOrbit({ semiMajorAxis: 100, eccentricity: 0.2 }, 64);
    expect(elliptical[0].x).toBeCloseTo(80, 8);
    expect(elliptical[0].z).toBeCloseTo(0, 8);
    expect(elliptical[32].x).toBeCloseTo(-120, 8);
    expect(elliptical[32].z).toBeCloseTo(0, 8);
  });

  it('debería validar los parámetros de muestreo orbital y respetar el mínimo de segmentos', () => {
    const minimal = sampleKeplerianOrbit({ semiMajorAxis: 10, eccentricity: 0 }, 2);
    expect(minimal).toHaveLength(8);
    expect(() => sampleKeplerianOrbit({ semiMajorAxis: 0, eccentricity: 0 })).toThrow();
    expect(() => sampleKeplerianOrbit({ semiMajorAxis: 10, eccentricity: 1 })).toThrow();
  });
});
