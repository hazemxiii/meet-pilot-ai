/* eslint-disable @typescript-eslint/no-require-imports */
// One-off icon generator — pure Node PNG encoder, no dependencies.
// Draws a Google-blue rounded square with a white "captions" pill and
// two caption lines + a red live dot. Run: node generate-icons.js

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const BLUE = [26, 115, 232]; // #1a73e8
const WHITE = [255, 255, 255];
const RED = [234, 67, 53]; // #ea4335
const BAR = [26, 115, 232]; // bars drawn on the white pill

function inRoundRect(x, y, rx, ry, rw, rh, r) {
  if (x < rx || x > rx + rw || y < ry || y > ry + rh) return false;
  const cx = Math.min(Math.max(x, rx + r), rx + rw - r);
  const cy = Math.min(Math.max(y, ry + r), ry + rh - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function inRect(x, y, rx, ry, rw, rh) {
  return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;
}

function inCircle(x, y, cx, cy, r) {
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

// Render at SS = supersample factor for anti-aliasing.
function renderIcon(size, SS = 4) {
  const W = size * SS;
  const rgba = Buffer.alloc(W * W * 4);

  // Icon geometry (in icon-units, origin top-left, icon square = size)
  const pad = 0.06 * size;
  const sq = size - 2 * pad;
  const radius = 0.22 * size;

  const pill = {
    rx: 0.22 * size,
    ry: 0.30 * size,
    rw: 0.56 * size,
    rh: 0.36 * size,
    r: 0.09 * size,
  };

  // caption bars on the pill
  const bars = [
    { rx: 0.28 * size, ry: 0.40 * size, rw: 0.34 * size, rh: 0.05 * size },
    { rx: 0.28 * size, ry: 0.50 * size, rw: 0.26 * size, rh: 0.05 * size },
  ];

  // red live dot (top-right corner of the square)
  const dot = { cx: size - pad - 0.16 * size, cy: pad + 0.16 * size, r: 0.075 * size };

  for (let py = 0; py < W; py++) {
    for (let px = 0; px < W; px++) {
      const x = (px + 0.5) / SS;
      const y = (py + 0.5) / SS;

      let color = [0, 0, 0];
      let alpha = 0;

      if (inRoundRect(x, y, pad, pad, sq, sq, radius)) {
        color = BLUE;
        alpha = 1;
      }

      // white pill on top
      if (inRoundRect(x, y, pill.rx, pill.ry, pill.rw, pill.rh, pill.r)) {
        color = WHITE;
      }

      // caption bars
      for (const b of bars) {
        if (inRect(x, y, b.rx, b.ry, b.rw, b.rh)) {
          color = BAR;
          break;
        }
      }

      // red live dot (drawn last, overlaps everything)
      if (inCircle(x, y, dot.cx, dot.cy, dot.r)) {
        color = RED;
      }

      const o = (py * W + px) * 4;
      rgba[o] = color[0];
      rgba[o + 1] = color[1];
      rgba[o + 2] = color[2];
      rgba[o + 3] = Math.round(alpha * 255);
    }
  }

  // downsample
  const out = Buffer.alloc(size * size * 4);
  for (let oy = 0; oy < size; oy++) {
    for (let ox = 0; ox < size; ox++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const o = ((oy * SS + sy) * W + (ox * SS + sx)) * 4;
          const aa = rgba[o + 3] / 255;
          r += rgba[o] * aa;
          g += rgba[o + 1] * aa;
          b += rgba[o + 2] * aa;
          a += aa;
        }
      }
      const n = SS * SS;
      const o = (oy * size + ox) * 4;
      if (a > 0) {
        out[o] = Math.round(r / a);
        out[o + 1] = Math.round(g / a);
        out[o + 2] = Math.round(b / a);
        out[o + 3] = Math.round((a / n) * 255);
      } else {
        out[o] = 0;
        out[o + 1] = 0;
        out[o + 2] = 0;
        out[o + 3] = 0;
      }
    }
  }
  return out;
}

const dir = path.join(__dirname, 'icons');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

for (const size of [16, 32, 48, 128]) {
  const png = encodePng(size, size, renderIcon(size));
  fs.writeFileSync(path.join(dir, `icon${size}.png`), png);
  console.log(`icon${size}.png written (${png.length} bytes)`);
}
