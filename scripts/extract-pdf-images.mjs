import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pdfPath = 'C:\\Users\\AFFAN\\Desktop\\AZRYM_COMPANY_PROFILE.pdf';
const outDir = path.join(__dirname, '..', 'assets', 'clients');

fs.mkdirSync(outDir, { recursive: true });

const buf = fs.readFileSync(pdfPath);
const images = [];

function extractJpegs(buffer) {
  let i = 0;
  let idx = 0;
  while (i < buffer.length - 1) {
    if (buffer[i] === 0xff && buffer[i + 1] === 0xd8) {
      let end = i + 2;
      while (end < buffer.length - 1) {
        if (buffer[end] === 0xff && buffer[end + 1] === 0xd9) {
          end += 2;
          const slice = buffer.subarray(i, end);
          if (slice.length > 2000) {
            images.push({ type: 'jpg', data: slice, index: idx++ });
          }
          i = end;
          break;
        }
        end++;
      }
      if (end >= buffer.length - 1) break;
    } else {
      i++;
    }
  }
}

function extractPngs(buffer) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  let i = 0;
  let idx = images.length;
  while (i < buffer.length) {
    const pos = buffer.indexOf(sig, i);
    if (pos === -1) break;
    let end = pos + 8;
    while (end < buffer.length) {
      if (end + 8 > buffer.length) break;
      const len = buffer.readUInt32BE(end);
      const chunkType = buffer.toString('ascii', end + 4, end + 8);
      end += 12 + len;
      if (chunkType === 'IEND') {
        end += 4;
        const slice = buffer.subarray(pos, end);
        if (slice.length > 500) {
          images.push({ type: 'png', data: slice, index: idx++ });
        }
        break;
      }
    }
    i = pos + 1;
  }
}

extractJpegs(buf);
extractPngs(buf);

images.forEach((img) => {
  const name = `extracted-${String(img.index).padStart(2, '0')}.${img.type}`;
  fs.writeFileSync(path.join(outDir, name), img.data);
});

console.log(`Extracted ${images.length} images to ${outDir}`);
images.forEach((img) => console.log(`  ${img.index}: ${img.data.length} bytes (${img.type})`));
