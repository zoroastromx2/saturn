// src/core/FlybyPathGenerator.js
import * as THREE from 'three';

export const FLYBY_MOON_KEYS = [
  'dione',
  'rhea',
  'titan',
  'enceladus',
  'mimas',
  'tethys',
  'hyperion',
  'iapetus'
];

export const FLYBY_PROFILES = [
  {
    id: 'crescent-skim',
    titleKey: 'flyby.profile.crescentSkim',
    periapsisMultiplier: 1.65,
    approachRadiusMultiplier: 6.4,
    departureRadiusMultiplier: 6.8,
    durationSeconds: 15.0
  },
  {
    id: 'polar-grazing',
    titleKey: 'flyby.profile.polarGrazing',
    periapsisMultiplier: 1.82,
    approachRadiusMultiplier: 5.9,
    departureRadiusMultiplier: 6.4,
    durationSeconds: 16.0
  },
  {
    id: 'saturn-rise',
    titleKey: 'flyby.profile.saturnRise',
    periapsisMultiplier: 1.72,
    approachRadiusMultiplier: 5.6,
    departureRadiusMultiplier: 6.5,
    durationSeconds: 16.5
  },
  {
    id: 'equatorial-sweep',
    titleKey: 'flyby.profile.equatorialSweep',
    periapsisMultiplier: 1.6,
    approachRadiusMultiplier: 6.7,
    departureRadiusMultiplier: 6.2,
    durationSeconds: 14.5
  }
];

const DEFAULT_SAFE_RADIUS_MULTIPLIER = 1.48;
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const FALLBACK_AXIS = new THREE.Vector3(0, 0, 1);

function seededUnit(seed) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function resolveTargetRadius(targetMesh) {
  if (!targetMesh) return 1;
  const paramRadius = targetMesh.geometry?.parameters?.radius;
  if (Number.isFinite(paramRadius) && paramRadius > 0) return paramRadius;

  if (targetMesh.geometry && !targetMesh.geometry.boundingSphere) {
    targetMesh.geometry.computeBoundingSphere?.();
  }
  const sphereRadius = targetMesh.geometry?.boundingSphere?.radius;
  if (Number.isFinite(sphereRadius) && sphereRadius > 0) return sphereRadius;

  return 1;
}

function buildLocalBasis(moonPosition, sunDirection, yawJitterRad) {
  const toSaturn = moonPosition && moonPosition.lengthSq() > 1e-8
    ? moonPosition.clone().negate().normalize()
    : new THREE.Vector3(-1, 0, 0);

  const sunDir = sunDirection && sunDirection.lengthSq() > 1e-8
    ? sunDirection.clone().normalize()
    : new THREE.Vector3(1, 0.35, 0.35).normalize();

  // Base lateral axis perpendicular to the sun vector for high-contrast terminator passes.
  let up = WORLD_UP.clone();
  if (Math.abs(sunDir.dot(up)) > 0.92) {
    up.copy(FALLBACK_AXIS);
  }
  const right = new THREE.Vector3().crossVectors(up, sunDir).normalize();
  up = new THREE.Vector3().crossVectors(sunDir, right).normalize();

  // Apply gentle seeded azimuthal rotation around the up vector for path variety.
  const rotQuat = new THREE.Quaternion().setFromAxisAngle(up, yawJitterRad);
  const forward = sunDir.clone().applyQuaternion(rotQuat).normalize();
  const orthoRight = right.clone().applyQuaternion(rotQuat).normalize();

  // Project Saturn direction into local basis to frame Saturn on exit when desired.
  return { forward, right: orthoRight, up, toSaturn };
}

