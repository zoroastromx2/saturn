// src/shaders/plume.vert

uniform float uTime;
uniform float uSize;

attribute float lifetime;
attribute float maxLifetime;

varying float vLifetime;

void main() {
    vLifetime = clamp(lifetime / max(maxLifetime, 0.0001), 0.0, 1.0);

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Tamaño en unidades de mundo atenuado por perspectiva.
    float perspectiveSize = uSize * projectionMatrix[1][1] * 400.0 / max(0.001, -mvPosition.z);
    float shimmer = 0.90 + 0.10 * sin(uTime * 5.0 + position.y * 137.0);
    gl_PointSize = lifetime > 0.0 ? clamp(perspectiveSize * shimmer, 1.0, 40.0) : 0.0;
}
