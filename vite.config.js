import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  plugins: [
    glsl({
      include: ['**/*.glsl', '**/*.wgsl', '**/*.vert', '**/*.frag', '**/*.vs', '**/*.fs'],
      exclude: undefined, // No excluir nada dentro de la carpeta shaders
      warnDuplicatedImports: true, // Advertir si el agente duplica includes de GLSL
      defaultExtension: 'glsl',
      compress: false, // Mantener false en dev para que los errores de línea coincidan
      root: '/'
    })
  ],
  server: {
    port: 3000,
    open: true,
    host: true // Expone la IP local si necesitas probarlo en el móvil
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.js']
  }
});