function buildProfileControlPoints(profile, moonRadius, basis, seed) {
  const r = moonRadius;
  const p = profile.periapsisMultiplier * r;
  const approach = profile.approachRadiusMultiplier * r;
  const depart = profile.departureRadiusMultiplier * r;
  const sign = seededUnit(seed + 3) >= 0.5 ? 1 : -1;
  const verticalBias = (seededUnit(seed + 7) - 0.5) * 0.45;
  const { forward, right, up, toSaturn } = basis;

  const makePoint = (fWeight, rWeight, uWeight, sWeight = 0) =>
    new THREE.Vector3()
      .addScaledVector(forward, fWeight)
      .addScaledVector(right, rWeight)
      .addScaledVector(up, uWeight)
      .addScaledVector(toSaturn, sWeight);

  if (profile.id === 'polar-grazing') {
    const camPts = [
      makePoint(0.25 * approach, -0.78 * approach * sign, 0.58 * approach),
      makePoint(0.55 * r * 5.2, -0.52 * r * 4.2 * sign, 0.72 * r * 4.5),
      makePoint(0.7 * p, -0.18 * p * sign, 0.85 * p),
      makePoint(0.45 * p, 0.25 * p * sign, 0.92 * p),
      makePoint(-0.1 * p, 0.68 * p * sign, 0.72 * p),
      makePoint(-0.42 * depart, 0.65 * depart * sign, -0.22 * depart, 0.35 * depart),
      makePoint(-0.62 * depart, 0.55 * depart * sign, -0.45 * depart, 0.5 * depart)
    ];
    const lookPts = [
      makePoint(0, 0, 0.1 * r),
      makePoint(0.15 * r, 0, 0.2 * r),
      makePoint(0, 0, 0.18 * r),
      makePoint(0, 0, 0),
      makePoint(0, 0, -0.1 * r)
    ];
    return { camPts, lookPts };
  }

  if (profile.id === 'saturn-rise') {
    // Approach from anti-Saturn lit side, sweep around periapsis so Saturn rises behind limb.
    const antiSaturn = toSaturn.clone().negate();
    const lateral = new THREE.Vector3().crossVectors(up, antiSaturn).normalize().multiplyScalar(sign);
    const makeSaturnPoint = (aW, lW, uW) =>
      new THREE.Vector3()
        .addScaledVector(antiSaturn, aW)
        .addScaledVector(lateral, lW)
        .addScaledVector(up, uW);

    const camPts = [
      makeSaturnPoint(0.75 * approach, -0.62 * approach, (0.28 + verticalBias) * approach),
      makeSaturnPoint(0.45 * approach, -0.45 * approach, (0.2 + verticalBias * 0.5) * approach),
      makeSaturnPoint(0.85 * p, -0.48 * p, 0.24 * p),
      makeSaturnPoint(0.95 * p, 0.28 * p, 0.12 * p),
      makeSaturnPoint(0.42 * p, 0.92 * p, -0.05 * p),
      makeSaturnPoint(-0.35 * depart, 0.85 * depart, -0.18 * depart),
      makeSaturnPoint(-0.78 * depart, 0.45 * depart, -0.22 * depart)
    ];
    const lookPts = [
      new THREE.Vector3().addScaledVector(toSaturn, 0.25 * r),
      new THREE.Vector3().addScaledVector(lateral, -0.12 * r),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3().addScaledVector(toSaturn, 0.35 * r),
      new THREE.Vector3().addScaledVector(toSaturn, 0.65 * r)
    ];
    return { camPts, lookPts };
  }

  if (profile.id === 'equatorial-sweep') {
    const camPts = [
      makePoint(0.55 * approach, -0.8 * approach * sign, 0.18 * approach),
      makePoint(0.62 * r * 4.5, -0.58 * r * 4.0 * sign, 0.12 * r * 4.0),
      makePoint(0.82 * p, -0.58 * p * sign, 0.08 * p),
      makePoint(0.98 * p, 0.12 * p * sign, -0.04 * p),
      makePoint(0.48 * p, 0.88 * p * sign, -0.1 * p),
      makePoint(-0.3 * depart, 0.82 * depart * sign, -0.14 * depart),
      makePoint(-0.68 * depart, 0.62 * depart * sign, -0.12 * depart)
    ];
    const lookPts = [
      makePoint(0.15 * r, -0.15 * r * sign, 0),
      makePoint(0.1 * r, 0, 0),
      makePoint(0, 0, 0),
      makePoint(-0.1 * r, 0.15 * r * sign, 0),
      makePoint(0, 0, 0)
    ];
    return { camPts, lookPts };
  }

  // Default: 'crescent-skim' — dramatic dive across sunlit terminator limb.
  const camPts = [
    makePoint(-0.45 * approach, -0.82 * approach * sign, (0.34 + verticalBias * 0.4) * approach),
    makePoint(0.1 * approach * 0.65, -0.68 * approach * 0.65 * sign, 0.28 * approach * 0.65),
    makePoint(0.65 * p, -0.76 * p * sign, 0.22 * p),
    makePoint(0.96 * p, 0.08 * p * sign, 0.1 * p),
    makePoint(0.55 * p, 0.84 * p * sign, -0.12 * p),
    makePoint(-0.25 * depart, 0.85 * depart * sign, -0.2 * depart),
    makePoint(-0.72 * depart, 0.56 * depart * sign, -0.25 * depart)
  ];
  const lookPts = [
    makePoint(0.2 * r, 0, 0.08 * r),
    makePoint(0.15 * r, -0.1 * r * sign, 0),
    makePoint(0, 0, 0),
    makePoint(0.1 * r, 0.12 * r * sign, 0),
    new THREE.Vector3().addScaledVector(toSaturn, 0.3 * r)
  ];
  return { camPts, lookPts };
}

