/**
 * Gera os arquivos de ícone e de abertura que o `app.json` aponta, a partir do símbolo da marca.
 *
 *   node scripts/make-icons.js
 *
 * O símbolo é o portal da identidade visual (ADR 0023), descrito aqui por geometria numa grade de
 * 64 unidades — a mesma de `shared/components/CondfySymbol.tsx`. Mudou o desenho? Mude nos dois e
 * rode este arquivo de novo.
 *
 * Sem dependência nenhuma, de propósito: o PNG é escrito à mão com o `zlib` do Node, para que
 * desenhar seis imagens não traga uma biblioteca de imagem para o projeto.
 */
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const AMBER = [0xf2, 0xa9, 0x3b];
const GRAPHITE = [0x1d, 0x1b, 0x18];
const WHITE = [0xff, 0xff, 0xff];

const OUT = path.join(__dirname, "..", "assets", "images");

/** O arco de fora: uma linha de 5 de espessura, com as pontas redondas. */
function insideArch(x, y) {
  const distance =
    y < 29
      ? Math.abs(Math.hypot(x - 32, y - 29) - 17)
      : Math.min(
          Math.hypot(x - 15, Math.max(0, y - 51)),
          Math.hypot(x - 49, Math.max(0, y - 51))
        );
  return distance <= 2.5;
}

/** A porta: um retângulo cheio com o topo em meia-volta. */
function insideDoor(x, y) {
  if (y > 51) return false;
  if (y >= 31) return x >= 25 && x <= 39;
  return Math.hypot(x - 32, y - 31) <= 7;
}

function insideTile(x, y, radius) {
  const dx = Math.max(radius - x, x - (64 - radius), 0);
  const dy = Math.max(radius - y, y - (64 - radius), 0);
  return x >= 0 && x <= 64 && y >= 0 && y <= 64 && Math.hypot(dx, dy) <= radius;
}

/**
 * Desenha uma imagem quadrada.
 *
 * `tile`: a cor do quadrado de fundo, ou `null` para fundo transparente. `radius`: o canto dele, em
 * unidades da grade. `glyph`: a cor do símbolo, ou `null` para não desenhar. `scale`: quanto do
 * quadro o símbolo ocupa — o ícone adaptável do Android corta as bordas, e por isso encolhe.
 */
function draw({ size, tile, radius = 0, glyph, scale = 1 }) {
  const SAMPLES = 4;
  const pixels = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let tileHits = 0;
      let glyphHits = 0;
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const x = ((px + (sx + 0.5) / SAMPLES) / size) * 64;
          const y = ((py + (sy + 0.5) / SAMPLES) / size) * 64;
          if (tile && insideTile(x, y, radius)) tileHits++;
          const gx = (x - 32) / scale + 32;
          const gy = (y - 32) / scale + 32;
          if (glyph && (insideArch(gx, gy) || insideDoor(gx, gy))) glyphHits++;
        }
      }
      const total = SAMPLES * SAMPLES;
      const tileAlpha = tileHits / total;
      const glyphAlpha = glyphHits / total;
      const alpha = glyphAlpha + tileAlpha * (1 - glyphAlpha);
      const at = (py * size + px) * 4;
      for (let c = 0; c < 3; c++) {
        const under = tile ? tile[c] * tileAlpha * (1 - glyphAlpha) : 0;
        const over = glyph ? glyph[c] * glyphAlpha : 0;
        pixels[at + c] = alpha > 0 ? Math.round((over + under) / alpha) : 0;
      }
      pixels[at + 3] = Math.round(alpha * 255);
    }
  }
  return pixels;
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(body) >>> 0);
  return Buffer.concat([length, body, crc]);
}

function writePng(name, size, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bits por canal
  header[9] = 6; // RGBA
  const rows = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    pixels.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(rows, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  fs.writeFileSync(path.join(OUT, name), png);
  console.log(`${name}  ${size}x${size}`);
}

const images = [
  // iOS e lojas: quadro cheio, sem canto — o sistema arredonda.
  { name: "icon.png", size: 1024, tile: AMBER, glyph: GRAPHITE },
  // Android adaptável: o símbolo sobre transparente, menor, por cima de um fundo liso.
  { name: "android-icon-foreground.png", size: 1024, tile: null, glyph: GRAPHITE, scale: 0.8 },
  { name: "android-icon-background.png", size: 1024, tile: AMBER, glyph: null },
  // Ícone temático do Android: só a forma. A cor é do sistema.
  { name: "android-icon-monochrome.png", size: 1024, tile: null, glyph: WHITE, scale: 0.8 },
  { name: "favicon.png", size: 48, tile: AMBER, radius: 15, glyph: GRAPHITE },
  { name: "splash-icon.png", size: 512, tile: AMBER, radius: 15, glyph: GRAPHITE },
];

fs.mkdirSync(OUT, { recursive: true });
for (const { name, size, ...options } of images) {
  writePng(name, size, draw({ size, ...options }));
}
