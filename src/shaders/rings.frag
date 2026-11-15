// src/shaders/rings.frag

uniform sampler2D uRingTexture;
uniform sampler2D uRingAlphaTex;
uniform float uInnerRadius;
uniform float uOuterRadius;
uniform float uERingInnerRadius;
uniform float uERingOuterRadius;
uniform float uEnceladusOrbitRadius;
uniform vec3 uEnceladusPosition;
uniform float uERingThickness;
uniform float uEqRadius;
uniform float uPolRadius;
uniform vec3 uSunDirection;
uniform float uTime;

uniform vec3 uMoonsPosition[6];
uniform float uMoonsRadius[6];

varying vec2 vUv;
varying vec3 vWorldPosition;

const float PI = 3.141592653589793;
const int MAX_STEPS = 25;

// Función de fase de Henyey-Greenstein (Mie scattering).
// g > 0 concentra la luz dispersada hacia delante (anillos a contraluz).
float hgPhase(float cosTheta, float g) {
    float g2 = g * g;
    float denominator = 1.0 + g2 - 2.0 * g * cosTheta;
    return (1.0 - g2) / (4.0 * PI * pow(max(denominator, 1e-4), 1.5));
}

// Distancia firmada a un toro centrado en el origen y contenido en el plano XZ.
// t.x = radio de la órbita de Encélado; t.y = grosor vertical del Anillo E.
float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
}

// Intersección rayo-elipsoide: el rayo parte del anillo hacia el Sol.
// Si la primera raíz es positiva, Saturno se interpone y tapa la luz.
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

float moonShadows(vec3 point, vec3 sunDir) {
    float factor = 1.0;

    for (int i = 0; i < 6; i++) {
        vec3 oc = point - uMoonsPosition[i];
        float b = dot(oc, sunDir);
        float c = dot(oc, oc) - (uMoonsRadius[i] * uMoonsRadius[i]);
        float h = b * b - c;

        if (h > 0.0 && b < 0.0) {
            float distanceToMoon = length(oc);
            float penumbraSoftness = max(distanceToMoon * 0.001, 1e-4);
            float shadowEdge = sqrt(h);
            factor *= 1.0 - smoothstep(0.0, penumbraSoftness, shadowEdge);

            if (factor < 0.001) break;
        }
    }

    return factor;
}

// Raymarching local del toro volumétrico del Anillo E.
// Acumula densidad óptica según la profundidad dentro del núcleo del tubo y
// la modula por la distancia inversa a la posición actual de Encélado.
vec4 raymarchERing(vec3 rayOrigin, vec3 rayDirection) {
    float tubeRadius = max(uERingThickness, 1e-3);
    vec2 torus = vec2(uEnceladusOrbitRadius, tubeRadius);
    float boundRadius = uEnceladusOrbitRadius + tubeRadius;

    // Cilindro envolvente para recortar el intervalo de marcha.
    float tStart = 0.0;
    float tEnd = 1e20;

    float a = dot(rayDirection.xz, rayDirection.xz);
    if (a > 1e-6) {
        float b = dot(rayOrigin.xz, rayDirection.xz);
        float c = dot(rayOrigin.xz, rayOrigin.xz) - boundRadius * boundRadius;
        float h = b * b - a * c;
        if (h <= 0.0) return vec4(0.0);

        float sqrtH = sqrt(h);
        tStart = max(0.0, (-b - sqrtH) / a);
        tEnd = (-b + sqrtH) / a;
    } else if (dot(rayOrigin.xz, rayOrigin.xz) > boundRadius * boundRadius) {
        return vec4(0.0);
    }

    // El toro vive dentro de la losa y ∈ [-tubeRadius, tubeRadius].
    if (abs(rayDirection.y) > 1e-4) {
        float ty0 = (-tubeRadius - rayOrigin.y) / rayDirection.y;
        float ty1 = ( tubeRadius - rayOrigin.y) / rayDirection.y;
        tStart = max(tStart, min(ty0, ty1));
        tEnd = min(tEnd, max(ty0, ty1));
    }

    if (tEnd <= tStart) return vec4(0.0);

    // Menos pasos para píxeles lejanos: el tamaño de paso crece con la distancia.
    float cameraDistance = length(vWorldPosition - rayOrigin);
    float quality = clamp(1.0 - (cameraDistance - 40.0) / 160.0, 0.35, 1.0);
    int stepCount = int(mix(8.0, float(MAX_STEPS), quality));
    float stepLength = (tEnd - tStart) / float(stepCount);

    float plumeScale = max(uEnceladusOrbitRadius * 0.45, 1e-3);
    float invPlumeScale2 = 1.0 / (plumeScale * plumeScale);

    vec4 accum = vec4(0.0);

    for (int i = 0; i < MAX_STEPS; i++) {
        if (i >= stepCount) break;

        float t = tStart + (float(i) + 0.5) * stepLength;
        vec3 p = rayOrigin + rayDirection * t;

        float d = sdTorus(p, torus);
        float core = clamp(-d / tubeRadius, 0.0, 1.0);
        core *= core;

        vec3 enceladusDelta = p - uEnceladusPosition;
        float enceladusDistance2 = dot(enceladusDelta, enceladusDelta);
        float plume = 1.0 / (1.0 + enceladusDistance2 * invPlumeScale2);

        float stepDensity = core * stepLength * (0.15 + 0.85 * plume);

        if (stepDensity > 0.0) {
            float stepAlpha = 1.0 - exp(-stepDensity * 0.55);
            vec3 stepColor = vec3(0.45, 0.65, 1.0) * (0.45 + 1.35 * plume);

            // Composición front-to-back: el color queda premultiplicado por alfa.
            float transmittance = 1.0 - accum.a;
            accum.rgb += transmittance * stepColor * stepAlpha;
            accum.a += transmittance * stepAlpha;

            if (accum.a >= 0.95) break;
        }
    }

    if (accum.a < 0.005) return vec4(0.0);

    // Se devuelve color recto para conservar el alpha compositing exterior.
    return vec4(accum.rgb / accum.a, accum.a);
}

