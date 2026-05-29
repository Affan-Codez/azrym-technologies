import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const pdfBuf = fs.readFileSync('C:\\Users\\AFFAN\\Desktop\\AZRYM_COMPANY_PROFILE.pdf');
const pdf = pdfBuf.toString('latin1');
const outDir = 'C:\\Users\\AFFAN\\Desktop\\azrym-website\\assets\\clients';
fs.mkdirSync(outDir, { recursive: true });

let saved = 0;

// Find stream positions in binary
const marker = Buffer.from('stream\n');
const marker2 = Buffer.from('stream\r\n');
const endMarker = Buffer.from('\nendstream');

let pos = 0;
while (pos < pdfBuf.length) {
  let start = pdfBuf.indexOf(marker, pos);
  let streamStart;
  if (start === -1) {
    start = pdfBuf.indexOf(marker2, pos);
    if (start === -1) break;
    streamStart = start + marker2.length;
  } else {
    streamStart = start + marker.length;
  }

  const end = pdfBuf.indexOf(endMarker, streamStart);
  if (end === -1) break;

  // Look back for dictionary
  const lookback = pdfBuf.subarray(Math.max(0, start - 800), start).toString('latin1');
  if (!/\/Subtype\s*\/Image/.test(lookback)) {
    pos = streamStart;
    continue;
  }

  const wM = lookback.match(/\/Width\s+(\d+)/);
  const hM = lookback.match(/\/Height\s+(\d+)/);
  if (!wM || !hM) {
    pos = streamStart;
    continue;
  }

  const w = +wM[1];
  const h = +hM[1];
  const data = pdfBuf.subarray(streamStart, end);

  const isDct = /\/DCTDecode/.test(lookback);
  const isFlate = /\/FlateDecode/.test(lookback);
  const cs = (lookback.match(/\/ColorSpace\s*\/(\w+)/) || [])[1] || 'DeviceRGB';

  if (w < 30 || h < 30) {
    pos = streamStart;
    continue;
  }

  if (isDct) {
    const jstart = data.indexOf(Buffer.from([0xff, 0xd8]));
    if (jstart >= 0) {
      let jend = jstart + 2;
      while (jend < data.length - 1) {
        if (data[jend] === 0xff && data[jend + 1] === 0xd9) {
          jend += 2;
          break;
        }
        jend++;
      }
      const jpg = data.subarray(jstart, jend);
      const fname = `logo-${w}x${h}-${saved++}.jpg`;
      fs.writeFileSync(path.join(outDir, fname), jpg);
      console.log('DCT', fname, w, h, jpg.length);
    }
  } else if (isFlate) {
    try {
      const inflated = zlib.inflateSync(data);
      let ch = 3;
      if (cs === 'DeviceGray') ch = 1;
      const expected = w * h * ch;
      if (inflated.length === w * h * 4) ch = 4;
      else if (inflated.length !== expected) {
        console.log('Skip flate size mismatch', w, h, inflated.length, expected, cs);
        pos = streamStart;
        continue;
      }
      // save raw + metadata for manual check
      const fname = `logo-${w}x${h}-${saved++}.raw`;
      fs.writeFileSync(path.join(outDir, fname.replace('.raw', '.meta.json')), JSON.stringify({ w, h, ch, cs, len: inflated.length }));
      fs.writeFileSync(path.join(outDir, fname), inflated);
      console.log('FLATE', fname, w, h, ch, inflated.length);
    } catch (e) {
      console.log('Inflate fail', w, h, e.message);
    }
  }

  pos = end + 1;
}

console.log('done', saved);
