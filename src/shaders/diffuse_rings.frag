uniform vec3 uSunDirection;
uniform vec3 uSaturnRadius;
uniform vec3 uEnceladusPosition;
uniform float uTime;
uniform float uGRingCenter;
uniform float uGRingWidth;
uniform float uGRingSigmaH;
uniform float uERingInner;
uniform float uERingPeak;
uniform float uERingOuter;

varying vec3 vWorldPosition;

const float PI = 3.141592653589793;
const int STEPS = 8;
const vec3 E_RING_TINT = vec3(0.72, 0.86, 1.05);
const vec3 G_RING_TINT = vec3(0.90, 0.85, 0.78);
const float E_RING_WEIGHT = 0.22;
const float G_RING_WEIGHT = 0.16;

float interleavedGradientNoise(vec2 pixel) {
  return fract(52.9829189 * fract(dot(pixel, vec2(0.06711056, 0.00583715))));
}

float intersectOblateSphere(vec3 ro, vec3 rd) {
  vec3 o = ro / uSaturnRadius;
  vec3 d = rd / uSaturnRadius;
  float a = dot(d, d);
  float b = 2.0 * dot(o, d);
  float c = dot(o, o) - 1.0;
  float discriminant = b * b - 4.0 * a * c;

  if (discriminant < 0.0) return -1.0;

  float root = sqrt(discriminant);
  float tNear = (-b - root) / (2.0 * a);
  float tFar = (-b + root) / (2.0 * a);
  if (tNear > 0.0) return tNear;
  if (tFar > 0.0) return tFar;
  return -1.0;
}

float saturnSunVisibility(vec3 point) {
  vec3 o = point / uSaturnRadius;
  vec3 d = normalize(uSunDirection / uSaturnRadius);
  float closestT = -dot(o, d);

  if (closestT <= 0.0) return 1.0;

  vec3 closestPoint = o + d * closestT;
  float closestDistance = length(closestPoint);
  return smoothstep(0.985, 1.0, closestDistance);
}

float sampleGRing(vec3 point, float radialDistance, float height, float saturnRadius) {
  float center = uGRingCenter * saturnRadius;
  float sigmaR = max(uGRingWidth * 0.5 * saturnRadius, 1e-4);
  float sigmaH = max(uGRingSigmaH * saturnRadius, 1e-4);
  float radialDelta = radialDistance - center;

  float radial = exp(-(radialDelta * radialDelta) / (2.0 * sigmaR * sigmaR));
  float vertical = exp(-(height * height) / (2.0 * sigmaH * sigmaH));
  return radial * vertical;
}

float sampleERing(vec3 point, float radialDistance, float height, float saturnRadius) {
  float inner = uERingInner * saturnRadius;
  float peak = uERingPeak * saturnRadius;
  float outer = uERingOuter * saturnRadius;
  float radialDelta = radialDistance - peak;

  float sigmaR = radialDelta < 0.0
    ? (peak - inner) * 0.55
    : (outer - peak) * 0.42;
  sigmaR = max(sigmaR, 1e-4);

  float radial = exp(-(radialDelta * radialDelta) / (2.0 * sigmaR * sigmaR));
  radial *= smoothstep(inner * 0.85, inner, radialDistance);
  radial *= 1.0 - smoothstep(outer * 0.94, outer, radialDistance);

  float flaring = clamp((radialDistance - inner) / max(outer - inner, 1e-4), 0.0, 1.0);
  float scaleHeight = mix(0.04, 0.32, flaring) * saturnRadius;
  float vertical = exp(-(height * height) / (scaleHeight * scaleHeight));
  float density = radial * vertical;

  float enceladusRadius = length(uEnceladusPosition.xz);
  float enceladusAngle = atan(uEnceladusPosition.z, uEnceladusPosition.x);
  float pointAngle = atan(point.z, point.x);
  float angleDelta = atan(sin(pointAngle - enceladusAngle), cos(pointAngle - enceladusAngle));

  float wakeAngle = exp(-pow(angleDelta + 0.22, 2.0) / (2.0 * 0.16 * 0.16));
  float wakeRadial = exp(
    -pow(radialDistance - enceladusRadius, 2.0)
    / (2.0 * pow(0.42 * saturnRadius, 2.0))
  );
  float wakeVertical = exp(
    -(point.y * point.y) / (2.0 * pow(0.22 * saturnRadius, 2.0))
  );
  float wake = clamp(wakeAngle * wakeRadial * wakeVertical, 0.0, 1.0);
  float wakePulse = 0.94 + 0.06 * sin(uTime * 0.8 + angleDelta * 6.0);

  return density * (1.0 + 1.5 * wake * wakePulse);
}

