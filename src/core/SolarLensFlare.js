import * as THREE from 'three';

const FLARE_DEPTH = 10;
const SUN_ANGULAR_RADIUS = THREE.MathUtils.degToRad(3.2 / 60 / 2);
const RING_SAMPLE_COUNT = 4096;

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(edge0, edge1, value) {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function createDataTexture(width, height, generator) {
  const data = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = ((x + 0.5) / width) * 2 - 1;
      const ny = ((y + 0.5) / height) * 2 - 1;
      const color = generator(nx, ny);
      const index = (y * width + x) * 4;
      data[index] = color[0];
      data[index + 1] = color[1];
      data[index + 2] = color[2];
      data[index + 3] = color[3];
    }
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function createCoreTexture() {
  return createDataTexture(512, 512, (nx, ny) => {
    const radius = Math.hypot(nx, ny);
    const angle = Math.atan2(ny, nx);
    const core = Math.exp(-radius * radius * 70);
    const halo = Math.exp(-radius * radius * 9) * 0.45;
    let spikes = 0;

    for (let i = 0; i < 8; i++) {
      let delta = Math.abs(angle - (i * Math.PI) / 4);
      delta = Math.min(delta, Math.PI * 2 - delta);
      spikes += Math.exp(-delta * delta * 110) * Math.exp(-radius * 1.8) * (i % 2 === 0 ? 1 : 0.55);
    }

    const intensity = clamp01(core + halo + spikes * 0.7);
    const white = clamp01(core * 3);

    return [
      255,
      Math.round(205 + 45 * white),
      Math.round(110 + 130 * white),
      Math.round(intensity * 255)
    ];
  });
}

function createStreakTexture() {
  return createDataTexture(512, 64, (nx, ny) => {
    const taper = Math.exp(-Math.pow(Math.abs(nx) / 0.85, 6));
    const thin = Math.exp(-Math.pow(ny / 0.12, 2));
    const core = Math.exp(-Math.pow(nx / 0.25, 2)) * Math.exp(-Math.pow(ny / 0.05, 2));
    const intensity = clamp01(taper * thin * 0.5 + core * 0.7);

    return [
      Math.round(110 + 100 * core),
      Math.round(200 + 55 * core),
      255,
      Math.round(intensity * 255)
    ];
  });
}

function createGhostTexture() {
  return createDataTexture(256, 256, (nx, ny) => {
    const radius = Math.hypot(nx, ny);
    const angle = Math.atan2(ny, nx);
    const ring1 = Math.exp(-Math.pow((radius - 0.48) / 0.025, 2));
    const ring2 = Math.exp(-Math.pow((radius - 0.72) / 0.02, 2)) * 0.7;
    const hexagon = 0.85 + 0.15 * Math.cos(angle * 6);
    const intensity = clamp01((ring1 + ring2) * hexagon);

    return [255, 255, 255, Math.round(intensity * 210)];
  });
}

export class SolarLensFlare {
  constructor(scene, saturnSimulator, camera, ringAlphaTexture = null) {
    this.scene = scene;
    this.saturnSimulator = saturnSimulator;
    this.camera = camera;
    this.eqRadius = saturnSimulator.eqRadius;
    this.polRadius = saturnSimulator.polRadius ?? saturnSimulator.eqRadius;
    this.ringInner = saturnSimulator.ringInner;
    this.ringOuter = saturnSimulator.ringOuter;
    this.ringData = this.buildRingProfile(ringAlphaTexture);
    this.moonPositions = saturnSimulator.moonShadowPositions || [];
    this.moonRadii = saturnSimulator.moonShadowRadii || new Float32Array(0);

    this.limbFlareBoost = 1;
    this.lastVisibility = 0;
    this.tempSun = new THREE.Vector3();
    this.tempForward = new THREE.Vector3();
    this.tempRight = new THREE.Vector3();
    this.tempUp = new THREE.Vector3();
    this.tempSunPoint = new THREE.Vector3();
    this.tempProjected = new THREE.Vector3();
    this.tempPosition = new THREE.Vector3();
    this.tempColor = new THREE.Color();
    this.coreColor = new THREE.Color(1.0, 0.92, 0.74);
    this.limbColor = new THREE.Color(1.35, 0.62, 0.16);
    this.ccdColor = new THREE.Color(0.92, 0.98, 1.0);
    this.streakColor = new THREE.Color(0.55, 0.9, 1.2);
    this.ghostColors = [
      new THREE.Color(0.45, 0.82, 1.0),
      new THREE.Color(1.0, 0.7, 0.32),
      new THREE.Color(0.62, 0.55, 1.0),
      new THREE.Color(0.8, 0.96, 1.0)
    ];

    this.group = new THREE.Group();
    this.group.name = 'SolarLensFlare';
    this.group.visible = false;
    this.scene.add(this.group);

    this.coreTexture = createCoreTexture();
    this.streakTexture = createStreakTexture();
    this.ghostTexture = createGhostTexture();
    this.coreSprite = this.createSprite(this.coreTexture, 0xffffff, 100);
    this.streakSprite = this.createSprite(this.streakTexture, 0x9fe8ff, 99);
    this.ghosts = [0.65, 0.35, -0.25, -0.55].map((factor, index) => {
      const sprite = this.createSprite(this.ghostTexture, this.ghostColors[index], 98 - index);
      return {
        sprite,
        factor,
        scaleFactor: [0.07, 0.1, 0.14, 0.2][index],
        opacity: [0.16, 0.12, 0.09, 0.06][index]
      };
    });
  }

  buildRingProfile(ringAlphaTexture) {
    const profile = {
      samples: new Float32Array(RING_SAMPLE_COUNT),
      inner: this.ringInner,
      outer: this.ringOuter
    };

    if (!ringAlphaTexture?.image || typeof document === 'undefined') {
      return profile;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = RING_SAMPLE_COUNT;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(ringAlphaTexture.image, 0, 0, RING_SAMPLE_COUNT, 1);
      const pixels = ctx.getImageData(0, 0, RING_SAMPLE_COUNT, 1).data;

      for (let i = 0; i < RING_SAMPLE_COUNT; i++) {
        const density = pixels[i * 4 + 3] / 255;
        profile.samples[i] = 1 - Math.exp(-density * 2.2);
      }
    } catch {
      profile.samples.fill(0);
    }

    return profile;
  }

  createSprite(texture, color, renderOrder) {
    const material = new THREE.SpriteMaterial({
      map: texture,
      color,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      toneMapped: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.renderOrder = renderOrder;
    sprite.frustumCulled = false;
    this.group.add(sprite);
    return sprite;
  }

  computeSolarVisibility(
    cameraPos,
    sunDir,
    moonsBuffer = this.moonPositions,
    ringTextureData = this.ringData
  ) {
    this.limbFlareBoost = 1;
    this.lastVisibility = 0;

    if (!this.camera || !cameraPos || !sunDir) return 0;

    const sun = this.tempSun.copy(sunDir).normalize();
    this.camera.getWorldDirection(this.tempForward);

    if (this.tempForward.dot(sun) <= 0) return 0;

    const ox = cameraPos.x / this.eqRadius;
    const oy = cameraPos.y / this.polRadius;
    const oz = cameraPos.z / this.eqRadius;
    const dx = sun.x / this.eqRadius;
    const dy = sun.y / this.polRadius;
    const dz = sun.z / this.eqRadius;
    const saturnDenominator = dx * dx + dy * dy + dz * dz;
    let visibility = 1;

    if (saturnDenominator > 1e-8) {
      const closestT = -(ox * dx + oy * dy + oz * dz) / saturnDenominator;
      if (closestT > 0) {
        const cx = ox + dx * closestT;
        const cy = oy + dy * closestT;
        const cz = oz + dz * closestT;
        const saturnDistance = Math.sqrt(cx * cx + cy * cy + cz * cz);

        if (saturnDistance < 0.995) return 0;

        if (saturnDistance <= 1.035) {
          const contact = smoothstep(0.995, 1.003, saturnDistance);
          const limbFade = 1 - smoothstep(1.015, 1.035, saturnDistance);
          this.limbFlareBoost = 1 + 1.2 * contact * limbFade;
        }
      }
    }

    const moons = moonsBuffer || [];

    for (let i = 0; i < moons.length; i++) {
      const entry = moons[i];
      const position = entry?.isVector3 ? entry : entry?.position;
      const radius = entry?.radius ?? this.moonRadii[i] ?? 0;

      if (!position || radius <= 0) continue;

      const nx = position.x - cameraPos.x;
      const ny = position.y - cameraPos.y;
      const nz = position.z - cameraPos.z;
      const t = nx * sun.x + ny * sun.y + nz * sun.z;
      if (t <= 0) continue;

      const closestSquared = Math.max(0, nx * nx + ny * ny + nz * nz - t * t);
      const closest = Math.sqrt(closestSquared);
      const penumbra = Math.max(1e-6, t * SUN_ANGULAR_RADIUS);
      visibility *= smoothstep(radius - penumbra, radius + penumbra, closest);

      if (visibility <= 0.0001) return 0;
    }

    const samples =
      ringTextureData?.samples ??
      (ringTextureData instanceof Float32Array ? ringTextureData : null);
    const ringInner = ringTextureData?.inner ?? this.ringInner;
    const ringOuter = ringTextureData?.outer ?? this.ringOuter;

    if (samples?.length && Math.abs(sun.y) > 1e-5) {
      const ringT = -cameraPos.y / sun.y;
      if (ringT > 0) {
        const rx = cameraPos.x + sun.x * ringT;
        const rz = cameraPos.z + sun.z * ringT;
        const radialDistance = Math.hypot(rx, rz);
        const u = (radialDistance - ringInner) / (ringOuter - ringInner);

        if (u >= 0 && u <= 1) {
          const index = u * (samples.length - 1);
          const i0 = Math.floor(index);
          const i1 = Math.min(samples.length - 1, i0 + 1);
          const fraction = samples.length > 1 ? index - i0 : 0;
          const opacity = samples[i0] * (1 - fraction) + samples[i1] * fraction;
          visibility *= 1 - opacity;
        }
      }
    }

    this.lastVisibility = clamp01(visibility);
    return this.lastVisibility;
  }

  setScreenPosition(sprite, ndcX, ndcY, right, up, forward, cameraPos, halfWidth, halfHeight) {
    this.tempPosition
      .copy(cameraPos)
      .addScaledVector(right, ndcX * halfWidth)
      .addScaledVector(up, ndcY * halfHeight)
      .addScaledVector(forward, FLARE_DEPTH);
    sprite.position.copy(this.tempPosition);
  }

  update(camera, sunDirection, moonsBuffer = this.moonPositions, options = {}) {
    if (!camera || !sunDirection) {
      this.group.visible = false;
      return;
    }

    this.camera = camera;
    camera.updateMatrixWorld(true);
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

    const sun = this.tempSun.copy(sunDirection).normalize();
    const visibility = this.computeSolarVisibility(
      camera.position,
      sun,
      moonsBuffer,
      this.ringData
    );

    if (visibility <= 0.0005) {
      this.group.visible = false;
      return;
    }

    this.tempSunPoint.copy(camera.position).addScaledVector(sun, 10000);
    this.tempProjected.copy(this.tempSunPoint).project(camera);
    const ndcX = this.tempProjected.x;
    const ndcY = this.tempProjected.y;

    if (
      this.tempProjected.z < -1 ||
      this.tempProjected.z > 1 ||
      Math.abs(ndcX) > 1.3 ||
      Math.abs(ndcY) > 1.3
    ) {
      this.group.visible = false;
      return;
    }

    const edge = Math.max(Math.abs(ndcX), Math.abs(ndcY));
    const edgeFade = 1 - smoothstep(0.9, 1.25, edge);
    const effectiveVisibility = visibility * edgeFade;

    if (effectiveVisibility <= 0.0005) {
      this.group.visible = false;
      return;
    }

    this.group.visible = true;
    this.tempRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    this.tempUp.setFromMatrixColumn(camera.matrixWorld, 1).normalize();
    this.tempForward.setFromMatrixColumn(camera.matrixWorld, 2).multiplyScalar(-1).normalize();

    const halfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * FLARE_DEPTH;
    const halfWidth = halfHeight * camera.aspect;
    const instrumentLocked = Boolean(options.instrumentLocked);
    const warm = clamp01((this.limbFlareBoost - 1) / 1.2);
    const overallScale = instrumentLocked ? 0.62 : 1;

    const coreScale = halfHeight * (instrumentLocked ? 0.09 : 0.14) * (1 + 0.2 * warm);
    this.setScreenPosition(
      this.coreSprite,
      ndcX,
      ndcY,
      this.tempRight,
      this.tempUp,
      this.tempForward,
      camera.position,
      halfWidth,
      halfHeight
    );
    this.coreSprite.scale.set(coreScale, coreScale, 1);
    this.coreSprite.material.opacity = Math.min(
      1,
      effectiveVisibility * (instrumentLocked ? 0.55 : 0.95) * (1 + 0.35 * warm)
    );

    this.tempColor.copy(this.coreColor).lerp(this.limbColor, warm);
    if (instrumentLocked) {
      this.tempColor.lerp(this.ccdColor, 0.65);
    }
    this.tempColor.multiplyScalar(1 + (instrumentLocked ? 0.15 : 0.55) * warm);
    this.coreSprite.material.color.copy(this.tempColor);

    const streakWidth = halfWidth * (instrumentLocked ? 0.35 : 0.8);
    const streakHeight = halfHeight * (instrumentLocked ? 0.01 : 0.02);
    this.setScreenPosition(
      this.streakSprite,
      ndcX,
      ndcY,
      this.tempRight,
      this.tempUp,
      this.tempForward,
      camera.position,
      halfWidth,
      halfHeight
    );
    this.streakSprite.scale.set(streakWidth, streakHeight, 1);
    this.streakSprite.material.opacity = effectiveVisibility * (instrumentLocked ? 0.28 : 0.5);
    this.streakSprite.material.color.copy(this.streakColor);

    this.ghosts.forEach((ghost) => {
      this.setScreenPosition(
        ghost.sprite,
        ndcX * ghost.factor,
        ndcY * ghost.factor,
        this.tempRight,
        this.tempUp,
        this.tempForward,
        camera.position,
        halfWidth,
        halfHeight
      );

      const ghostScale = halfHeight * ghost.scaleFactor * overallScale;
      ghost.sprite.scale.set(ghostScale, ghostScale, 1);
      ghost.sprite.material.opacity =
        effectiveVisibility * ghost.opacity * (instrumentLocked ? 0.35 : 1);
    });

    this.lastVisibility = visibility;
  }
}
