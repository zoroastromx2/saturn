import * as THREE from 'three';

const FAR_PLANE_FRACTION = 0.95;
const ANGULAR_RADIUS = 0.002;

export class SunSimulator {
  constructor() {
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const sunColor = new THREE.Color().setRGB(15.0, 14.5, 13.5);
    const material = new THREE.MeshBasicMaterial({
      color: sunColor,
      toneMapped: false
    });
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        gl_Position.z = min(gl_Position.z, gl_Position.w * 0.9999);`
      );
    };

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = 'Sun';
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.tempSunPosition = new THREE.Vector3();
  }

  update(camera, sunDirection) {
    if (!camera || !sunDirection) return;

    const distance = camera.far * FAR_PLANE_FRACTION;
    this.tempSunPosition.copy(sunDirection).multiplyScalar(distance).add(camera.position);

    this.mesh.position.copy(this.tempSunPosition);
    const sunRadius = distance * ANGULAR_RADIUS;
    this.mesh.scale.setScalar(sunRadius);
    this.mesh.visible = true;
  }
}
