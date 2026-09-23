// Crawl ASL Signbank (CC BY-NC-SA 4.0) gloss rows: { id, gloss, keywords, video }.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://aslsignbank.com';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.join(HERE, '.cache', 'signbank');
const OUT = path.join(HERE, 'raw', 'signbank.json');
fs.mkdirSync(CACHE, { recursive: true });

async function get(url, key) {
  const file = path.join(CACHE, key);
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return fs.readFileSync(file, 'utf8');
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'AmAble-dictionary-builder/1.0' }, signal: AbortSignal.timeout(30000) });
      if (res.ok) {
        const body = await res.text();
        fs.writeFileSync(file, body);
        return body;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
  return '';
}

const ids = new Set();
for (let page = 1; page < 200; page++) {
  const html = await get(`${BASE}/signs/show_all/?page=${page}`, `page-${page}`);
  const list = html.match(/objects_on_this_page = \[([^\]]*)\]/)?.[1];
  if (!list || !list.trim()) break;
  list.split(',').forEach((id) => ids.add(id.trim()));
}
console.error(`${ids.size} gloss ids`);

const queue = [...ids];
const rows = [];
let done = 0;
async function worker() {
  while (queue.length) {
    const id = queue.shift();
    const html = await get(`${BASE}/dictionary/ajax/glossrow/${id}/`, `row-${id}`);
    if (++done % 500 === 0) console.error(`${done}/${ids.size}`);
    const video = html.match(/src="(\/dictionary\/protected_media\/glossvideo\/[^"]+\.mp4)"/)?.[1];
    if (!video) continue;
    const cells = html.split(/<\/td>/i).map((c) => c.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim());
    const gloss = cells.find((c) => c) ?? '';
    const keywords = cells.find((c) => c.includes(',')) ?? '';
    rows.push({ id, gloss, keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean), video });
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
fs.writeFileSync(OUT, JSON.stringify(rows));
console.error(`wrote ${rows.length} rows with video`);
