import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pdfPath = 'C:\\Users\\AFFAN\\Desktop\\AZRYM_COMPANY_PROFILE.pdf';
const outDir = path.join(__dirname, '..', 'assets', 'clients');

fs.mkdirSync(outDir, { recursive: true });

const pdf = fs.readFileSync(pdfPath).toString('latin1');
let saved = 0;

function savePng(raw, w, h, name) {
  // Build minimal PNG from RGB or RGBA raw data
  const channels = raw.length / (w * h);
  if (channels !== 3 && channels !== 4) return false;

  function crc32(buf) {
    let c = 0xffffffff;
    const table = (() => {
      const t = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c;
      }
      return t;
    })();
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

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = channels === 4 ? 6 : 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = w * channels;
  const filtered = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    filtered[y * (stride + 1)] = 0;
    for (let x = 0; x < stride; x++) {
      filtered[y * (stride + 1) + 1 + x] = raw[y * stride + x];
    }
  }

  const png = Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(filtered, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);

  fs.writeFileSync(path.join(outDir, name), png);
  return true;
}

// Find image dictionaries with Width/Height and stream data
const streamRegex = /(\d+)\s+(\d+)\s+obj[\s\S]*?<<([\s\S]*?)>>\s*stream\r?\n([\s\S]*?)\r?\nendstream/g;
let m;
const candidates = [];

while ((m = streamRegex.exec(pdf)) !== null) {
  const dict = m[2];
  const data = m[3];
  if (!/\/Subtype\s*\/Image/.test(dict)) continue;

  const wMatch = dict.match(/\/Width\s+(\d+)/);
  const hMatch = dict.match(/\/Height\s+(\d+)/);
  if (!wMatch || !hMatch) continue;

  const w = parseInt(wMatch[1], 10);
  const h = parseInt(hMatch[1], 10);
  if (w < 40 || h < 40 || w > 2000 || h > 2000) continue;

  const bpc = dict.match(/\/BitsPerComponent\s+(\d+)/);
  const bits = bpc ? parseInt(bpc[1], 10) : 8;
  const cs = dict.match(/\/ColorSpace\s*\/(\w+)/);
  const colorSpace = cs ? cs[1] : 'DeviceRGB';

  const filters = [];
  if (/\/Filter\s*\/FlateDecode/.test(dict)) filters.push('flate');
  if (/\/Filter\s*\/DCTDecode/.test(dict) || /\/Filter\s*\[\s*\/DCTDecode/.test(dict)) filters.push('dct');
  if (/\/Filter\s*\[\s*\/FlateDecode/.test(dict)) filters.push('flate');

  candidates.push({ w, h, bits, colorSpace, filters, data, dict });
}

for (const c of candidates) {
  const rawBuf = Buffer.from(c.data, 'latin1');

  if (c.filters.includes('dct')) {
    const start = rawBuf.indexOf(Buffer.from([0xff, 0xd8]));
    if (start >= 0) {
      let end = start + 2;
      while (end < rawBuf.length - 1) {
        if (rawBuf[end] === 0xff && rawBuf[end + 1] === 0xd9) {
          end += 2;
          break;
        }
        end++;
      }
      const jpg = rawBuf.subarray(start, end);
      if (jpg.length > 1000) {
        fs.writeFileSync(path.join(outDir, `img-${saved++}.jpg`), jpg);
        console.log(`Saved jpg ${c.w}x${c.h} (${jpg.length} bytes)`);
      }
    }
    continue;
  }

  if (!c.filters.includes('flate')) continue;

  let channels = 3;
  if (c.colorSpace === 'DeviceGray') channels = 1;
  if (c.colorSpace === 'DeviceCMYK') channels = 4;
  if (/\/SMask/.test(c.dict)) channels = 4;

  try {
    const inflated = zlib.inflateSync(rawBuf);
    const expected = c.w * c.h * channels;
    if (Math.abs(inflated.length - expected) > expected * 0.05) {
      // try RGBA
      if (inflated.length === c.w * c.h * 4) channels = 4;
      else continue;
    }
    const name = `img-${saved++}.png`;
    if (savePng(inflated.subarray(0, c.w * c.h * channels), c.w, c.h, name)) {
      console.log(`Saved png ${c.w}x${c.h} ${name}`);
    }
  } catch (e) {
    // skip
  }
}

console.log(`Total saved: ${saved}`);
