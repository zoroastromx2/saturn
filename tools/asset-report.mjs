#!/usr/bin/env node
/**
 * tools/asset-report.mjs
 * Mide el presupuesto de activos por preset de calidad.
 *
 * Uso:
 *   node tools/asset-report.mjs                 # resumen de los tres presets
 *   node tools/asset-report.mjs --tier low      # detalle del preset
 *   node tools/asset-report.mjs --check         # falla si se exceden los objetivos
 *
 * Las dimensiones se leen de las cabeceras JPEG/PNG (sin dependencias).
 * La VRAM se estima como ancho × alto × 4 bytes × 1,33 (mipmaps).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MB = 1e6;

const TARGETS = {
  low: { initialBytes: 4 * MB, vramMb: 60 },
  medium: { initialBytes: 8 * MB, vramMb: 120 },
  high: { initialBytes: 16 * MB, vramMb: 300 }
};

/** Activos de textura: clave lógica, archivo base y fase de carga. */
const TEXTURES = [
  { key: 'saturnAlbedo', file: 'saturn_atmosphere_8k.jpg', phase: 0 },
  { key: 'ringColor', file: 'saturn_rings_color.png', phase: 0 },
  { key: 'ringAlpha', file: 'saturn_rings_alpha.png', phase: 0 },
  { key: 'starmap', file: 'milky_way_8k.jpg', phase: 0 },
  { key: 'earthAlbedo', file: 'earth_daymap_4k.jpg', phase: 0 },
  { key: 'mimasColor', file: 'mimas_color.jpg', phase: 1 },
  { key: 'mimasNormal', file: 'mimas_normal.jpg', phase: 1 },
  { key: 'mimasAo', file: 'mimas_ao.jpg', phase: 1 },
  { key: 'tethysColor', file: 'tethys_color.jpg', phase: 1 },
  { key: 'tethysNormal', file: 'tethys_normal.jpg', phase: 1 },
  { key: 'tethysAo', file: 'tethys_ao.jpg', phase: 1 },
  { key: 'dioneColor', file: 'dione_color.jpg', phase: 1 },
  { key: 'dioneNormal', file: 'dione_normal.jpg', phase: 1 },
  { key: 'dioneAo', file: 'dione_ao.jpg', phase: 1 },
  { key: 'rheaColor', file: 'rhea_color.jpg', phase: 1 },
  { key: 'rheaNormal', file: 'rhea_normal.jpg', phase: 1 },
  { key: 'rheaAo', file: 'rhea_ao.jpg', phase: 1 },
  { key: 'iapetusColor', file: 'iapetus_color.jpg', phase: 1 },
  { key: 'iapetusNormal', file: 'iapetus_normal.jpg', phase: 1 },
  { key: 'iapetusAo', file: 'iapetus_ao.jpg', phase: 1 }
];

const DEFERRED_GROUPS = [
  { dir: 'public/models', label: 'modelos GLB' },
  { dir: 'public/audio', label: 'audio' },
  { dir: 'public/data', label: 'datos' }
];

function imageSize(buffer) {
  if (buffer.length > 24 && buffer[0] === 0x89 && buffer[1] === 0x50) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      const isStartOfFrame =
        marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
      if (isStartOfFrame) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7)
        };
      }
      offset += 2 + length;
    }
  }
  return null;
}

