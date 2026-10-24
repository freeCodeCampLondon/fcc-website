// Draws the fixed parts of the Open Graph cards that astro-og-canvas cannot
// draw itself, using the same renderer (CanvasKit) and the Lato font files
// from @fontsource/lato:
//
//   src/assets/og/background.png  1200x630, transparent, with the London
//                                 gradient stripe along the bottom edge and
//                                 "freecodecamp.london" as the footer line
//   src/assets/og/accent.png      the short gradient bar above each title
//                                 (passed as the card "logo")
//
// The page title and description are drawn per page at build time by
// src/pages/og/[...route].ts. Run after changing these assets, then commit
// the generated files:
//   node scripts/generate-og-assets.mjs
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const init = require("canvaskit-wasm/full");
const CanvasKit = await init({
  locateFile: (file) => require.resolve(`canvaskit-wasm/bin/full/${file}`),
});

const outDir = new URL("../src/assets/og/", import.meta.url);
await mkdir(outDir, { recursive: true });

// Dark theme tokens from src/styles/global.css.
const green = CanvasKit.Color(0x5e, 0xe3, 0x9a);
const blue = CanvasKit.Color(0x7c, 0xb8, 0xff);
const red = CanvasKit.Color(0xff, 0x7a, 0x6e);

const [width, height] = [1200, 630];
const padding = 60;
const stripeHeight = 12;

function gradientPaint(x0, x1) {
  const paint = new CanvasKit.Paint();
  paint.setShader(
    CanvasKit.Shader.MakeLinearGradient(
      [x0, 0],
      [x1, 0],
      [green, blue, red],
      null,
      CanvasKit.TileMode.Clamp,
    ),
  );
  return paint;
}

async function save(surface, name) {
  const bytes = surface.makeImageSnapshot().encodeToBytes();
  surface.dispose();
  await writeFile(new URL(name, outDir), bytes);
}

// Background: stripe and footer text.
{
  const surface = CanvasKit.MakeSurface(width, height);
  const canvas = surface.getCanvas();
  canvas.clear(CanvasKit.TRANSPARENT);
  canvas.drawRect(
    CanvasKit.XYWHRect(0, height - stripeHeight, width, stripeHeight),
    gradientPaint(0, width),
  );

  const lato = await readFile(
    require.resolve("@fontsource/lato/files/lato-latin-700-normal.woff2"),
  );
  const fontMgr = CanvasKit.FontMgr.FromData(lato);
  const builder = CanvasKit.ParagraphBuilder.Make(
    new CanvasKit.ParagraphStyle({
      textStyle: {
        color: green,
        fontFamilies: ["Lato"],
        fontSize: 32,
        fontStyle: { weight: CanvasKit.FontWeight.Bold },
      },
    }),
    fontMgr,
  );
  builder.addText("freecodecamp.london");
  const paragraph = builder.build();
  paragraph.layout(width - 2 * padding);
  canvas.drawParagraph(
    paragraph,
    padding,
    height - stripeHeight - padding / 2 - paragraph.getHeight(),
  );
  await save(surface, "background.png");
}

// Accent bar above the title.
{
  const [barWidth, barHeight] = [160, 12];
  const surface = CanvasKit.MakeSurface(barWidth, barHeight);
  const canvas = surface.getCanvas();
  canvas.clear(CanvasKit.TRANSPARENT);
  const paint = gradientPaint(0, barWidth);
  paint.setAntiAlias(true);
  canvas.drawRRect(
    CanvasKit.RRectXY(
      CanvasKit.XYWHRect(0, 0, barWidth, barHeight),
      barHeight / 2,
      barHeight / 2,
    ),
    paint,
  );
  await save(surface, "accent.png");
}

console.log("Wrote src/assets/og/background.png and accent.png");
