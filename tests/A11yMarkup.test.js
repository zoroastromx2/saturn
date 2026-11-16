import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/style.css'), 'utf8');
const localization = fs.readFileSync(path.join(root, 'src/core/Localization.js'), 'utf8');

describe('A11y - marcado accesible', () => {
  it('el loader se anuncia como estado y limita el progreso', () => {
    expect(html).toMatch(/id="loader"[^>]*role="status"/);
    expect(html).toMatch(/id="loader"[^>]*aria-live="polite"/);
    expect(html).toMatch(/id="loader"[^>]*aria-atomic="true"/);
    expect(html).toContain('id="loader-progress"');
  });

  it('el canvas tiene rol, etiqueta traducible y contenido de respaldo', () => {
    expect(html).toMatch(/id="webgl-canvas"[\s\S]*?role="img"/);
    expect(html).toContain('data-i18n-aria-label="canvas.ariaLabel"');
    expect(html).toContain('Tu navegador no soporta WebGL');
  });

  it('la etiqueta del canvas existe en ambos idiomas', () => {
    const matches = localization.match(/'canvas\.ariaLabel':/g) ?? [];
    expect(matches).toHaveLength(2);
  });

  it('el CSS respeta prefers-reduced-motion', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toMatch(/transition-duration:\s*0\.01ms/);
    expect(css).toMatch(/animation-duration:\s*0\.01ms/);
  });
});
