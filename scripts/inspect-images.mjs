import fs from 'fs';
import path from 'path';

const dir = 'C:\\Users\\AFFAN\\Desktop\\azrym-website\\assets\\clients';
for (const f of fs.readdirSync(dir)) {
  const b = fs.readFileSync(path.join(dir, f));
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      if (marker === 0xc0 || marker === 0xc2) {
        const h = b.readUInt16BE(i + 5);
        const w = b.readUInt16BE(i + 7);
        console.log(`${f}: ${w}x${h}, ${b.length} bytes`);
        break;
      }
      const len = b.readUInt16BE(i + 2);
      i += 2 + len;
    }
  } else {
    console.log(`${f}: ${b.length} bytes (not jpeg header)`);
  }
}
