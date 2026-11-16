import { GoogleGenAI } from '@google/genai';
import type { Request, Response } from 'express';
import {
  buildTexturePrompt,
  validateTextureRequest
} from '../src/core/TexturePromptCatalog.js';

export const GEMINI_IMAGE_MODEL = 'gemini-nano-banana-2.1';
const USER_AGENT_HEADER = 'aistudio-build';

export interface GeneratedInlineImage {
  data: string;
  mimeType: string;
}

export interface TextureHandlerOptions {
  getApiKey?: () => string | undefined;
  createClient?: (apiKey: string) => {
    models: {
      generateContent: (params: Record<string, unknown>) => Promise<unknown>;
    };
  };
  maxRetries?: number;
  retryDelayMs?: number;
}

interface CandidatePart {
  inlineData?: {
    data?: string;
    mimeType?: string;
  };
  text?: string;
}

interface GenerateContentResponseLike {
  candidates?: Array<{
    content?: {
      parts?: CandidatePart[];
    };
  }>;
}

export function extractGeneratedImage(response: unknown): {
  image: GeneratedInlineImage | null;
  textSummary: string;
} {
  const typed = response as GenerateContentResponseLike | null | undefined;
  const parts = typed?.candidates?.[0]?.content?.parts ?? [];
  let image: GeneratedInlineImage | null = null;
  const textNotes: string[] = [];

  for (const part of parts) {
    if (!image && part?.inlineData?.data) {
      image = {
        data: part.inlineData.data,
        mimeType: part.inlineData.mimeType || 'image/png'
      };
    } else if (typeof part?.text === 'string' && part.text.trim()) {
      textNotes.push(part.text.trim());
    }
  }

  return {
    image,
    textSummary: textNotes.join(' ')
  };
}

function getErrorStatus(error: unknown): number {
  const err = error as { status?: number; statusCode?: number; message?: string } | null;
  if (typeof err?.status === 'number') return err.status;
  if (typeof err?.statusCode === 'number') return err.statusCode;

  const message = String(err?.message ?? '');
  if (/429|quota|rate limit|resource_exhausted/i.test(message)) return 429;
  if (/403|permission|forbidden|api key not valid|unauthenticated/i.test(message)) return 403;
  if (/503|unavailable|timeout|overloaded/i.test(message)) return 503;
  return 500;
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 503;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createGenerateTextureHandler(options: TextureHandlerOptions = {}) {
  const getApiKey = options.getApiKey ?? (() => process.env.GEMINI_API_KEY);
  const createClient =
    options.createClient ??
    ((apiKey: string) =>
      new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': USER_AGENT_HEADER
          }
        }
      }));
  const maxRetries = options.maxRetries ?? 2;
  const retryDelayMs = options.retryDelayMs ?? 1200;

  return async function handleGenerateTexture(req: Request, res: Response): Promise<void> {
    const validation = validateTextureRequest(req.body);
    if (!validation.valid) {
      res.status(400).json({
        error: validation.errors.join(' ')
      });
      return;
    }

    const apiKey = getApiKey()?.trim();
    if (!apiKey) {
      res.status(503).json({
        error: 'Gemini API key is not configured on the server.'
      });
      return;
    }

    const { targetId, resolution, customPrompt } = validation.normalized;
    const { prompt, aspectRatio } = buildTexturePrompt(targetId, customPrompt);
    const ai = createClient(apiKey);

    let lastError: unknown = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: GEMINI_IMAGE_MODEL,
          contents: prompt,
          config: {
            imageConfig: {
              aspectRatio,
              imageSize: resolution
            }
          }
        });

        const { image, textSummary } = extractGeneratedImage(response);
        if (!image) {
          res.status(502).json({
            error: textSummary || 'Model response did not contain image data.'
          });
          return;
        }

        res.status(200).json({
          targetId,
          resolution,
          aspectRatio,
          mimeType: image.mimeType,
          dataUrl: `data:${image.mimeType};base64,${image.data}`,
          promptUsed: prompt
        });
        return;
      } catch (error) {
        lastError = error;
        const status = getErrorStatus(error);
        if (attempt < maxRetries && isRetryableStatus(status)) {
          await sleep(retryDelayMs * (attempt + 1));
          continue;
        }

        const safeStatus = status === 403 || status === 429 || status === 503 ? status : 502;
        const message =
          safeStatus === 429
            ? 'Rate limit or quota reached while generating texture. Please retry shortly.'
            : safeStatus === 403
              ? 'Server API key lacks permission for image generation.'
              : 'Failed to generate high-resolution texture.';

        console.error('Texture generation error:', error);
        res.status(safeStatus).json({ error: message });
        return;
      }
    }

    console.error('Texture generation exhausted retries:', lastError);
    res.status(502).json({ error: 'Failed to generate high-resolution texture.' });
  };
}
