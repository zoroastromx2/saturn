#!/usr/bin/env python3
"""Genera las variantes de textura para los presets low/medium/high.

Requiere Pillow (``pip install Pillow``). Uso:

    python tools/generate-texture-tiers.py

Escribe:
    public/textures/{low,medium,high}/*.jpg|png
    public/textures/tiers.json           (para tools/asset-report.mjs)
    src/data/TextureTiers.js             (manifiesto que importa el cliente)

Los archivos base del preset `high` no se duplican salvo que se recorten
(Earth, Vía Láctea y el color de Mimas).
"""
from __future__ import annotations

import json
import os
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
TEXTURES = ROOT / "public" / "textures"

# key, archivo base, tope por preset, formato, calidad
# Los topes se expresan como ancho (manteniendo proporción) o (ancho, alto).
ASSETS = [
    ("saturnAlbedo", "saturn_atmosphere_8k.jpg", {"low": 1024, "medium": 2048, "high": 4096}, "jpeg", 82),
    ("ringColor", "saturn_rings_color.png", {"low": (2048, 125), "medium": (4096, 250), "high": None}, "png", None),
    ("ringAlpha", "saturn_rings_alpha.png", {"low": (2048, 125), "medium": (4096, 250), "high": None}, "png", None),
    ("starmap", "milky_way_8k.jpg", {"low": 1024, "medium": 2048, "high": 4096}, "jpeg", 82),
    ("earthAlbedo", "earth_daymap_4k.jpg", {"low": 1024, "medium": 2048, "high": 4096}, "jpeg", 82),
    ("mimasColor", "mimas_color.jpg", {"low": 1024, "medium": 2048, "high": 2048}, "jpeg", 82),
    ("mimasNormal", "mimas_normal.jpg", {"low": 512, "medium": 1024, "high": None}, "jpeg", 90),
    ("mimasAo", "mimas_ao.jpg", {"low": 512, "medium": 512, "high": None}, "jpeg", 82),
    ("tethysColor", "tethys_color.jpg", {"low": 1024, "medium": 2048, "high": None}, "jpeg", 82),
    ("tethysNormal", "tethys_normal.jpg", {"low": 512, "medium": 1024, "high": None}, "jpeg", 90),
    ("tethysAo", "tethys_ao.jpg", {"low": 512, "medium": 512, "high": None}, "jpeg", 82),
    ("dioneColor", "dione_color.jpg", {"low": 1024, "medium": 2048, "high": None}, "jpeg", 82),
    ("dioneNormal", "dione_normal.jpg", {"low": 512, "medium": 1024, "high": None}, "jpeg", 90),
    ("dioneAo", "dione_ao.jpg", {"low": 512, "medium": 512, "high": None}, "jpeg", 82),
    ("rheaColor", "rhea_color.jpg", {"low": 1024, "medium": 2048, "high": None}, "jpeg", 82),
    ("rheaNormal", "rhea_normal.jpg", {"low": 512, "medium": 1024, "high": None}, "jpeg", 90),
    ("rheaAo", "rhea_ao.jpg", {"low": 512, "medium": 512, "high": None}, "jpeg", 82),
    ("iapetusColor", "iapetus_color.jpg", {"low": 1024, "medium": 2048, "high": None}, "jpeg", 82),
    ("iapetusNormal", "iapetus_normal.jpg", {"low": 512, "medium": 1024, "high": None}, "jpeg", 90),
    ("iapetusAo", "iapetus_ao.jpg", {"low": 512, "medium": 512, "high": None}, "jpeg", 82),
]

TIERS = ("low", "medium", "high")


def target_size(image: Image.Image, cap) -> tuple[int, int]:
    if cap is None:
        return image.size
    if isinstance(cap, tuple):
        return int(cap[0]), int(cap[1])
    ratio = cap / image.width
    return int(cap), max(1, round(image.height * ratio))


def save_variant(image: Image.Image, path: Path, kind: str, quality: int | None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if kind == "png":
        image.convert("RGBA").save(path, "PNG", optimize=True)
    else:
        image.convert("RGB").save(path, "JPEG", quality=quality or 82, optimize=True, progressive=True)


def main() -> None:
    manifest = {"generatedAt": "2026-11-16", "tiers": {tier: {} for tier in TIERS}}

    for key, filename, caps, kind, quality in ASSETS:
        source_path = TEXTURES / filename
        if not source_path.exists():
            raise SystemExit(f"Falta el archivo base: {source_path}")

        with Image.open(source_path) as source:
            for tier in TIERS:
                cap = caps[tier]
                if cap is None:
                    rel_path = f"textures/{filename}"
                    width, height = source.size
                    size_bytes = source_path.stat().st_size
                else:
                    width, height = target_size(source, cap)
                    resized = source.resize((width, height), Image.LANCZOS)
                    rel_path = f"textures/{tier}/{filename}"
                    out = ROOT / "public" / rel_path
                    save_variant(resized, out, kind, quality)
                    size_bytes = out.stat().st_size
                    resized.close()

                manifest["tiers"][tier][key] = {
                    "path": rel_path,
                    "width": width,
                    "height": height,
                    "bytes": size_bytes,
                }

    (TEXTURES / "tiers.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )

    js_module = ROOT / "src" / "data" / "TextureTiers.js"
    js_module.parent.mkdir(parents=True, exist_ok=True)
    js_module.write_text(
        "// Generado por tools/generate-texture-tiers.py — no editar a mano.\n"
        f"export default {json.dumps(manifest, indent=2)};\n",
        encoding="utf-8",
    )

    for tier in TIERS:
        total = sum(entry["bytes"] for entry in manifest["tiers"][tier].values())
        print(f"{tier}: {total / 1e6:.2f} MB en {len(manifest['tiers'][tier])} activos")


if __name__ == "__main__":
    main()
