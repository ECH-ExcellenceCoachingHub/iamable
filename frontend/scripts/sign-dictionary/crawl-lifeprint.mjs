// Crawl lifeprint.com ASL sign pages and build { gloss: mediaPath } for Am Able.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const BASE = 'https://www.lifeprint.com/asl101/';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.join(HERE, '.cache', 'lifeprint');
const OUT = path.join(HERE, 'raw', 'lifeprint.json');
const MAX_PAGES = 12000;
const CONCURRENCY = 8;
fs.mkdirSync(CACHE, { recursive: true });

async function get(url) {
  const file = path.join(CACHE, crypto.createHash('md5').update(url).digest('hex'));
  if (fs.existsSync(file)) return fs.readFileSync(file, 'latin1');
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'AmAble-dictionary-builder/1.0' }, signal: AbortSignal.timeout(20000) });
      const body = res.ok ? Buffer.from(await res.arrayBuffer()).toString('latin1') : '';
      fs.writeFileSync(file, body, 'latin1');
      return body;
    } catch {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return '';
}

const decode = (s) =>
  s.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;|&lsquo;/g, "'").replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, '');
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Turn a gloss like "AGAIN / REPEAT" or "ABC's" into lookup keys. */
function glossKeys(text) {
  return decode(text)
    .replace(/\([^)]*\)/g, ' ') // "FRENCH (fries)" is the sign for fries, not for "french"
    .toLowerCase()
    .split(/\s*(?:\/|,|;|\bor\b|\(|\))\s*/)
    .map((g) => g.replace(/["“”]/g, '').replace(/'s\b/g, 's').replace(/[^a-z0-9' -]/g, '').replace(/-/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((g) => g && g.split(' ').length <= 3 && g.length <= 30 && !/^\d+$/.test(g) && g.length > 1 || g === 'a' || g === 'i');
}

function pageSlug(url) {
  return url.match(/pages-signs\/[a-z0-9]\/([^/]+?)\.htm/i)?.[1]?.toLowerCase() ?? '';
}

const pages = new Map(); // page url -> Set of glosses
const addPage = (url, gloss) => {
  url = url.replace(/#.*$/, '').replace(/^http:/, 'https:').replace('://lifeprint.com', '://www.lifeprint.com');
  if (!/\/asl101\/pages-signs\/[a-z0-9]\/[^/]+\.htm$/i.test(url)) return false;
  const isNew = !pages.has(url);
  if (isNew) pages.set(url, new Set());
  // The index sometimes splits one entry over two links ("FRENCH" + "FRIES" → frenchfries.htm);
  // skip link text that is only the start of the page's own name.
  const slug = norm(pageSlug(url).replace(/-\d+$/, ''));
  for (const k of gloss ? glossKeys(gloss) : []) {
    if (slug.startsWith(norm(k)) && slug !== norm(k)) continue;
    pages.get(url).add(k);
  }
  return isNew;
};

// 1. Seed from the A–Z indexes and the signs index.
for (const idx of [...'abcdefghijklmnopqrstuvwxyz'].map((l) => `${BASE}index/${l}.htm`).concat(`${BASE}pages-signs/index.htm`)) {
  const html = await get(idx);
  for (const m of html.matchAll(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    addPage(new URL(m[1], idx).href, m[2]);
  }
}
console.error(`seeded ${pages.size} pages`);

// 2. Crawl sign pages (following links to other sign pages) and pick each page's media.
const MEDIA_DIRS = /\/asl101\/(gifs|gifs-animated|videos|images-signs)\//i;
const results = new Map(); // page -> { path, score, kind }
const queue = [...pages.keys()];
const allGlosses = new Set([...pages.values()].flatMap((g) => [...g]));
let done = 0;

function pickMedia(pageUrl, html, glosses) {
  const slug = pageSlug(pageUrl).replace(/-\d+$/, '');
  const names = [slug, ...glosses].map(norm).filter((n) => n.length >= 2);
  let best = null;
  for (const m of html.matchAll(/\ssrc\s*=\s*"([^"]+\.(?:gif|mp4))"/gi)) {
    let abs;
    try { abs = new URL(m[1], pageUrl).href.replace(/^http:/, 'https:').replace('://lifeprint.com', '://www.lifeprint.com'); } catch { continue; }
    if (!abs.startsWith(BASE) || !MEDIA_DIRS.test(abs)) continue;
    const rel = abs.slice(BASE.length);
    const base = rel.split('/').pop().replace(/\.(gif|mp4)$/i, '').toLowerCase();
    const baseCore = norm(base.replace(/-?(\d+|v\d+|2h|1h|fs|closeup|front|side|general|movement|alt|old|new|ver\d*)$/g, ''));
    const hyphens = base.split('-').length;
    // The file must be named after the sign, or we'd attach a related sign's media (e.g. "girlfriend" on "friend").
    const exact = names.some((n) => norm(base) === n || baseCore === n);
    // "cook-verb" is a variant of cook, but "french-fries" on the "french" page is a different sign.
    const isOtherSign = allGlosses.has(base.replace(/-\d+$/, '').replace(/-/g, ' '));
    const prefix = !isOtherSign && names.some((n) => norm(base).startsWith(n) && hyphens <= 3);
    if (!exact && !prefix) continue;
    const dir = rel.split('/')[0];
    let score = exact ? 60 : 30;
    score += { gifs: 50, 'gifs-animated': 45, videos: 25, 'images-signs': 0 }[dir] ?? 0;
    score -= Math.max(0, hyphens - 2) * 10;
    if (!best || score > best.score) best = { path: rel, score, kind: dir === 'images-signs' ? 'image' : rel.endsWith('.mp4') ? 'video' : 'gif' };
  }
  return best;
}

async function worker() {
  while (queue.length && pages.size <= MAX_PAGES) {
    const url = queue.shift();
    const html = await get(url);
    done++;
    if (done % 250 === 0) console.error(`${done} crawled, ${queue.length} queued, ${results.size} with media`);
    if (!html) continue;
    const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '';
    const titleGloss = decode(title).split(/[•|:–—]| - | in (?:american )?sign language| asl\b/i)[0];
    const glosses = pages.get(url);
    if (titleGloss && /[a-z]/i.test(titleGloss) && titleGloss.length < 40) glossKeys(titleGloss).forEach((g) => glosses.add(g));
    const slugGloss = pageSlug(url).replace(/-\d+$/, '').replace(/-/g, ' ');
    if (slugGloss) glosses.add(slugGloss);
    const media = pickMedia(url, html, [...glosses]);
    if (media) results.set(url, media);
    for (const m of html.matchAll(/href="([^"]*pages-signs[^"]*\.htm|[a-z0-9]\/[^"/]+\.htm|\.\.\/[a-z0-9]\/[^"/]+\.htm)"/gi)) {
      try {
        const abs = new URL(m[1], url).href;
        if (addPage(abs) && pages.size <= MAX_PAGES) queue.push(abs.replace(/^http:/, 'https:').replace('://lifeprint.com', '://www.lifeprint.com'));
      } catch { /* bad link */ }
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.error(`crawled ${done} pages, ${results.size} with media`);

// 3. Build gloss -> media, preferring the best-scoring media when glosses collide.
const dict = new Map();
for (const [url, media] of results) {
  for (const g of pages.get(url)) {
    if (!/^[a-z][a-z0-9' ]*$/.test(g)) continue;
    const prev = dict.get(g);
    if (!prev || media.score > prev.score) dict.set(g, media);
  }
}
const out = Object.fromEntries([...dict.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([g, m]) => [g, m.path]));
fs.writeFileSync(OUT, JSON.stringify(out));
const kinds = [...dict.values()].reduce((a, m) => ((a[m.kind] = (a[m.kind] || 0) + 1), a), {});
console.error(`wrote ${Object.keys(out).length} glosses`, kinds);
