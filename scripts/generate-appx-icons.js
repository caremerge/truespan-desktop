const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const sourceIcon = path.join(__dirname, '..', 'assets', 'icon.png');
const outputDir = path.join(__dirname, '..', 'build', 'appx');

const sizes = [
  { name: 'StoreLogo.png', width: 50, height: 50 },
  { name: 'Square44x44Logo.png', width: 44, height: 44 },
  { name: 'Square150x150Logo.png', width: 150, height: 150 },
  { name: 'Wide310x150Logo.png', width: 310, height: 150 },
];

async function main() {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const { name, width, height } of sizes) {
    const outPath = path.join(outputDir, name);
    await sharp(sourceIcon)
      .resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(outPath);
    console.log(`Generated ${name} (${width}x${height})`);
  }

  console.log(`\nAll icons saved to ${outputDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
