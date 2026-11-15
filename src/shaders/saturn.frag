// src/shaders/saturn.frag

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;

uniform float uRingInnerRadius;
uniform float uRingOuterRadius;
uniform vec3 uSunDirection;
uniform float uTime;
uniform float uAuroraIntensity;

// Lunares que proyectan sombra sobre Saturno
uniform vec3 uTitanPosition;
uniform float uTitanRadius;
uniform vec3 uEnceladusPosition;
uniform float uEnceladusRadius;
uniform vec3 uMimasPosition;
uniform float uMimasRadius;


// Texturas cargadas por AssetFetcher
uniform sampler2D uSaturnTexture;
uniform sampler2D uRingAlphaTex; // La máscara de densidad (Cassini)

// La misma intersección rayo-esfera se reutiliza para Titán y Encélado.
// Cuanto menor es distanceToMoon, más estrecha es la penumbra.
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

float mimasShadow(vec3 point, vec3 sunDir) {
    vec3 oc = point - uMimasPosition;
    float b = dot(oc, sunDir);
    float c = dot(oc, oc) - (uMimasRadius * uMimasRadius);
    float h = b * b - c;

    if (h <= 0.0 || b >= 0.0) return 1.0;

    float distanceToMimas = length(oc);
    float penumbra = max(distanceToMimas * 0.012, 1e-4);
    float shadowEdge = sqrt(h);
    return 1.0 - smoothstep(0.0, penumbra, shadowEdge);
}

float auroraHash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float auroraNoise(vec2 p) {
    vec2 cell = floor(p);
    vec2 local = fract(p);
    vec2 smoothLocal = local * local * (3.0 - 2.0 * local);

    float a = auroraHash(cell);
    float b = auroraHash(cell + vec2(1.0, 0.0));
    float c = auroraHash(cell + vec2(0.0, 1.0));
    float d = auroraHash(cell + vec2(1.0, 1.0));

    return mix(mix(a, b, smoothLocal.x), mix(c, d, smoothLocal.x), smoothLocal.y);
}

float auroraFbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;

    for (int i = 0; i < 4; i++) {
        value += auroraNoise(p) * amplitude;
        p = p * 2.03 + vec2(1.7, 9.2);
        amplitude *= 0.5;
    }

    return value;
}

void main() {
    // 1. Color base de la atmósfera
    vec3 albedo = texture2D(uSaturnTexture, vUv).rgb;
    vec3 normal = normalize(vNormal);
    vec3 sunDir = normalize(uSunDirection);

    float moonShadowFactor = moonShadow(vWorldPosition, sunDir, uTitanPosition, uTitanRadius)
                           * moonShadow(vWorldPosition, sunDir, uEnceladusPosition, uEnceladusRadius)
                           * mimasShadow(vWorldPosition, sunDir);

    // 2. Iluminación difusa base (Lambert) usando la normal del esferoide oblato
    // La luz ambiente mínima es 0.02 para que el lado oscuro no sea negro puro
    float diffuse = max(dot(normal, sunDir), 0.0);

    // 3. MATEMÁTICA DE RING OPTICS (Rayo vs Plano Y=0)
    float shadowMultiplier = moonShadowFactor; // 1.0 = Luz plena, 0.0 = Oscuridad total

    // Evitar división por cero si el Sol está exactamente en el ecuador (equinoccio)
    if (abs(sunDir.y) > 1e-6) {
        // Lanzamos el rayo DESDE la atmósfera HACIA el Sol
        float t = -vWorldPosition.y / sunDir.y;

        // Si t > 0.0, el plano de los anillos bloquea el rayo de luz
        if (t > 0.0) {
            // Calcular el punto XZ exacto de intersección en el plano de los anillos
            vec2 hitPosXZ = vWorldPosition.xz + sunDir.xz * t;
            
            // Distancia radial desde el centro de Saturno
            float hitDistance = length(hitPosXZ);

            // Verificar si el impacto ocurre dentro de los límites del disco de los anillos
            if (hitDistance >= uRingInnerRadius && hitDistance <= uRingOuterRadius) {
                
                // Mapear la distancia a coordenadas UV (0.0 a 1.0) para leer la textura
                float ringUv = (hitDistance - uRingInnerRadius) / (uRingOuterRadius - uRingInnerRadius);
                
                // Muestrear la textura de densidad de Cassini (canal alfa)
                // Usamos 0.5 en Y porque la textura es una tira 1D estirada
                float ringDensity = texture2D(uRingAlphaTex, vec2(ringUv, 0.5)).a;
                
                // La sombra es inversamente proporcional a la densidad del anillo
                // Si la densidad es 1.0 (sólido), el multiplicador cae a 0.0 (sombra total)
                // Si la densidad es 0.0 (División de Cassini), la luz pasa intacta (1.0)
                shadowMultiplier *= 1.0 - ringDensity;
            }
        }
    }

    // 4. Auroras polares dinámicas
    vec3 auroraEmission = vec3(0.0);
    float polarLatitude = abs(normal.y);
    float polarMask = smoothstep(0.85, 0.92, polarLatitude)
                    * (1.0 - smoothstep(0.92, 0.98, polarLatitude));

    if (polarMask > 0.001 && uAuroraIntensity > 0.0) {
        float auroraAngle = atan(normal.x, normal.z);
        vec2 circular = vec2(cos(auroraAngle), sin(auroraAngle));
        float poleOffset = normal.y >= 0.0 ? 0.0 : 13.7;
        vec2 drift = vec2(0.0, -uTime * 0.16);

        float noiseVal = auroraFbm(circular * 5.0 + vec2(polarLatitude * 9.0, poleOffset) + drift);
        noiseVal += 0.45 * auroraFbm(
            circular * 11.0 + vec2(polarLatitude * 21.0, poleOffset * 2.0) + drift * 2.0
        );
        noiseVal /= 1.45;

        float auroraShape = smoothstep(0.42, 0.68, noiseVal) * polarMask;
        vec3 auroraColor = vec3(0.4, 0.6, 2.5);
        auroraEmission = auroraColor * auroraShape * uAuroraIntensity;
    }

    // 5. Composición final
    // Multiplicamos la contribución difusa por la sombra, preservando la luz ambiente
    vec3 finalColor = albedo * (vec3(0.02) + vec3(diffuse * shadowMultiplier)) + auroraEmission;

    gl_FragColor = vec4(finalColor, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}