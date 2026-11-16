import * as THREE from 'three';
import starfieldVert from '../shaders/starfield.vert';
import starfieldFrag from '../shaders/starfield.frag';

function createBlackTexture() {
  const texture = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat);
  texture.colorSpace = THREE.LinearSRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createDustMap(sourceTexture, maxAnisotropy) {
  if (
    typeof document === 'undefined' ||
    !sourceTexture?.image ||
    !sourceTexture.image.width ||
    !sourceTexture.image.height
  ) {
    return sourceTexture;
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    context.drawImage(sourceTexture.image, 0, 0, canvas.width, canvas.height);

    const dustMap = new THREE.CanvasTexture(canvas);
    dustMap.colorSpace = THREE.LinearSRGBColorSpace;
    dustMap.mapping = THREE.EquirectangularReflectionMapping;
    dustMap.minFilter = THREE.LinearFilter;
    dustMap.magFilter = THREE.LinearFilter;
    dustMap.anisotropy = Math.max(1, maxAnisotropy);
    dustMap.wrapS = THREE.RepeatWrapping;
    dustMap.wrapT = THREE.ClampToEdgeWrapping;
    dustMap.needsUpdate = true;
    return dustMap;
  } catch {
    return sourceTexture;
  }
}

export class StarfieldSimulator {
  constructor(scene, galacticMap = null, maxAnisotropy = 1) {
    this.scene = scene;
    this.map = galacticMap || createBlackTexture();
    this.map.colorSpace = THREE.LinearSRGBColorSpace;
    this.map.mapping = THREE.EquirectangularReflectionMapping;
    this.map.minFilter = THREE.LinearFilter;
    this.map.magFilter = THREE.LinearFilter;
    this.map.anisotropy = Math.max(1, maxAnisotropy);
    this.map.wrapS = THREE.RepeatWrapping;
    this.map.wrapT = THREE.ClampToEdgeWrapping;
    this.map.needsUpdate = true;
    this.dustMap = createDustMap(this.map, maxAnisotropy);

    this.uniforms = {
      tGalacticMap: { value: this.map },
      tGalacticDustMap: { value: this.dustMap },
      uExposure: { value: 1.0 },
      uFovScale: { value: 1.0 }
    };

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: starfieldVert,
      fragmentShader: starfieldFrag,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
      fog: false
    });

    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), material);
    this.mesh.name = 'CelestialBackground';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1000;

    this.galacticTiltEuler = new THREE.Euler(
      THREE.MathUtils.degToRad(62.87),
      THREE.MathUtils.degToRad(282.85),
      THREE.MathUtils.degToRad(-26.73),
      'YXZ'
    );
    this.mesh.rotation.copy(this.galacticTiltEuler);

    this.exposure = 1.0;
    this.lastUpdateTime = null;
    this.tempForward = new THREE.Vector3();
    this.tempSunDirection = new THREE.Vector3();

    this.scene.add(this.mesh);
  }

  update(camera, sunDirection, solarVisibility = 1) {
    if (!camera || !sunDirection) return;

    this.mesh.position.copy(camera.position);
    this.mesh.scale.setScalar(camera.far * 0.9);
    this.uniforms.uFovScale.value = camera.fov / 50.0;

    this.tempForward.set(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    this.tempSunDirection.copy(sunDirection).normalize();
    const visibility = THREE.MathUtils.clamp(Number(solarVisibility) || 0, 0, 1);
    const solarGlare = Math.max(0, this.tempForward.dot(this.tempSunDirection)) * visibility;
    const targetExposure = 1.15 - 0.9 * solarGlare;

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const delta =
      this.lastUpdateTime === null
        ? 0
        : Math.min(0.1, Math.max(0, (now - this.lastUpdateTime) / 1000));
    this.lastUpdateTime = now;
    const smoothing = Math.max(0.05, 1 - Math.exp(-delta * 2.8));

    this.exposure = THREE.MathUtils.lerp(this.exposure, targetExposure, smoothing);
    this.uniforms.uExposure.value = this.exposure;
  }
}