function readManifest() {
  const file = path.join(ROOT, 'public/textures/tiers.json');
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function resolveVariant(manifest, tier, entry) {
  const variant = manifest?.tiers?.[tier]?.[entry.key];
  if (variant?.path) {
    return { relPath: variant.path, width: variant.width, height: variant.height };
  }
  return { relPath: `textures/${entry.file}`, width: null, height: null };
}

function statBytes(relPath) {
  const absolute = path.join(ROOT, 'public', relPath);
  return fs.existsSync(absolute) ? fs.statSync(absolute).size : 0;
}

function measureTexture(tier, manifest, entry) {
  const variant = resolveVariant(manifest, tier, entry);
  const absolute = path.join(ROOT, 'public', variant.relPath);
  const bytes = statBytes(variant.relPath);
  let width = variant.width;
  let height = variant.height;

  if ((!width || !height) && fs.existsSync(absolute)) {
    const size = imageSize(fs.readFileSync(absolute));
    width = size?.width ?? null;
    height = size?.height ?? null;
  }

  const vram = width && height ? width * height * 4 * 1.33 : 0;
  return { key: entry.key, phase: entry.phase, bytes, width, height, vram };
}

function measureGroup(dir) {
  const absolute = path.join(ROOT, dir);
  if (!fs.existsSync(absolute)) return 0;
  return fs
    .readdirSync(absolute, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .reduce((sum, entry) => sum + fs.statSync(path.join(absolute, entry.name)).size, 0);
}

function measureBundle() {
  const dist = path.join(ROOT, 'dist');
  if (!fs.existsSync(dist)) return 0;
  let total = fs.statSync(path.join(dist, 'index.html')).size;
  const assets = path.join(dist, 'assets');
  if (fs.existsSync(assets)) {
    for (const entry of fs.readdirSync(assets, { withFileTypes: true })) {
      if (entry.isFile() && /\.(js|css)$/.test(entry.name)) {
        total += fs.statSync(path.join(assets, entry.name)).size;
      }
    }
  }
  return total;
}

function reportTier(tier, manifest, { detail = false } = {}) {
  const textures = TEXTURES.map((entry) => measureTexture(tier, manifest, entry));
  const phase0Textures = textures.filter((texture) => texture.phase === 0);
  const phase1Textures = textures.filter((texture) => texture.phase === 1);
  const bundle = measureBundle();
  const deferredBytes =
    DEFERRED_GROUPS.reduce((sum, group) => sum + measureGroup(group.dir), 0) +
    phase1Textures.reduce((sum, texture) => sum + texture.bytes, 0);
  const initialBytes = phase0Textures.reduce((sum, texture) => sum + texture.bytes, 0) + bundle;
  const totalBytes = initialBytes + deferredBytes;
  const vramMb = textures.reduce((sum, texture) => sum + texture.vram, 0) / MB;

  if (detail) {
    console.log(`\nDetalle del preset "${tier}"`);
    for (const texture of [...phase0Textures, ...phase1Textures]) {
      console.log(
        `  fase ${texture.phase}  ${texture.key.padEnd(14)} ${String(texture.width ?? '?').padStart(5)}×${String(texture.height ?? '?').padEnd(5)} ${(texture.bytes / 1024).toFixed(0).padStart(6)} kB  ~${(texture.vram / MB).toFixed(0)} MB VRAM`
      );
    }
    console.log(`  bundle cliente: ${(bundle / MB).toFixed(2)} MB`);
    console.log(`  diferido (modelos/audio/datos): ${(deferredBytes / MB).toFixed(2)} MB`);
  }

  return { tier, initialBytes, deferredBytes, totalBytes, vramMb };
}

function main() {
  const args = process.argv.slice(2);
  const tierIndex = args.indexOf('--tier');
  const requestedTier = tierIndex >= 0 ? args[tierIndex + 1] : null;
  const check = args.includes('--check');
  const manifest = readManifest();

  if (!manifest) {
    console.warn('Aviso: public/textures/tiers.json no existe; se miden solo los archivos base.');
  }

  const tiers = requestedTier ? [requestedTier] : ['low', 'medium', 'high'];
  const results = tiers.map((tier) =>
    reportTier(tier, manifest, { detail: Boolean(requestedTier) })
  );

  console.log('');
  console.log('Preset   Inicial    Diferido    Total      VRAM   Objetivo');
  console.log('(VRAM estimada con mipmaps ×1,33; inicial incluye JS+CSS de dist/)');
  let failed = false;

  for (const result of results) {
    const target = TARGETS[result.tier];
    const overInitial = target && result.initialBytes > target.initialBytes;
    const overVram = target && result.vramMb > target.vramMb;
    const verdict = target ? (overInitial || overVram ? 'EXCEDE' : 'ok') : '—';
    failed ||= Boolean(overInitial || overVram);
    console.log(
      `${result.tier.padEnd(8)} ${(result.initialBytes / MB).toFixed(2).padStart(6)} MB ${(result.deferredBytes / MB).toFixed(2).padStart(7)} MB ${(result.totalBytes / MB).toFixed(2).padStart(7)} MB ${result.vramMb.toFixed(0).padStart(5)} MB   ${verdict}`
    );
  }

  if (check && failed) {
    console.error('\nEl presupuesto excede el objetivo en al menos un preset.');
    process.exit(1);
  }
}

main();
