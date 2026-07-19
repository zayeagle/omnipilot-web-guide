/** Compass-mark PNG icons for OmniPilot Web Guide. */
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public');
mkdirSync(outDir, { recursive: true });

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function setPx(raw, size, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const i = y * (size * 4 + 1) + 1 + x * 4;
  raw[i] = r;
  raw[i + 1] = g;
  raw[i + 2] = b;
  raw[i + 3] = a;
}

function png(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const rOuter = size * 0.42;
  const rInner = size * 0.28;
  const rDot = size * 0.08;

  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // transparent outside rounded tile
      const corner = size * 0.18;
      const inTile =
        x >= 1 &&
        y >= 1 &&
        x < size - 1 &&
        y < size - 1 &&
        !(x < corner && y < corner && (corner - x) ** 2 + (corner - y) ** 2 > corner * corner) &&
        !(x > size - 1 - corner && y < corner && (x - (size - 1 - corner)) ** 2 + (corner - y) ** 2 > corner * corner) &&
        !(x < corner && y > size - 1 - corner && (corner - x) ** 2 + (y - (size - 1 - corner)) ** 2 > corner * corner) &&
        !(x > size - 1 - corner && y > size - 1 - corner && (x - (size - 1 - corner)) ** 2 + (y - (size - 1 - corner)) ** 2 > corner * corner);

      if (!inTile) {
        setPx(raw, size, x, y, 0, 0, 0, 0);
        continue;
      }

      // forest gradient fill
      const t = (x + y) / (size * 2);
      const br = Math.round(27 + t * 20);
      const bg = Math.round(67 + t * 30);
      const bb = Math.round(50 + t * 18);
      setPx(raw, size, x, y, br, bg, bb, 255);

      // ring
      if (Math.abs(dist - rOuter) < size * 0.06) {
        setPx(raw, size, x, y, 216, 243, 220, 255);
      }
      // arc accent (open ring)
      const ang = Math.atan2(dy, dx);
      if (dist < rInner && dist > rInner - size * 0.07 && ang > -2.2 && ang < 1.0) {
        setPx(raw, size, x, y, 149, 213, 178, 255);
      }
      // needle tip (NE)
      if (dx > 0 && dy < 0 && Math.abs(dx + dy) < size * 0.08 && dist < rOuter * 0.85) {
        setPx(raw, size, x, y, 216, 243, 220, 255);
      }
      // center dot
      if (dist < rDot) {
        setPx(raw, size, x, y, 149, 213, 178, 255);
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const s of [16, 32, 48, 96, 128]) {
  writeFileSync(join(outDir, `icon-${s}.png`), png(s));
}
console.log('icons written to public/');
