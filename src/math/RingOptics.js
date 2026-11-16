/**
 * RingOptics.js
 * Matemáticas de intersección para simular sombras volumétricas perfectas (ray-tracing).
 * Asumimos que Saturno está en el origen (0,0,0) y los anillos yacen en el plano XZ (Y=0).
 */

/**
 * Calcula si un punto en la superficie del planeta está cubierto por la sombra de los anillos.
 * Lanza un rayo desde el punto en el planeta hacia la fuente de luz y verifica si
 * perfora el plano de los anillos dentro de los límites interno y externo.
 *
 * @param {Object} point - Coordenadas {x, y, z} del punto en la atmósfera.
 * @param {Object} lightDir - Vector normalizado {x, y, z} apuntando hacia el Sol.
 * @param {number} innerRadius - Radio interno de los anillos.
 * @param {number} outerRadius - Radio externo de los anillos.
 * @returns {boolean} True si está en la sombra, False si recibe luz directa.
 */
export function isPointInRingShadow(point, lightDir, innerRadius, outerRadius) {
  // Si el rayo es paralelo al plano de los anillos (Y=0), nunca lo cruza
  if (Math.abs(lightDir.y) < 1e-6) return false;

  // Intersección Rayo-Plano: t = -Origen.y / Direccion.y
  const t = -point.y / lightDir.y;

  // Si t es negativo, el plano de los anillos está detrás del rayo (hacia el interior del planeta)
  if (t < 0) return false;

  // Calcular el punto exacto de intersección en el plano Y=0
  const hitX = point.x + lightDir.x * t;
  const hitZ = point.z + lightDir.z * t;

  // Distancia al cuadrado desde el centro (más rápido que usar Math.sqrt)
  const distanceSq = hitX * hitX + hitZ * hitZ;

  return distanceSq >= innerRadius * innerRadius && distanceSq <= outerRadius * outerRadius;
}

/**
 * Calcula si un punto en los anillos está cubierto por la sombra del planeta.
 * Lanza un rayo desde el punto en el anillo hacia la luz y verifica si intersecta
 * el esferoide oblato (Saturno).
 */
export function isPointInPlanetShadow(point, lightDir, radiusEq, radiusPolar) {
  // Ecuación cuadrática para intersección de rayo con elipsoide centrado en el origen:
  // (x^2 + z^2)/a^2 + y^2/b^2 = 1

  const a2 = radiusEq * radiusEq;
  const b2 = radiusPolar * radiusPolar;

  // Coeficientes A, B, C de la fórmula general cuadrática
  const A =
    (lightDir.x * lightDir.x + lightDir.z * lightDir.z) / a2 + (lightDir.y * lightDir.y) / b2;
  const B =
    2.0 * ((point.x * lightDir.x + point.z * lightDir.z) / a2 + (point.y * lightDir.y) / b2);
  const C = (point.x * point.x + point.z * point.z) / a2 + (point.y * point.y) / b2 - 1.0;

  const discriminant = B * B - 4.0 * A * C;

  // Si el discriminante es negativo, el rayo falla (no hay sombra)
  if (discriminant < 0) return false;

  // Calcular t (distancia). Solo nos importa la raíz más pequeña (primer impacto)
  const t = (-B - Math.sqrt(discriminant)) / (2.0 * A);

  // Si t > 0, el planeta bloquea la luz
  return t > 0;
}
