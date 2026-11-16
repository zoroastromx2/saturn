import * as THREE from 'three';

const initialWidth = typeof window !== 'undefined' ? window.innerWidth : 1;
const initialHeight = typeof window !== 'undefined' ? window.innerHeight : 1;

export const VintageOpticsShader = {
  uniforms: {
    tDiffuse: { value: null },
    uOpticsMode: { value: 0 },
    uTime: { value: 0.0 },
    uResolution: { value: new THREE.Vector2(initialWidth, initialHeight) }
  },

  vertexShader: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uOpticsMode;
    uniform float uTime;
    uniform vec2 uResolution;

    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    float drawReseau(vec2 uv) {
      vec2 grid = uv * 4.0;
      vec2 nearest = floor(grid + 0.5);
      vec2 deltaPixels = abs(grid - nearest) * uResolution / 4.0;

      float horizontal = step(abs(deltaPixels.y), 0.55) * step(abs(deltaPixels.x), 2.0);
      float vertical = step(abs(deltaPixels.x), 0.55) * step(abs(deltaPixels.y), 2.0);
      float inCross = clamp(horizontal + vertical, 0.0, 1.0);

      return mix(1.0, 0.15, inCross);
    }

    float vignette(vec2 uv, float inner, float outer) {
      return 1.0 - smoothstep(inner, outer, distance(uv, vec2(0.5))) * 0.55;
    }

    void main() {
      vec4 original = texture2D(tDiffuse, vUv);

      if (uOpticsMode < 0.5) {
        gl_FragColor = original;
        return;
      }

      vec3 color = original.rgb;

      if (uOpticsMode < 1.5) {
        vec2 quantizedUv = floor(vUv * 450.0) / 450.0;
        color = texture2D(tDiffuse, quantizedUv).rgb;

        float scanline = 0.92 + 0.08 * sin(vUv.y * 600.0);
        color *= vec3(1.15, 0.92, 0.65) * scanline;
        color += hash(vUv * uResolution + uTime) * 0.08;
        color *= vignette(vUv, 0.34, 0.86);
      } else if (uOpticsMode < 2.5) {
        vec2 centered = vUv * 2.0 - 1.0;
        centered *= 1.0 + 0.025 * dot(centered, centered);
        vec2 distortedUv = centered * 0.5 + 0.5;

        vec2 radial = distortedUv - 0.5;
        vec2 aberration = radial * dot(radial, radial) * 0.009;
        float red = texture2D(tDiffuse, distortedUv + aberration).r;
        float green = texture2D(tDiffuse, distortedUv).g;
        float blue = texture2D(tDiffuse, distortedUv - aberration).b;
        color = vec3(red, green, blue);

        float luma = dot(color, vec3(0.299, 0.587, 0.114));
        color = mix(color, color * vec3(1.06, 1.0, 0.9), 0.35);
        color.b += smoothstep(0.52, 1.0, luma) * 0.07;
        color.g += smoothstep(0.68, 1.0, luma) * 0.035;
        color *= drawReseau(vUv);
        color += (hash(vUv * uResolution + uTime) - 0.5) * 0.04;
        color *= vignette(vUv, 0.3, 0.82);
      } else {
        float luma = dot(color, vec3(0.299, 0.587, 0.114));
        color = mix(color, vec3(luma), 0.75);
        color = smoothstep(vec3(0.05), vec3(0.95), color);
        color *= vignette(vUv, 0.26, 0.78);
        color += (hash(vUv * uResolution + uTime) - 0.5) * 0.02;
      }

      gl_FragColor = vec4(max(color, 0.0), original.a);
    }
  `
};

export default VintageOpticsShader;
