import { describe, it, expect } from 'vitest';
import { isPointInRingShadow, isPointInPlanetShadow } from '../src/math/RingOptics';
import { CONSTANTS } from '../src/math/AstroScale';

describe('RingOptics - Intersecciones de Sombras', () => {
  const lightDirTop = { x: 0, y: 1, z: 0 }; // Luz cenital
  const lightDirSide = { x: 1, y: 0, z: 0 }; // Luz lateral (equinoccio)
  
  it('debería detectar sombra de anillos en el planeta si la luz baja desde arriba', () => {
    // Un punto justo debajo del anillo C
    const pointOnPlanet = { x: 80000, y: -10000, z: 0 };
    
    const inShadow = isPointInRingShadow(
      pointOnPlanet, 
      lightDirTop, 
      CONSTANTS.SATURN.RING_INNER_EDGE, 
      CONSTANTS.SATURN.RING_OUTER_EDGE
    );
    
    expect(inShadow).toBe(true);
  });

  it('no debería detectar sombra si el punto apunta al "hueco" (Cassini Division o interior)', () => {
    // Un punto muy cerca del origen, debajo del hueco interior de los anillos
    const pointOnPlanet = { x: 30000, y: -10000, z: 0 };
    
    const inShadow = isPointInRingShadow(
      pointOnPlanet, 
      lightDirTop, 
      CONSTANTS.SATURN.RING_INNER_EDGE, 
      CONSTANTS.SATURN.RING_OUTER_EDGE
    );
    
    expect(inShadow).toBe(false); // La luz pasa por el hueco
  });

  it('debería detectar la sombra del esferoide oblato sobre los anillos', () => {
    // Un punto en los anillos en el lado "oscuro" (X negativo)
    const pointOnRing = { x: -80000, y: 0, z: 0 };
    
    // Si la luz viene desde X positivo (lado derecho), el planeta debe bloquearla
    const inShadow = isPointInPlanetShadow(
      pointOnRing, 
      lightDirSide, 
      CONSTANTS.SATURN.RADIUS_EQUATORIAL, 
      CONSTANTS.SATURN.RADIUS_POLAR
    );
    
    expect(inShadow).toBe(true);
  });
});