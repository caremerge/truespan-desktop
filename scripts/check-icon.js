const fs = require('fs');
const path = require('path');

// Check PNG header for dimensions
const png = fs.readFileSync(path.join(__dirname, '..', 'assets', 'icon.png'));
const width = png.readUInt32BE(16);
const height = png.readUInt32BE(20);
console.log(`icon.png: ${width}x${height} (${png.length} bytes)`);

// Check ICO for contained sizes
const ico = fs.readFileSync(path.join(__dirname, '..', 'assets', 'icon.ico'));
const count = ico.readUInt16LE(4);
console.log(`icon.ico: ${count} image(s) (${ico.length} bytes)`);
for (let i = 0; i < count; i++) {
  const offset = 6 + i * 16;
  const w = ico[offset] || 256;
  const h = ico[offset + 1] || 256;
  console.log(`  - ${w}x${h}`);
}
