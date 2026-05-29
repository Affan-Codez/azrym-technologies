import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const dir = 'C:\\Users\\AFFAN\\Desktop\\azrym-website\\assets\\clients';

const clients = [
  { file: 'logo-200x200-0.raw', slug: 'iil', name: 'International Industries Limited (IIL)' },
  { file: 'logo-270x187-1.raw', slug: 'dewan-cement', name: 'Dewan Cement Limited' },
  { file: 'logo-457x110-2.raw', slug: 'dewan-farooque-motors', name: 'Dewan Farooque Motors Limited' },
  { file: 'logo-369x137-3.raw', slug: 'indus-motor', name: 'Indus Motor Company Limited' },
  { file: 'logo-278x181-4.raw', slug: 'fauji-akbar-portia', name: 'Fauji Akbar Portia Marine Terminals Ltd' },
  { file: 'logo-200x200-5.raw', slug: 'k-electric', name: 'K-Electric Limited' },
  { file: 'logo-316x159-6.raw', slug: 'iqra-university', name: 'Iqra University' },
  { file: 'logo-304x166-7.raw', slug: 'patel-hospital', name: 'Patel Hospital' },
  { file: 'logo-333x79-8.raw', slug: 'ksbl', name: 'Karachi School of Business & Leadership (KSBL)' },
];

function crc32(buf) {
  let c = 0xffffffff;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let v = n;
    for (let k = 0; k < 8; k++) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1;
    table[n] = v;
  }
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type);
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function rawToPng(raw, w, h, channels = 3) {
  const stride = w * channels;
  const filtered = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    filtered[y * (stride + 1)] = 0;
    raw.copy(filtered, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = channels === 4 ? 6 : 2;
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(filtered, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const c of clients) {
  const metaPath = path.join(dir, c.file.replace('.raw', '.meta.json'));
  const rawPath = path.join(dir, c.file);
  if (!fs.existsSync(rawPath)) {
    console.error('Missing', c.file);
    continue;
  }
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  const raw = fs.readFileSync(rawPath);
  const png = rawToPng(raw, meta.w, meta.h, meta.ch);
  const out = path.join(dir, `${c.slug}.png`);
  fs.writeFileSync(out, png);
  console.log('Wrote', out);
}

// Also save jpg if k-electric was wrong - check 224x224 jpg
const jpg = path.join(dir, 'logo-224x224-9.jpg');
if (fs.existsSync(jpg)) {
  fs.copyFileSync(jpg, path.join(dir, 'logo-224x224-9-backup.jpg'));
}

console.log('Done');
