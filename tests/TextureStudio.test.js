import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import {
  buildTexturePrompt,
  validateTextureRequest
} from '../src/core/TexturePromptCatalog.js';
import { TextureStudioController } from '../src/core/TextureStudioController.js';
import { createGenerateTextureHandler, GEMINI_IMAGE_MODEL } from '../server/textureHandler.ts';

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
  return res;
}

describe('TexturePromptCatalog', () => {
  it('validates targets, resolutions, and truncates custom prompts', () => {
    const valid = validateTextureRequest({
      targetId: 'titan',
      resolution: '4k',
      customPrompt: '  methane seas and golden dunes  '
    });
    expect(valid.valid).toBe(true);
    expect(valid.normalized).toEqual({
      targetId: 'titan',
      resolution: '4K',
      customPrompt: 'methane seas and golden dunes'
    });

    const invalidTarget = validateTextureRequest({ targetId: 'pluto', resolution: '2K' });
    expect(invalidTarget.valid).toBe(false);

    const invalidRes = validateTextureRequest({ targetId: 'rings', resolution: '8K' });
    expect(invalidRes.valid).toBe(false);
  });

  it('builds 4:1 vertical-strip prompt for Saturn rings and 16:9 equirectangular prompt for moons', () => {
    const rings = buildTexturePrompt('rings', 'extra Cassini gap sharpness');
    expect(rings.aspectRatio).toBe('4:1');
    expect(rings.prompt).toContain('vertical bands');
    expect(rings.prompt).toContain('extra Cassini gap sharpness');

    const enceladus = buildTexturePrompt('enceladus');
    expect(enceladus.aspectRatio).toBe('16:9');
    expect(enceladus.prompt).toContain('equirectangular');
    expect(enceladus.prompt).toContain('Enceladus');
  });
});

describe('createGenerateTextureHandler', () => {
  it('calls gemini-nano-banana-2.1 with imageConfig and extracts inlineData from candidate parts', async () => {
    const generateContent = vi.fn().mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              { text: 'Generated ring map.' },
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: 'AQIDBA=='
                }
              }
            ]
          }
        }
      ]
    });

    const handler = createGenerateTextureHandler({
      getApiKey: () => 'test-key',
      createClient: () => ({ models: { generateContent } })
    });

    const res = createMockRes();
    await handler(
      { body: { targetId: 'rings', resolution: '4K', customPrompt: 'vivid Cassini ringlets' } },
      res
    );

    expect(generateContent).toHaveBeenCalledTimes(1);
    const callArg = generateContent.mock.calls[0][0];
    expect(callArg.model).toBe(GEMINI_IMAGE_MODEL);
    expect(callArg.config).toEqual({
      imageConfig: {
        aspectRatio: '4:1',
        imageSize: '4K'
      }
    });
    expect(callArg.config.responseMimeType).toBeUndefined();
    expect(res.statusCode).toBe(200);
    expect(res.body.dataUrl).toBe('data:image/png;base64,AQIDBA==');
    expect(res.body.resolution).toBe('4K');
    expect(res.body.targetId).toBe('rings');
  });

  it('returns 503 when server API key is missing and 400 on invalid input', async () => {
    const handler = createGenerateTextureHandler({
      getApiKey: () => ''
    });

    const badRes = createMockRes();
    await handler({ body: { targetId: 'invalid', resolution: '2K' } }, badRes);
    expect(badRes.statusCode).toBe(400);

    const noKeyRes = createMockRes();
    await handler({ body: { targetId: 'titan', resolution: '2K' } }, noKeyRes);
    expect(noKeyRes.statusCode).toBe(503);
  });

  it('retries transient 429 errors and succeeds on subsequent attempt', async () => {
    const rateLimitErr = Object.assign(new Error('429 RESOURCE_EXHAUSTED'), { status: 429 });
    const generateContent = vi
      .fn()
      .mockRejectedValueOnce(rateLimitErr)
      .mockResolvedValueOnce({
        candidates: [
          {
            content: {
              parts: [{ inlineData: { mimeType: 'image/jpeg', data: '/9j/AA==' } }]
            }
          }
        ]
      });

    const handler = createGenerateTextureHandler({
      getApiKey: () => 'test-key',
      createClient: () => ({ models: { generateContent } }),
      maxRetries: 1,
      retryDelayMs: 1
    });

    const res = createMockRes();
    await handler({ body: { targetId: 'enceladus', resolution: '2K' } }, res);

    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(res.statusCode).toBe(200);
    expect(res.body.dataUrl).toBe('data:image/jpeg;base64,/9j/AA==');
  });
});

