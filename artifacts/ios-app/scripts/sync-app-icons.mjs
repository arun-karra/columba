#!/usr/bin/env node
/**
 * Regenerates icon.png (native) and logo.png (in-app) from icon-source.png.
 * Requires pngjs (installed with pnpm install).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMAGES = join(__dirname, '../assets/images');
const BRAND = { r: 160, g: 194, b: 229 };

function loadSource() {
  for (const name of ['icon-source.png', 'icon.png']) {
    const path = join(IMAGES, name);
    if (existsSync(path)) {
      return { path, png: PNG.sync.read(readFileSync(path)) };
    }
  }
  throw new Error(`No source icon in ${IMAGES}`);
}

function isNeutralBright(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max - min < 12 && max > 190;
}

function floodEdgeBackground(width, height, isBg) {
  const visited = new Uint8Array(width * height);
  const queue = [];

  const push = (x, y) => {
    const i = y * width + x;
    if (visited[i] || !isBg(i)) return;
    visited[i] = 1;
    queue.push(i);
  };

  for (let x = 0; x < width; x += 1) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    push(0, y);
    push(width - 1, y);
  }

  while (queue.length) {
    const i = queue.pop();
    const x = i % width;
    const y = (i - x) / width;
    if (x > 0) push(x - 1, y);
    if (x < width - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < height - 1) push(x, y + 1);
  }

  return visited;
}

function componentFromCenter(width, height, opaque) {
  const comp = new Uint8Array(width * height);
  const start = ((height / 2) | 0) * width + ((width / 2) | 0);
  if (!opaque[start]) return comp;

  const queue = [start];
  comp[start] = 1;

  while (queue.length) {
    const i = queue.pop();
    const x = i % width;
    const y = (i - x) / width;
    const neighbors = [];
    if (x > 0) neighbors.push(i - 1);
    if (x < width - 1) neighbors.push(i + 1);
    if (y > 0) neighbors.push(i - width);
    if (y < height - 1) neighbors.push(i + width);

    for (const n of neighbors) {
      if (!comp[n] && opaque[n]) {
        comp[n] = 1;
        queue.push(n);
      }
    }
  }

  return comp;
}

function bounds(comp, width, height) {
  let x0 = width;
  let y0 = height;
  let x1 = 0;
  let y1 = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!comp[y * width + x]) continue;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  }

  return { x0, y0, x1, y1 };
}

function main() {
  const { path: sourcePath, png } = loadSource();
  const { width, height, data } = png;

  const isBg = (i) => {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    return isNeutralBright(r, g, b);
  };

  const edgeBg = floodEdgeBackground(width, height, isBg);
  const opaque = new Uint8Array(width * height);

  for (let i = 0; i < width * height; i += 1) {
    if (!edgeBg[i]) opaque[i] = 1;
  }

  const logo = componentFromCenter(width, height, opaque);
  const { x0, y0, x1, y1 } = bounds(logo, width, height);
  const pad = 8;
  const cx0 = Math.max(0, x0 - pad);
  const cy0 = Math.max(0, y0 - pad);
  const cx1 = Math.min(width - 1, x1 + pad);
  const cy1 = Math.min(height - 1, y1 + pad);
  const cw = cx1 - cx0 + 1;
  const ch = cy1 - cy0 + 1;

  const native = new PNG({ width, height });
  const cropped = new PNG({ width: cw, height: ch });

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      const di = i * 4;
      if (logo[i]) {
        native.data[di] = data[di];
        native.data[di + 1] = data[di + 1];
        native.data[di + 2] = data[di + 2];
        native.data[di + 3] = 255;
      } else {
        native.data[di] = BRAND.r;
        native.data[di + 1] = BRAND.g;
        native.data[di + 2] = BRAND.b;
        native.data[di + 3] = 255;
      }
    }
  }

  for (let y = 0; y < ch; y += 1) {
    for (let x = 0; x < cw; x += 1) {
      const sx = cx0 + x;
      const sy = cy0 + y;
      const si = (sy * width + sx) * 4;
      const di = (y * cw + x) * 4;
      if (logo[sy * width + sx]) {
        cropped.data[di] = data[si];
        cropped.data[di + 1] = data[si + 1];
        cropped.data[di + 2] = data[si + 2];
        cropped.data[di + 3] = 255;
      } else {
        cropped.data[di] = 0;
        cropped.data[di + 1] = 0;
        cropped.data[di + 2] = 0;
        cropped.data[di + 3] = 0;
      }
    }
  }

  writeFileSync(join(IMAGES, 'icon.png'), PNG.sync.write(native));
  writeFileSync(join(IMAGES, 'logo.png'), PNG.sync.write(cropped));
  console.log(`Synced icons from ${sourcePath}`);
}

main();
