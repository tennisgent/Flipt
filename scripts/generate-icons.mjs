import sharp from "sharp";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const publicDir = resolve(projectRoot, "public");

const faviconSvg = readFileSync(resolve(publicDir, "favicon.svg"));

// Theme background color (#1a0533 - deep purple, matches theme-color)
const BG_COLOR = { r: 26, g: 5, b: 51, alpha: 1 };

const sizes = [
  { size: 180, name: "apple-touch-icon.png" },
  { size: 192, name: "icon-192.png" },
  { size: 512, name: "icon-512.png" },
];

for (const { size, name } of sizes) {
  const padding = Math.round(size * 0.18);
  const iconSize = size - padding * 2;

  // Resize the SVG lightning bolt
  const icon = await sharp(faviconSvg)
    .resize(iconSize, iconSize, { fit: "contain", background: "transparent" })
    .png()
    .toBuffer();

  // Composite onto dark background
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG_COLOR,
    },
  })
    .png()
    .composite([{ input: icon, gravity: "centre" }])
    .toFile(resolve(publicDir, name));

  console.log(`✓ Generated ${name} (${size}×${size})`);
}

console.log("Done!");
