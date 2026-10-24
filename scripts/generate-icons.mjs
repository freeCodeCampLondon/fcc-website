// Generates the site icons in public/:
//
//   favicon.svg           our own London mark: Big Ben in the homepage brand
//                         gradient on night navy
//   favicon.ico           16, 32 and 48 px (PNG-compressed ICO)
//   apple-touch-icon.png  180 px
//   icon-192.png          192 px (web manifest)
//   icon-512.png          512 px (web manifest)
//
// Run after changing the colours below, then commit the generated files:
//   node scripts/generate-icons.mjs
import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const publicDir = new URL("../public/", import.meta.url);

// Dark theme tokens from src/styles/global.css (--bg and --brand-*).
const background = "#0d1321";
const gradient = ["#5ee39a", "#7cb8ff", "#ff7a6e"];

// 96 x 96 rounded square with Big Ben centred. The gradient runs across the
// tower (green, blue, red); navy details cut the clock face and windows.
const svg =
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <defs>
    <linearGradient id="brand" gradientUnits="userSpaceOnUse" x1="33" y1="0" x2="63" y2="0">
      <stop offset="0" stop-color="${gradient[0]}"/>
      <stop offset="0.5" stop-color="${gradient[1]}"/>
      <stop offset="1" stop-color="${gradient[2]}"/>
    </linearGradient>
  </defs>
  <rect width="96" height="96" rx="20" fill="${background}"/>
  <g fill="url(#brand)">
    <path d="M40 27 L48 5 L56 27 Z"/>
    <rect x="41" y="26" width="14" height="9"/>
    <rect x="35" y="34" width="26" height="24"/>
    <path d="M34.5 34l2-4h23l2 4z"/>
    <rect x="38" y="57" width="20" height="33"/>
  </g>
  <circle cx="48" cy="46" r="9" fill="${background}"/>
  <path d="M48 46v-6M48 46h4.5" stroke="url(#brand)" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M44 63v21M48 63v21M52 63v21" stroke="${background}" stroke-width="1.6" stroke-linecap="round"/>
</svg>
`);
await writeFile(new URL("favicon.svg", publicDir), svg);

// The SVG is 96 units square: 576 dpi renders it at 768 px before resizing.
const density = 576;

const png = (size) =>
  sharp(svg, { density })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();

// An ICO file whose images are stored as PNG (supported by every browser
// that still asks for favicon.ico).
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // colours in palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const icoSizes = [16, 32, 48];
const icoImages = await Promise.all(
  icoSizes.map(async (size) => ({ size, data: await png(size) })),
);
await writeFile(new URL("favicon.ico", publicDir), ico(icoImages));

// The square is opaque, so iOS needs no extra background.
await writeFile(new URL("apple-touch-icon.png", publicDir), await png(180));

for (const size of [192, 512]) {
  await writeFile(new URL(`icon-${size}.png`, publicDir), await png(size));
}

console.log(
  "Wrote favicon.ico, apple-touch-icon.png, icon-192.png and icon-512.png",
);
