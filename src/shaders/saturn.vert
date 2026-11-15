// src/shaders/saturn.vert

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;

// Estos uniforms vienen de SaturnSimulator.js (los valores escalados de AstroScale)
uniform float uEqRadius;
uniform float uPolRadius;

void main() {
    vUv = uv;

    // 1. Obtener la posición del vértice en espacio del modelo
    vec3 pos = position;

    // 2. Calcular la Normal del Esferoide Oblato Matemáticamente
    // La ecuación de un elipsoide centrado en el origen es: (x^2 + z^2)/a^2 + y^2/b^2 = 1
    // La normal superficial (gradiente) es la derivada parcial: (2x/a^2, 2y/b^2, 2z/a^2)
    // Descartamos el multiplicador '2' porque vamos a normalizar el vector de todos modos.
    
    vec3 oblatenessGradient = vec3(
        pos.x / (uEqRadius * uEqRadius),
        pos.y / (uPolRadius * uPolRadius),
        pos.z / (uEqRadius * uEqRadius)
    );

    // 3. Transformar la normal matemática al espacio del mundo
    // uSunDirection y vWorldPosition viven en espacio de mundo, así que la
    // normal debe usar la misma base para que el Lambert sea correcto.
    vNormal = normalize(mat3(modelMatrix) * oblatenessGradient);

    // 4. Posición global para el ray-tracing de sombras en el fragment shader
    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPos.xyz;

    // 5. Proyección estándar de WebGL a pantalla
    gl_Position = projectionMatrix * viewMatrix * worldPos;
}