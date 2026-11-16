varying vec3 vLocalDirection;

void main() {
  vLocalDirection = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
