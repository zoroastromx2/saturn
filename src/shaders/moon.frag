uniform vec3 uSunDirection;
uniform vec3 uSaturnPosition;
uniform float uSaturnEqRadius;
uniform float uSaturnPolRadius;
uniform sampler2D tColor;
uniform sampler2D tNormal;
uniform sampler2D tAo;
uniform float uAoIntensity;
uniform vec3 uBaseColor;
uniform float uAtmosphereStrength;
uniform float uRimPower;

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec2 vUv;

const float PI = 3.141592653589793;

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

vec3 perturbNormal(vec3 geometricNormal, vec3 encodedNormal) {
    vec3 N = normalize(geometricNormal);
    vec3 mapN = encodedNormal * 2.0 - 1.0;

    vec3 dp1 = dFdx(vWorldPosition);
    vec3 dp2 = dFdy(vWorldPosition);
    vec2 duv1 = dFdx(vUv);
    vec2 duv2 = dFdy(vUv);

    vec3 dp2perp = cross(dp2, N);
    vec3 dp1perp = cross(N, dp1);
    vec3 T = dp2perp * duv1.x + dp1perp * duv2.x;
    vec3 B = dp2perp * duv1.y + dp1perp * duv2.y;

    float invmax = inversesqrt(max(max(dot(T, T), dot(B, B)), 1e-8));
    mat3 tbn = mat3(T * invmax, B * invmax, N);
    return normalize(tbn * mapN);
}

void main() {
    float ao = texture2D(tAo, vUv).r;
    ao = mix(1.0, ao, uAoIntensity);

    vec3 sunDir = normalize(uSunDirection);
    vec3 normal = perturbNormal(normalize(vNormal), texture2D(tNormal, vUv).xyz);

    float eclipseVisibility = 1.0 - saturnEclipse(vWorldPosition, sunDir);
    float sunDiffuse = max(0.0, dot(normal, sunDir)) * eclipseVisibility;

    vec3 dirToSaturn = normalize(uSaturnPosition - vWorldPosition);
    vec3 saturnToMoon = normalize(vWorldPosition - uSaturnPosition);
    float saturnIlluminationPhase = max(0.0, dot(saturnToMoon, sunDir));
    float planetshineDiffuse = max(0.0, dot(normal, dirToSaturn));
    float distToSaturn = length(uSaturnPosition - vWorldPosition);
    float attenuation = pow(uSaturnEqRadius / max(distToSaturn, 1e-4), 2.0);

    vec3 indirectLight = planetshineDiffuse
                       * saturnIlluminationPhase
                       * attenuation
                       * vec3(0.9, 0.8, 0.6)
                       * 0.55
                       * ao;
    vec3 directLight = vec3(sunDiffuse) * mix(1.0, ao, 0.5);
    vec3 totalLight = directLight + indirectLight;
    vec3 albedo = texture2D(tColor, vUv).rgb * uBaseColor;
    vec3 color = albedo * totalLight;

    if (uAtmosphereStrength > 0.0) {
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        float NdotV = clamp(dot(normal, viewDir), 0.0, 1.0);
        float fresnel = pow(1.0 - NdotV, uRimPower);
        float dayMask = smoothstep(-0.10, 0.30, dot(normal, sunDir));
        float cosSunView = dot(viewDir, -sunDir);
        float rayleighPhase = 0.75 * (1.0 + cosSunView * cosSunView);
        float g = 0.6;
        float hgPhase = (1.0 - g * g)
                      / (4.0 * PI * pow(max(1.0 + g * g - 2.0 * g * cosSunView, 1e-4), 1.5));
        float scatterPhase = 0.55 * rayleighPhase + 0.35 * hgPhase;

        vec3 hazeWarm = vec3(0.70, 0.18, 0.02);
        vec3 hazeGold = vec3(1.0, 0.45, 0.05);
        vec3 hazeTint = mix(hazeWarm, hazeGold, fresnel);

        float hazeRim = fresnel * dayMask * 1.15;
        float hazeVeil = (pow(1.0 - NdotV, 1.0) * 0.10 + 0.16) * dayMask;
        vec3 atmosphere = hazeTint * (hazeRim + hazeVeil)
                        * scatterPhase * 0.9 * eclipseVisibility * uAtmosphereStrength;

        color += atmosphere;
    }

    gl_FragColor = vec4(color, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
