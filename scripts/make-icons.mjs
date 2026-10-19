// Genera los iconos PNG de la PWA sin dependencias externas (zlib de Node).
// Dibuja el semaforo sobre un cuadrado redondeado.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../public");

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
};

function png(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const BG = hex("#0f172a");
const BODY = hex("#16213a");
const BORDER = hex("#26334f");
const RED = hex("#f87171");
const AMBER = hex("#fbbf24");
const GREEN = hex("#34d399");

function draw(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const s = size / 64; // escala desde un lienzo de 64
  const set = (x, y, [r, g, b], a = 255) => {
    const i = (y * size + x) * 4;
    // mezcla simple sobre lo que ya haya
    const inv = a / 255;
    rgba[i] = Math.round(rgba[i] * (1 - inv) + r * inv);
    rgba[i + 1] = Math.round(rgba[i + 1] * (1 - inv) + g * inv);
    rgba[i + 2] = Math.round(rgba[i + 2] * (1 - inv) + b * inv);
    rgba[i + 3] = 255;
  };
  const insideRounded = (x, y, rx0, ry0, rx1, ry1, radius) => {
    if (x < rx0 || x > rx1 || y < ry0 || y > ry1) return false;
    const cx = Math.min(Math.max(x, rx0 + radius), rx1 - radius);
    const cy = Math.min(Math.max(y, ry0 + radius), ry1 - radius);
    const dx = x - cx;
    const dy = y - cy;
    return dx * dx + dy * dy <= radius * radius + radius;
  };
  const circle = () => {
    // no-op: los círculos se dibujan abajo con mezcla alfa
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (insideRounded(x, y, 0, 0, size - 1, size - 1, 14 * s)) set(x, y, BG, 255);
      if (insideRounded(x, y, 16 * s, 6 * s, 48 * s, 58 * s, 10 * s)) set(x, y, BODY, 255);
      const onBorder =
        insideRounded(x, y, 15 * s, 5 * s, 49 * s, 59 * s, 11 * s) &&
        !insideRounded(x, y, 17 * s, 7 * s, 47 * s, 57 * s, 9 * s);
      if (onBorder) set(x, y, BORDER, 255);
    }
  }
  const lights = [
    { color: RED, cy: 20 },
    { color: AMBER, cy: 32 },
    { color: GREEN, cy: 44 }
  ];
  for (const l of lights) {
    const cx = 32 * s;
    const cy = l.cy * s;
    const r = 6 * s;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d <= r) set(x, y, l.color, 255);
        else if (d <= r + 1) set(x, y, l.color, Math.round((1 - (d - r)) * 255));
      }
    }
  }
  return png(size, size, rgba);
}

mkdirSync(OUT, { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(resolve(OUT, `icon-${size}.png`), draw(size));
  console.log(`icon-${size}.png escrito`);
}