void main() {
  vec3 rayOrigin = cameraPosition;
  vec3 rayDirection = normalize(vWorldPosition - cameraPosition);
  float saturnRadius = uSaturnRadius.x;
  float outerRadius = uERingOuter * saturnRadius;
  float halfHeight = uERingOuter * 0.35 * 0.5 * saturnRadius;

  float tNear = -1e6;
  float tFar = 1e6;

  if (abs(rayDirection.y) < 1e-6) {
    if (abs(rayOrigin.y) > halfHeight) discard;
  } else {
    float t0 = (-halfHeight - rayOrigin.y) / rayDirection.y;
    float t1 = (halfHeight - rayOrigin.y) / rayDirection.y;
    if (t0 > t1) {
      float swap = t0;
      t0 = t1;
      t1 = swap;
    }
    tNear = max(tNear, t0);
    tFar = min(tFar, t1);
  }

  float cylinderA = dot(rayDirection.xz, rayDirection.xz);
  float cylinderB = 2.0 * dot(rayOrigin.xz, rayDirection.xz);
  float cylinderC = dot(rayOrigin.xz, rayOrigin.xz) - outerRadius * outerRadius;

  if (cylinderA < 1e-6) {
    if (cylinderC > 0.0) discard;
  } else {
    float cylinderDiscriminant = cylinderB * cylinderB - 4.0 * cylinderA * cylinderC;
    if (cylinderDiscriminant < 0.0) discard;

    float root = sqrt(cylinderDiscriminant);
    float t0 = (-cylinderB - root) / (2.0 * cylinderA);
    float t1 = (-cylinderB + root) / (2.0 * cylinderA);
    tNear = max(tNear, min(t0, t1));
    tFar = min(tFar, max(t0, t1));
  }

  tNear = max(tNear, 0.0);

  float planetDistance = intersectOblateSphere(rayOrigin, rayDirection);
  if (planetDistance > 0.0) {
    tFar = min(tFar, planetDistance);
  }

  if (tFar <= tNear) discard;

  float stepSize = (tFar - tNear) / float(STEPS);
  float stepSizeInSaturnRadii = stepSize / saturnRadius;
  float jitter = interleavedGradientNoise(gl_FragCoord.xy);
  float cosTheta = dot(rayDirection, normalize(uSunDirection));
  float g = 0.82;
  float g2 = g * g;
  float phaseHG = (1.0 - g2) / (
    4.0 * PI * pow(max(1.0 + g2 - 2.0 * g * cosTheta, 1e-4), 1.5)
  );
  float phase = 0.08 + phaseHG;

  vec3 accumulatedColor = vec3(0.0);

  for (int i = 0; i < STEPS; i++) {
    float t = tNear + (float(i) + jitter) * stepSize;
    vec3 point = rayOrigin + rayDirection * t;

    float radialDistance = length(point.xz);
    float height = abs(point.y);
    float densityE = sampleERing(point, radialDistance, height, saturnRadius);
    float densityG = sampleGRing(point, radialDistance, height, saturnRadius);
    float eWeight = densityE * E_RING_WEIGHT;
    float gWeight = densityG * G_RING_WEIGHT;
    float density = eWeight + gWeight;

    if (density <= 1e-5) continue;

    float sunVisibility = saturnSunVisibility(point);
    vec3 dirFromSaturn = normalize(point);
    float saturnPhase = smoothstep(-0.35, 0.6, dot(dirFromSaturn, uSunDirection));
    float bounceAtten = pow(
      uSaturnRadius.x / max(radialDistance, uSaturnRadius.x * 1.2),
      2.0
    );
    vec3 planetshineLight = vec3(0.95, 0.82, 0.58) * saturnPhase * bounceAtten * 0.45;
    vec3 sampleLight = vec3(phase * 3.5 * sunVisibility) + planetshineLight;

    vec3 ringTint = (E_RING_TINT * eWeight + G_RING_TINT * gWeight) / max(density, 1e-5);
    accumulatedColor += density * ringTint * sampleLight * stepSizeInSaturnRadii;
  }

  gl_FragColor = vec4(accumulatedColor, 1.0);
}
