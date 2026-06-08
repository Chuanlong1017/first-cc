const fs = require('fs');
const path = require('path');

async function download(url, dest) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const buf = await res.arrayBuffer();
    fs.writeFileSync(dest, Buffer.from(buf));
    console.log('OK:', dest);
  } catch (e) {
    console.error('FAIL:', dest, e.message);
  }
}

async function main() {
  const urls = fs.readFileSync(process.argv[2], 'utf8').split('\n').filter(u => u.trim());
  const outDir = process.argv[3];
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (let i = 0; i < urls.length; i++) {
    const num = String(i + 1).padStart(2, '0');
    await download(urls[i], path.join(outDir, `img_${num}.jpg`));
  }
}

main();
