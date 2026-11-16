import * as THREE from 'three';
import { OUTER_RING_BOUNDS } from '../math/AstroScale.js';
import diffuseRingsVert from '../shaders/diffuse_rings.vert';
import diffuseRingsFrag from '../shaders/diffuse_rings.frag';

export class DiffuseRingsSimulator {
  constructor(scene, saturnSimulator) {
    this.scene = scene;
    this.saturnSimulator = saturnSimulator;
    this.eqRadius = saturnSimulator.eqRadius;
    this.polRadius = saturnSimulator.polRadius;
    this.eRingOuter = OUTER_RING_BOUNDS.E_RING_OUTER * this.eqRadius;

    const geometry = new THREE.CylinderGeometry(
      this.eRingOuter,
      this.eRingOuter,
      this.eRingOuter * 0.35,
      64,
      1
    );

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uSunDirection: { value: saturnSimulator.sunDirection.clone() },
        uSaturnRadius: {
          value: new THREE.Vector3(this.eqRadius, this.polRadius, this.eqRadius)
        },
        uEnceladusPosition: {
          value: new THREE.Vector3(OUTER_RING_BOUNDS.E_RING_PEAK * this.eqRadius, 0, 0)
        },
        uTime: { value: 0 },
        uGRingCenter: { value: OUTER_RING_BOUNDS.G_RING_CENTER },
        uGRingWidth: { value: OUTER_RING_BOUNDS.G_RING_WIDTH },
        uGRingSigmaH: { value: OUTER_RING_BOUNDS.G_RING_SIGMA_H },
        uERingInner: { value: OUTER_RING_BOUNDS.E_RING_INNER },
        uERingPeak: { value: OUTER_RING_BOUNDS.E_RING_PEAK },
        uERingOuter: { value: OUTER_RING_BOUNDS.E_RING_OUTER }
      },
      vertexShader: diffuseRingsVert,
      fragmentShader: diffuseRingsFrag,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });

    this.material = material;
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = 'DiffuseOuterRings';
    this.mesh.renderOrder = 2;
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  update(time, enceladusWorldPosition) {
    this.material.uniforms.uTime.value = time;
    if (enceladusWorldPosition) {
      this.material.uniforms.uEnceladusPosition.value.copy(enceladusWorldPosition);
    }
  }
}
