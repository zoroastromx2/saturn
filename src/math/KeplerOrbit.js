const TWO_PI = Math.PI * 2;

export function solveEccentricAnomaly(meanAnomaly, eccentricity) {
  if (eccentricity < 0 || eccentricity >= 1) {
    throw new Error('La excentricidad debe estar en el rango [0, 1).');
  }

  const normalizedAnomaly = ((meanAnomaly % TWO_PI) + TWO_PI) % TWO_PI;
  let eccentricAnomaly = eccentricity < 0.8 ? normalizedAnomaly : Math.PI;

  for (let i = 0; i < 5; i++) {
    const delta = (
      eccentricAnomaly
      - eccentricity * Math.sin(eccentricAnomaly)
      - normalizedAnomaly
    ) / (1 - eccentricity * Math.cos(eccentricAnomaly));

    eccentricAnomaly -= delta;
    if (Math.abs(delta) < 1e-10) break;
  }

  return eccentricAnomaly;
}

export function calculateKeplerianPosition(elements, daysSinceJ2000) {
  const {
    semiMajorAxis,
    periodDays,
    eccentricity = 0,
    meanAnomalyEpoch = 0
  } = elements;

  if (semiMajorAxis <= 0 || periodDays <= 0) {
    throw new Error('El semieje mayor y el período orbital deben ser mayores a cero.');
  }

  const meanAnomaly = meanAnomalyEpoch + TWO_PI * (daysSinceJ2000 / periodDays);
  const eccentricAnomaly = solveEccentricAnomaly(meanAnomaly, eccentricity);
  const distance = semiMajorAxis * (1 - eccentricity * Math.cos(eccentricAnomaly));
  const trueAnomaly = 2 * Math.atan2(
    Math.sqrt(1 + eccentricity) * Math.sin(eccentricAnomaly / 2),
    Math.sqrt(1 - eccentricity) * Math.cos(eccentricAnomaly / 2)
  );

  return {
    x: Math.cos(trueAnomaly) * distance,
    z: Math.sin(trueAnomaly) * distance,
    distance,
    trueAnomaly
  };
}
