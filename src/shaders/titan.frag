// src/shaders/titan.frag

uniform vec3 uSunDirection;
uniform float uSaturnEqRadius;
uniform float uSaturnPolRadius;
uniform float uRimPower;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;

const float PI = 3.141592653589793;

// Eclipse: rayo desde Titán hacia el Sol contra el esferoide de Saturno.
float saturnEclipse(vec3 point, vec3 sunDir) {
    float a2 = uSaturnEqRadius * uSaturnEqRadius;
    float b2 = uSaturnPolRadius * uSaturnPolRadius;

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

void main() {
    vec3 normal = normalize(vNormal);
    vec3 sunDir = normalize(uSunDirection);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);

    float NdotV = clamp(dot(normal, viewDir), 0.0, 1.0);
    float NdotL = max(dot(normal, sunDir), 0.0);

    // Si Saturno tapa el Sol, Titán y su atmósfera deben quedar a oscuras.
    float visibility = 1.0 - saturnEclipse(vWorldPosition, sunDir);

    // Fresnel / rim: el camino óptico es más largo cerca del limbo.
    float fresnel = pow(1.0 - NdotV, uRimPower);

    // Máscara diurna: el limbo nocturno no dispersa luz solar.
    float dayMask = smoothstep(-0.10, 0.30, dot(normal, sunDir));

    // Fase de Rayleigh y aproximación de Mie/Henyey-Greenstein para la bruma.
    float cosSunView = dot(viewDir, -sunDir);
    float rayleighPhase = 0.75 * (1.0 + cosSunView * cosSunView);
    float g = 0.6;
    float hgPhase = (1.0 - g * g)
                  / (4.0 * PI * pow(max(1.0 + g * g - 2.0 * g * cosSunView, 1e-4), 1.5));
    float scatterPhase = 0.55 * rayleighPhase + 0.35 * hgPhase;

    // Superficie oculta bajo la densa atmósfera.
    vec3 surfaceAlbedo = vec3(0.18, 0.085, 0.025);
    vec3 surface = surfaceAlbedo * (0.01 + 0.9 * NdotL * visibility);

    // Bruma fotoquímica: naranja cálido en el centro, oro saturado en el limbo.
    vec3 hazeWarm = vec3(0.70, 0.18, 0.02);
    vec3 hazeGold = vec3(1.0, 0.45, 0.05);
    vec3 hazeTint = mix(hazeWarm, hazeGold, fresnel);

    float hazeRim = fresnel * dayMask * 1.15;
    float hazeVeil = (pow(1.0 - NdotV, 1.0) * 0.10 + 0.16) * dayMask;
    vec3 atmosphere = hazeTint * (hazeRim + hazeVeil) * scatterPhase * 0.9 * visibility;

    vec3 finalColor = surface + atmosphere;
    gl_FragColor = vec4(finalColor, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
