import { describe, it, expect } from 'vitest';
import { VintageOpticsShader } from '../src/shaders/VintageOpticsShader.js';

describe('VintageOpticsShader - Emulación óptica histórica', () => {
  it('debería exponer los uniforms y modos del pase óptico', () => {
    expect(VintageOpticsShader.uniforms.tDiffuse).toBeDefined();
    expect(VintageOpticsShader.uniforms.uOpticsMode.value).toBe(0);
    expect(VintageOpticsShader.uniforms.uTime.value).toBe(0);
    expect(VintageOpticsShader.uniforms.uResolution.value).toBeDefined();
    expect(VintageOpticsShader.fragmentShader).toContain('float hash(vec2 p)');
    expect(VintageOpticsShader.fragmentShader).toContain('float drawReseau(vec2 uv)');
    expect(VintageOpticsShader.fragmentShader).toContain('if (uOpticsMode < 0.5)');
    expect(VintageOpticsShader.fragmentShader).toContain('gl_FragColor = original;');
  });
});