function enforceMinimumClearance(controlPoints, minRadius) {
  let curve = new THREE.CatmullRomCurve3(controlPoints, false, 'centripetal', 0.5);

  // Iteratively push out control points near any sample that violates clearance.
  for (let pass = 0; pass < 3; pass++) {
    let minSampleDist = Infinity;
    const samples = 64;
    for (let i = 0; i <= samples; i++) {
      const dist = curve.getPointAt(i / samples).length();
      if (dist < minSampleDist) minSampleDist = dist;
    }

    if (minSampleDist >= minRadius) break;

    const pushScale = (minRadius * 1.04) / Math.max(minSampleDist, 1e-5);
    controlPoints.forEach((pt) => {
      const len = pt.length();
      if (len < minRadius * 2.2) {
        pt.multiplyScalar(pushScale);
      }
    });
    curve = new THREE.CatmullRomCurve3(controlPoints, false, 'centripetal', 0.5);
  }

  let measuredMinRadius = Infinity;
  const sampleCount = 72;
  const trailPoints = [];
  for (let i = 0; i <= sampleCount; i++) {
    const pt = curve.getPointAt(i / sampleCount);
    const len = pt.length();
    if (len < measuredMinRadius) measuredMinRadius = len;
    trailPoints.push(pt);
  }

  return { curve, measuredMinRadius, trailPoints };
}

export function generateFlybyPath({
  targetMesh = null,
  targetKey = 'dione',
  moonRadius: explicitRadius = null,
  moonPosition = null,
  sunDirection = null,
  profileIndex = 0,
  seed = 1,
  scaleFactor = 10000
} = {}) {
  const moonRadius =
    Number.isFinite(explicitRadius) && explicitRadius > 0
      ? explicitRadius
      : resolveTargetRadius(targetMesh);

  const normalizedProfileIndex =
    ((Math.trunc(profileIndex) % FLYBY_PROFILES.length) + FLYBY_PROFILES.length) %
    FLYBY_PROFILES.length;
  const profile = FLYBY_PROFILES[normalizedProfileIndex];

  const resolvedMoonPosition = moonPosition
    ? moonPosition.clone()
    : targetMesh?.getWorldPosition
      ? targetMesh.getWorldPosition(new THREE.Vector3())
      : new THREE.Vector3(10, 0, 0);

  const yawJitterRad = (seededUnit(seed) - 0.5) * 0.75;
  const basis = buildLocalBasis(resolvedMoonPosition, sunDirection, yawJitterRad);
  const { camPts, lookPts } = buildProfileControlPoints(profile, moonRadius, basis, seed);

  const minSafeRadius = moonRadius * DEFAULT_SAFE_RADIUS_MULTIPLIER;
  const { curve, measuredMinRadius, trailPoints } = enforceMinimumClearance(camPts, minSafeRadius);
  const lookCurve = new THREE.CatmullRomCurve3(lookPts, false, 'centripetal', 0.5);

  const periapsisAltitudeKm = Math.max(0, (measuredMinRadius - moonRadius) * scaleFactor);

  return {
    targetKey,
    profileId: profile.id,
    profileTitleKey: profile.titleKey,
    profileIndex: normalizedProfileIndex,
    seed,
    moonRadius,
    durationSeconds: profile.durationSeconds,
    curve,
    lookCurve,
    trailPoints,
    periapsisRadius: measuredMinRadius,
    periapsisAltitudeKm
  };
}
