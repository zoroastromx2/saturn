// src/shaders/rings.vert

varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
    vUv = uv;

    // Los anillos viven en el plano XZ; la posición global es la base de
    // todos los cálculos de sombra e iluminación del fragment shader.
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;

    gl_Position = projectionMatrix * viewMatrix * worldPos;
}
