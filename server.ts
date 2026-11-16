import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createGenerateTextureHandler } from './server/textureHandler.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/textures/generate', createGenerateTextureHandler());

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        open: false
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  return app;
}

const isMainModule =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isMainModule) {
  const port = Number(process.env.PORT) || 3000;
  const app = await createApp();
  app.listen(port, '0.0.0.0', () => {
    console.log(`Saturn Simulator server listening on http://0.0.0.0:${port}`);
  });
}
