// src/shaders/plume.frag

uniform vec3 uColor;
uniform float uTime;

varying float vLifetime;

void main() {
    float d = distance(gl_PointCoord, vec2(0.5));
    float alpha = 1.0 - smoothstep(0.1, 0.5, d);
    float fade = smoothstep(0.0, 0.35, vLifetime);
    float shimmer = 0.92 + 0.08 * sin(uTime * 7.0 + gl_PointCoord.y * 19.0);

    gl_FragColor = vec4(uColor * shimmer, alpha * fade * 0.16);
}