void main() {
    float radius = length(vWorldPosition.xz);

    bool inMainRing = radius >= uInnerRadius && radius <= uOuterRadius;
    bool inERing = radius >= uERingInnerRadius && radius <= uERingOuterRadius;

    // El plano solo contiene los anillos Cassini y el volumen del Anillo E.
    if (!inMainRing && !inERing) {
        discard;
    }

    // --- ANILLOS CASSINI (PROYECCIÓN PLANA) ---
    vec4 flatRing = vec4(0.0);

    if (inMainRing) {
        float ringUv = (radius - uInnerRadius) / (uOuterRadius - uInnerRadius);
        vec2 uvCoords = vec2(clamp(ringUv, 0.0, 1.0), 0.5);

        // Rotación kepleriana diferencial: velocidad angular ∝ r^(-3/2).
        // Las frecuencias angulares son enteras para no dejar una costura en atan().
        float angle = atan(vWorldPosition.z, vWorldPosition.x);
        float angularVelocity = 2.4 / pow(max(radius, 0.001), 1.5);
        float animatedAngle = angle - uTime * angularVelocity;

        float particleNoise = 0.5
            + 0.30 * sin(animatedAngle * 97.0)
            + 0.20 * sin(animatedAngle * 173.0 + 1.3)
            + 0.08 * sin(animatedAngle * 37.0);
        float variation = mix(0.85, 1.15, particleNoise);

        vec3 ringColor = texture2D(uRingTexture, uvCoords).rgb * variation;
        float density = texture2D(uRingAlphaTex, uvCoords).a * variation;
        float alpha = 1.0 - exp(-density * 2.2);

        if (alpha >= 0.005) {
            vec3 sunDir = normalize(uSunDirection);
            vec3 viewDir = normalize(cameraPosition - vWorldPosition);
            float cosTheta = dot(viewDir, -sunDir);
            float phase = hgPhase(cosTheta, 0.8);

            float moonShadowFactor = moonShadows(vWorldPosition, sunDir);

            float illumination = 0.45 + 0.9 * phase;
            illumination *= mix(1.0, 0.02, planetShadow(vWorldPosition, sunDir));
            illumination *= mix(0.02, 1.0, moonShadowFactor);

            flatRing = vec4(ringColor * illumination, alpha);
        }
    }

    // --- ANILLO E VOLUMÉTRICO (RAYMARCHING DEL TORO) ---
    vec4 volumetricRing = vec4(0.0);

    if (inERing) {
        vec3 rayOrigin = cameraPosition;
        vec3 rayDirection = normalize(vWorldPosition - rayOrigin);

        volumetricRing = raymarchERing(rayOrigin, rayDirection);

        if (volumetricRing.a > 0.0) {
            vec3 sunDir = normalize(uSunDirection);
            vec3 viewDir = normalize(cameraPosition - vWorldPosition);
            float cosTheta = dot(viewDir, -sunDir);
            float phase = hgPhase(cosTheta, 0.8);

            float moonShadowFactor = moonShadows(vWorldPosition, sunDir);

            float illumination = (0.50 + 1.5 * phase)
                               * mix(1.0, 0.02, planetShadow(vWorldPosition, sunDir))
                               * mix(0.02, 1.0, moonShadowFactor);

            volumetricRing.rgb *= illumination;
        }
    }

    if (flatRing.a + volumetricRing.a < 0.005) {
        discard;
    }

    // Alpha compositing estándar (source-over): el volumen E sobre el disco plano.
    float composedAlpha = volumetricRing.a + flatRing.a * (1.0 - volumetricRing.a);
    vec3 composedColor = (volumetricRing.rgb * volumetricRing.a
                        + flatRing.rgb * flatRing.a * (1.0 - volumetricRing.a))
                        / max(composedAlpha, 1e-4);

    gl_FragColor = vec4(composedColor, composedAlpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
