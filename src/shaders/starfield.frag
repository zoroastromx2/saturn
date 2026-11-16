uniform sampler2D tGalacticMap;
uniform sampler2D tGalacticDustMap;
uniform float uExposure;
uniform float uFovScale;

varying vec3 vLocalDirection;

const float PI = 3.141592653589793;

float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec3 hash33(vec3 p3) {
  p3 = fract(p3 * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yxz + 33.33);
  return fract((p3.xxy + p3.yxx) * p3.zyx);
}

vec3 spectralTint(float seed) {
  if (seed < 0.08) {
    return normalize(vec3(0.65, 0.80, 1.35));
  }
  if (seed < 0.58) {
    return normalize(vec3(1.0, 1.0, 1.05));
  }
  return normalize(vec3(1.30, 0.78, 0.48));
}

vec3 starLayer(vec3 direction, float scale, float presence, float baseRadius, float gain) {
  vec3 point = direction * scale;
  vec3 cell = floor(point);
  float pixelSize = max(fwidth(point.x), max(fwidth(point.y), fwidth(point.z)));
  float radius = max(baseRadius, pixelSize * 1.15) * mix(0.75, 1.0, clamp(uFovScale, 0.0, 1.0));
  vec3 accumulated = vec3(0.0);

  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      for (int z = -1; z <= 1; z++) {
        vec3 currentCell = cell + vec3(float(x), float(y), float(z));
        float chance = hash13(currentCell + vec3(11.7, 3.1, 7.9));
        if (chance > presence) continue;

        vec3 offset = hash33(currentCell + vec3(2.3, 9.1, 4.7));
        vec3 starPosition = currentCell + offset;
        float distanceToStar = length(point - starPosition);
        float core = 1.0 - smoothstep(0.0, radius, distanceToStar);
        core *= core;

        if (core <= 0.0001) continue;

        float magnitude = hash13(currentCell + vec3(23.1, 6.7, 15.3));
        float spectralSeed = hash13(currentCell + vec3(31.7, 2.9, 19.1));
        float brightest = step(0.995, magnitude);
        float intensity = mix(
          0.025 + 0.16 * pow(magnitude, 4.0),
          1.8,
          brightest
        );

        accumulated += spectralTint(spectralSeed) * core * intensity * gain;
      }
    }
  }

  return accumulated;
}

void main() {
  vec3 direction = normalize(vLocalDirection);
  float u = atan(direction.z, direction.x) / (2.0 * PI) + 0.5;
  float v = asin(clamp(direction.y, -1.0, 1.0)) / PI + 0.5;
  vec2 uv = vec2(u, v);
  float narrow = 1.0 - smoothstep(0.18, 0.80, uFovScale);

  vec3 galactic = texture2D(tGalacticMap, uv).rgb;
  vec3 galacticDust = texture2D(tGalacticDustMap, uv).rgb;
  galactic = mix(galactic, galacticDust, narrow);
  vec3 dust = pow(max(galactic, vec3(0.0)), vec3(1.35)) * 0.45 * uExposure;
  dust = min(dust, vec3(0.78));

  vec3 stars = starLayer(direction, 350.0, 0.008, 0.014, 1.0);
  stars += starLayer(direction, 780.0, 0.006, 0.008, 0.35);
  if (narrow > 0.01) {
    stars += starLayer(direction, 1400.0, 0.016 * narrow, 0.005, 0.80) * narrow;
  }

  gl_FragColor = vec4(dust + stars * uExposure, 1.0);
}
