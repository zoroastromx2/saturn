// src/shaders/ering.frag

uniform float uERingInnerRadius;
uniform float uERingOuterRadius;
uniform float uEnceladusOrbitRadius;
uniform float uEqRadius;
uniform float uPolRadius;
uniform vec3 uSunDirection;
uniform float uTime;

uniform vec3 uTitanPosition;
uniform float uTitanRadius;
uniform vec3 uEnceladusPosition;
uniform float uEnceladusRadius;

varying vec2 vUv;
varying vec3 vWorldPosition;

const float PI = 3.141592653589793;

// Función de fase de Henyey-Greenstein (Mie scattering).
float hgPhase(float cosTheta, float g) {
    float g2 = g * g;
    float denominator = 1.0 + g2 - 2.0 * g * cosTheta;
    return (1.0 - g2) / (4.0 * PI * pow(max(denominator, 1e-4), 1.5));
}

float planetShadow(vec3 point, vec3 sunDir) {
    float a2 = uEqRadius * uEqRadius;
    float b2 = uPolRadius * uPolRadius;

    float A = (sunDir.x * sunDir.x + sunDir.z * sunDir.z) / a2
            + (sunDir.y * sunDir.y) / b2;
    float B = 2.0 * ((point.x * sunDir.x + point.z * sunDir.z) / a2
            + (point.y * sunDir.y) / b2);
    float C = (point.x * point.x + point.z * point.z) / a2
            + (point.y * point.y) / b2 - 1.0;

    float discriminant = B * B - 4.0 * A * C;
    if (discriminant < 0.0) return 0.0;

    float t = (-B - sqrt(discriminant)) / (2.0 * A);
    return t > 0.0 ? 1.0 : 0.0;
}

float moonShadow(vec3 point, vec3 sunDir, vec3 moonPosition, float moonRadius) {
    vec3 oc = point - moonPosition;
    float b = dot(oc, sunDir);
    float c = dot(oc, oc) - (moonRadius * moonRadius);
    float h = b * b - c;

    if (h <= 0.0 || b >= 0.0) return 1.0;

    float distanceToMoon = length(oc);
    float penumbraSoftness = max(distanceToMoon * 0.001, 1e-4);
    float shadowEdge = sqrt(h);
    return 1.0 - smoothstep(0.0, penumbraSoftness, shadowEdge);
}

void main() {
    float radius = length(vWorldPosition.xz);

    if (radius < uERingInnerRadius || radius > uERingOuterRadius) {
        discard;
    }

    float angle = atan(vWorldPosition.z, vWorldPosition.x);
    float angularVelocity = 2.4 / pow(max(radius, 0.001), 1.5);
    float animatedAngle = angle - uTime * angularVelocity;

    // Brillo volumétrico centrado en la órbita de Encélado (fuente criovolcánica).
    float eRingWidth = max(uERingOuterRadius - uERingInnerRadius, 1e-4);
    float coreOffset = (radius - uEnceladusOrbitRadius) / (eRingWidth * 0.18);
    float haloOffset = (radius - uEnceladusOrbitRadius) / (eRingWidth * 0.42);
    float eRingCore = exp(-coreOffset * coreOffset);
    float eRingHalo = exp(-haloOffset * haloOffset);
    float eRingDensity = 0.55 * eRingCore + 0.45 * eRingHalo;

    float eRingNoise = 0.94 + 0.06 * sin(animatedAngle * 31.0 + radius * 1.7);
    float eRingFade = smoothstep(uERingInnerRadius, uERingInnerRadius + eRingWidth * 0.06, radius)
                    * (1.0 - smoothstep(uERingOuterRadius - eRingWidth * 0.06, uERingOuterRadius, radius));
    eRingDensity *= eRingNoise * eRingFade;

    if (eRingDensity < 0.001) {
        discard;
    }

    vec3 sunDir = normalize(uSunDirection);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float cosTheta = dot(viewDir, -sunDir);
    float phase = hgPhase(cosTheta, 0.8);

    float moonShadowFactor = moonShadow(vWorldPosition, sunDir, uTitanPosition, uTitanRadius)
                           * moonShadow(vWorldPosition, sunDir, uEnceladusPosition, uEnceladusRadius);
    float moonShade = mix(0.02, 1.0, moonShadowFactor);
    float planetShade = mix(1.0, 0.02, planetShadow(vWorldPosition, sunDir));

    float illumination = (0.50 + 1.5 * phase) * planetShade * moonShade;
    vec3 glowColor = vec3(0.45, 0.65, 1.0) * illumination;
    gl_FragColor = vec4(glowColor, eRingDensity * 0.25);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
