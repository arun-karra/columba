#!/usr/bin/env python3
"""Regenerate icon.png (native) and logo.png (in-app) from icon-source.png.

iOS push notifications use the native app icon — after updating assets, rebuild
with `pnpm mac:sim` (see AGENTS.md).
"""
from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image
import numpy as np

IMAGES = Path(__file__).resolve().parent.parent / "assets" / "images"
BRAND = (160, 194, 229)  # #A0C2E5


def load_source() -> Image.Image:
    for name in ("icon-source.png", "icon.png"):
        path = IMAGES / name
        if path.exists():
            return Image.open(path).convert("RGB")
    raise SystemExit(f"No source icon in {IMAGES}")


def main() -> None:
    src = load_source()
    arr = np.array(src, dtype=np.int16)
    h, w = arr.shape[:2]
    max_c = arr.max(axis=2)
    min_c = arr.min(axis=2)
    neutral_bright = ((max_c - min_c) < 12) & (max_c > 190)

    def flood(mask: np.ndarray) -> np.ndarray:
        visited = np.zeros_like(mask, dtype=bool)
        q: deque[tuple[int, int]] = deque()
        for x in range(w):
            for y in (0, h - 1):
                if mask[y, x]:
                    visited[y, x] = True
                    q.append((y, x))
        for y in range(h):
            for x in (0, w - 1):
                if mask[y, x] and not visited[y, x]:
                    visited[y, x] = True
                    q.append((y, x))
        while q:
            y, x = q.popleft()
            for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not visited[ny, nx]:
                    visited[ny, nx] = True
                    q.append((ny, nx))
        return visited

    edge_bg = flood(neutral_bright)
    opaque = ~edge_bg

    def component_from(sy: int, sx: int, mask: np.ndarray) -> np.ndarray:
        comp = np.zeros_like(mask, dtype=bool)
        if not mask[sy, sx]:
            return comp
        q: deque[tuple[int, int]] = deque([(sy, sx)])
        comp[sy, sx] = True
        while q:
            y, x = q.popleft()
            for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not comp[ny, nx]:
                    comp[ny, nx] = True
                    q.append((ny, nx))
        return comp

    logo_mask = component_from(h // 2, w // 2, opaque)
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[:, :, :3] = arr.astype(np.uint8)
    rgba[:, :, 3] = np.where(logo_mask, 255, 0).astype(np.uint8)
    logo_img = Image.fromarray(rgba, "RGBA")

    native = Image.new("RGB", (w, h), BRAND)
    native.paste(logo_img, (0, 0), logo_img)
    native.save(IMAGES / "icon.png", optimize=True)

    alpha = rgba[:, :, 3]
    ys, xs = np.where(alpha > 0)
    pad = 8
    x0, x1 = max(0, xs.min() - pad), min(w - 1, xs.max() + pad)
    y0, y1 = max(0, ys.min() - pad), min(h - 1, ys.max() + pad)
    logo_img.crop((x0, y0, x1 + 1, y1 + 1)).save(IMAGES / "logo.png", optimize=True)
    print(f"Wrote {IMAGES / 'icon.png'} and {IMAGES / 'logo.png'}")


if __name__ == "__main__":
    main()