describe('TextureStudioController', () => {
  function createFakeSceneBindings() {
    const baselineRingTex = { name: 'baselineRing', dispose: vi.fn() };
    const baselineTitanTex = { name: 'baselineTitan', dispose: vi.fn() };
    const baselineEnceladusTex = { name: 'baselineEnceladus', dispose: vi.fn() };

    const saturnSim = {
      ringsMesh: {
        material: {
          uniforms: {
            uRingTexture: { value: baselineRingTex }
          }
        }
      }
    };

    const titanSim = {
      mesh: {
        material: {
          uniforms: {
            tColor: { value: baselineTitanTex },
            uBaseColor: { value: new THREE.Vector3(0.18, 0.085, 0.025) }
          }
        }
      }
    };

    const enceladusSim = {
      mesh: {
        material: {
          uniforms: {
            tColor: { value: baselineEnceladusTex },
            uBaseColor: { value: new THREE.Vector3(1.0, 1.0, 1.0) }
          }
        }
      }
    };

    return {
      baselineRingTex,
      baselineTitanTex,
      baselineEnceladusTex,
      saturnSim,
      moonsById: { titan: titanSim, enceladus: enceladusSim }
    };
  }

  it('hot-swaps ring texture, disposes older generated textures, and preserves baseline on reset', async () => {
    const { baselineRingTex, saturnSim, moonsById } = createFakeSceneBindings();
    const tex1 = { id: 'gen-ring-1', dispose: vi.fn() };
    const tex2 = { id: 'gen-ring-2', dispose: vi.fn() };
    let callIdx = 0;

    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        targetId: 'rings',
        resolution: '4K',
        mimeType: 'image/png',
        dataUrl: `data:image/png;base64,RING_${callIdx}`
      })
    });

    const controller = new TextureStudioController({
      saturnSim,
      moonsById,
      fetchImpl,
      createTextureFromUrl: async () => (callIdx++ === 0 ? tex1 : tex2)
    });

    await controller.generateAndApply({ targetId: 'rings', resolution: '4K' });
    expect(saturnSim.ringsMesh.material.uniforms.uRingTexture.value).toBe(tex1);
    expect(controller.hasOverride('rings')).toBe(true);

    await controller.generateAndApply({ targetId: 'rings', resolution: '4K' });
    expect(saturnSim.ringsMesh.material.uniforms.uRingTexture.value).toBe(tex2);
    expect(tex1.dispose).toHaveBeenCalledTimes(1);
    expect(baselineRingTex.dispose).not.toHaveBeenCalled();

    const resetResult = controller.resetTarget('rings');
    expect(resetResult).toBe(true);
    expect(saturnSim.ringsMesh.material.uniforms.uRingTexture.value).toBe(baselineRingTex);
    expect(tex2.dispose).toHaveBeenCalledTimes(1);
    expect(baselineRingTex.dispose).not.toHaveBeenCalled();
    expect(controller.hasOverride('rings')).toBe(false);
  });

  it('sets Titan uBaseColor to white when custom albedo is applied and restores original tint on reset', async () => {
    const { baselineTitanTex, saturnSim, moonsById } = createFakeSceneBindings();
    const genTitanTex = { id: 'gen-titan-1', dispose: vi.fn() };

    const controller = new TextureStudioController({
      saturnSim,
      moonsById,
      fetchImpl: vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          targetId: 'titan',
          resolution: '2K',
          mimeType: 'image/png',
          dataUrl: 'data:image/png;base64,TITAN'
        })
      }),
      createTextureFromUrl: async () => genTitanTex
    });

    await controller.generateAndApply({ targetId: 'titan', resolution: '2K' });
    expect(moonsById.titan.mesh.material.uniforms.tColor.value).toBe(genTitanTex);
    expect(moonsById.titan.mesh.material.uniforms.uBaseColor.value.toArray()).toEqual([1, 1, 1]);

    controller.resetTarget('titan');
    expect(moonsById.titan.mesh.material.uniforms.tColor.value).toBe(baselineTitanTex);
    expect(moonsById.titan.mesh.material.uniforms.uBaseColor.value.x).toBeCloseTo(0.18, 6);
    expect(moonsById.titan.mesh.material.uniforms.uBaseColor.value.y).toBeCloseTo(0.085, 6);
    expect(moonsById.titan.mesh.material.uniforms.uBaseColor.value.z).toBeCloseTo(0.025, 6);
    expect(genTitanTex.dispose).toHaveBeenCalledTimes(1);
  });

  it('throws descriptive error when API responds with failure status', async () => {
    const { saturnSim, moonsById } = createFakeSceneBindings();
    const controller = new TextureStudioController({
      saturnSim,
      moonsById,
      fetchImpl: vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Rate limit exceeded' })
      })
    });

    await expect(
      controller.generateAndApply({ targetId: 'enceladus', resolution: '2K' })
    ).rejects.toThrow('Rate limit exceeded');
    expect(controller.hasOverride('enceladus')).toBe(false);
  });
});
