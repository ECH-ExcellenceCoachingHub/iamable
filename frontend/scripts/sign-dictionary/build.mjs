// Merge crawled sign sources into src/data/asl-signs.json and src/data/kinyarwanda-wiktionary.json.
//
//   node scripts/sign-dictionary/crawl-lifeprint.mjs   -> raw/lifeprint.json
//   node scripts/sign-dictionary/crawl-signbank.mjs    -> raw/signbank.json
//   curl -o scripts/sign-dictionary/raw/rwanda-rundi.jsonl \
//     https://kaikki.org/dictionary/Rwanda-Rundi/kaikki.org-dictionary-RwandaRundi.jsonl
//   node scripts/sign-dictionary/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.join(HERE, 'raw');
const DATA = path.join(HERE, '../../src/data');

/** Hand-checked lifeprint signs; these always win. */
const VERIFIED = {
  'hello': 'videos/hi.mp4', 'thank you': 'gifs/t/thank-you.gif', 'please': 'gifs-animated/pleasecloseup.gif',
  'yes': 'gifs/y/yes.gif', 'no': 'gifs/n/no-2-movement.gif', 'not': 'gifs/n/not.gif', 'help': 'gifs/h/help.gif',
  'sorry': 'gifs/s/sorry-1.gif', 'good': 'gifs/g/good.gif', 'bad': 'gifs/b/bad.gif', 'fine': 'gifs/f/fine.gif',
  'nice': 'gifs/n/nice.gif', 'love': 'gifs/l/love.gif', 'like': 'gifs/l/like.gif', 'want': 'gifs/w/want.gif',
  'need': 'gifs/n/need.gif', 'know': 'gifs/k/know.gif', 'understand': 'gifs/u/understand.gif',
  'learn': 'gifs/l/learn-1.gif', 'sign': 'gifs/s/sign-fast.gif', 'name': 'gifs/n/name.gif', 'meet': 'gifs/m/meet-1.gif',
  'again': 'gifs/a/again.gif', 'more': 'gifs/m/more.gif', 'finish': 'gifs/f/finish.gif', 'wait': 'gifs/w/wait.gif',
  'stop': 'gifs/s/stop.gif', 'go': 'gifs/g/go.gif', 'come': 'gifs/c/come-here.gif', 'eat': 'gifs/e/eat.gif',
  'food': 'gifs/e/eat-food.gif', 'drink': 'gifs/d/drink-c.gif', 'water': 'gifs/w/water-2.gif', 'sleep': 'videos/sleep.mp4',
  'read': 'gifs/r/read.gif', 'write': 'gifs/w/write.gif', 'book': 'gifs/b/book.gif', 'buy': 'gifs/b/buy.gif',
  'sell': 'gifs/s/sell.gif', 'money': 'gifs/m/money.gif', 'work': 'gifs/w/work-general.gif', 'home': 'gifs/h/home-2.gif',
  'house': 'gifs/h/house-1.gif', 'school': 'gifs/s/school.gif', 'teacher': 'gifs/t/teacher.gif',
  'bathroom': 'gifs/b/bathroom.gif', 'family': 'gifs/f/family.gif', 'friend': 'gifs/f/friend.gif',
  'brother': 'gifs/b/brother.gif', 'sister': 'gifs/s/sister.gif', 'man': 'gifs/m/man.gif', 'woman': 'gifs/w/woman-front.gif',
  'boy': 'gifs/b/boy.gif', 'girl': 'gifs/g/girl.gif', 'baby': 'gifs/b/baby.gif', 'child': 'gifs/c/child.gif',
  'children': 'gifs/c/children.gif', 'people': 'gifs/p/people-1.gif', 'deaf': 'gifs/d/deaf.gif',
  'hearing': 'gifs/h/hearing.gif', 'english': 'gifs/e/english.gif', 'happy': 'gifs/h/happy.gif', 'sad': 'gifs/s/sad.gif',
  'angry': 'gifs/a/angry-2.gif', 'tired': 'gifs/t/tired.gif', 'hungry': 'gifs/h/hungry-wish.gif',
  'thirsty': 'gifs/t/thirsty.gif', 'sick': 'gifs/s/sick.gif', 'pain': 'videos/hurt-01.mp4', 'doctor': 'gifs/d/doctor-medic.gif',
  'medicine': 'gifs/m/medicine.gif', 'cold': 'gifs/c/cold-winter.gif', 'hot': 'gifs/h/hot.gif',
  'phone': 'gifs-animated/phone-01.gif', 'car': 'gifs/c/car.gif', 'bus': 'gifs/b/bus-fs.gif', 'what': 'gifs/w/what.gif',
  'where': 'gifs/w/where.gif', 'when': 'gifs/w/when.gif', 'who': 'gifs/w/who.gif', 'why': 'gifs/w/why.gif',
  'how': 'gifs/h/how-2h.gif', 'now': 'gifs/n/now.gif', 'time': 'gifs/t/time-1.gif', 'tomorrow': 'gifs/t/tomorrow.gif',
  'morning': 'gifs/m/morning.gif', 'afternoon': 'gifs/a/afternoon.gif', 'night': 'gifs/n/night.gif',
  'week': 'gifs/w/week.gif', 'year': 'gifs/y/year-1.gif',
};

const clean = (s) =>
  s.toLowerCase().replace(/[’‘]/g, "'").replace(/[_-]/g, ' ').replace(/[^a-z0-9' ]/g, '').replace(/\s+/g, ' ').trim();
const usable = (k) => /^[a-z][a-z0-9' ]*$/.test(k) && k.split(' ').length <= 3 && k.length <= 30;

/** Pronouns and grammar words, pinned to ASL Signbank glosses (lifeprint's pages for these are ambiguous). */
const SIGNBANK_PINNED = {
  i: 'IX_1', me: 'IX_1', you: 'IX', he: 'IX', she: 'IX', it: 'IX', this: 'IX', that: 'IX', there: 'IX',
  they: 'IXarc', them: 'IXarc', those: 'IXarc', your: 'POSS', his: 'POSS', her: 'POSS', their: 'POSS',
  we: 'US', us: 'US', our: 'OUR', my: 'POSS_1', mine: 'POSS_1', can: 'CAN', could: 'CAN',
};

/** Keywords Signbank attaches to an unrelated sign (e.g. "rice" on RAT). */
const SIGNBANK_SKIP_KEYWORDS = new Set(['rice']);

const decode = (s) => s.replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"');
const encodePath = (p) => encodeURI(decode(p)).replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29');

// Rank: verified > lifeprint GIF > Signbank video > lifeprint video > lifeprint drawing.
const RANK = { verified: 5, 'lp-gif': 4, sb: 3, 'lp-video': 2, 'lp-image': 1 };
const signs = new Map(); // gloss -> { value, rank, specificity }
/** `specificity`: 1000 when the entry is named after the word, otherwise higher for entries with fewer keywords. */
function offer(gloss, value, rank, specificity) {
  gloss = clean(gloss);
  if (!usable(gloss)) return;
  const prev = signs.get(gloss);
  if (!prev || rank > prev.rank || (rank === prev.rank && specificity > prev.specificity)) signs.set(gloss, { value, rank, specificity });
}

for (const [gloss, p] of Object.entries(VERIFIED)) offer(gloss, `L:${p}`, RANK.verified, 1000);

const lifeprint = JSON.parse(fs.readFileSync(path.join(RAW, 'lifeprint.json'), 'utf8'));
for (const [gloss, p] of Object.entries(lifeprint)) {
  const kind = p.startsWith('images-signs/') ? 'lp-image' : p.endsWith('.mp4') ? 'lp-video' : 'lp-gif';
  offer(gloss, `L:${p}`, RANK[kind], 1000);
}

const signbank = JSON.parse(fs.readFileSync(path.join(RAW, 'signbank.json'), 'utf8'));
const SB_PREFIX = '/dictionary/protected_media/glossvideo/';
const sbByGloss = new Map();
for (const row of signbank) {
  if (!row.video?.startsWith(SB_PREFIX)) continue;
  const value = `S:${encodePath(row.video.slice(SB_PREFIX.length))}`;
  sbByGloss.set(decode(row.gloss), value);
  // Glosses look like "HELLO", "THANK-YOU", "BOOK_2", "ABOVEstr" (variant) or "(fs)NAME"; drop variants and notes.
  const gloss = clean(decode(row.gloss).replace(/\(.*?\)/g, '').replace(/[a-z]+$/, '').replace(/[_-]?\d+$/, ''));
  if (gloss) offer(gloss, value, RANK.sb, 1000);
  // Annotation-convention entries (pointing, emblems) list loosely related keywords; don't spread them.
  if (row.keywords.some((k) => /annotation convention|deictic|emblem/i.test(k))) continue;
  for (const k of row.keywords.filter((k) => !SIGNBANK_SKIP_KEYWORDS.has(clean(k)))) offer(k, value, RANK.sb, clean(k) === gloss ? 1000 : 100 - row.keywords.length);
}

for (const [word, sbGloss] of Object.entries(SIGNBANK_PINNED)) {
  if (sbByGloss.has(sbGloss)) signs.set(word, { value: sbByGloss.get(sbGloss), rank: RANK.verified, specificity: 1000 });
  else console.warn(`pinned gloss ${sbGloss} not found`);
}

const aslOut = Object.fromEntries([...signs.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([g, v]) => [g, v.value]));
fs.writeFileSync(path.join(DATA, 'asl-signs.json'), JSON.stringify(aslOut, null, 0).replace(/","/g, '",\n"'));
const bySource = [...signs.values()].reduce((a, v) => ((a[v.value[0]] = (a[v.value[0]] || 0) + 1), a), {});
console.log(`asl-signs.json: ${signs.size} glosses`, bySource);

// ---------------------------------------------------------------------------
// Kinyarwanda from Wiktionary (CC BY-SA). Only kept when the English meaning has a sign.
const hasSign = (english) => english.split(' ').every((w) => signs.has(w)) || signs.has(english);
const words = {};
const verbs = {};
const SKIP_GLOSS = /^(plural of|singular of|alternative|obsolete|form of|class \d|causative|applicative|passive|reciprocal|reflexive|intensive|augmentative|diminutive|abbreviation|initialism|synonym)/i;
const lines = fs.readFileSync(path.join(RAW, 'rwanda-rundi.jsonl'), 'utf8').trim().split('\n');
for (const line of lines) {
  const entry = JSON.parse(line);
  if (!['noun', 'verb', 'adj', 'adv', 'intj', 'pron', 'num'].includes(entry.pos)) continue;
  const word = entry.word.toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '').replace(/^-/, '');
  if (!/^[a-z]+$/.test(word)) continue;
  for (const sense of entry.senses ?? []) {
    const tags = [...(sense.tags ?? []), ...(sense.raw_tags ?? [])].join(' ');
    const gloss = (sense.glosses ?? [])[0] ?? '';
    // Wiktionary mixes Kirundi-only meanings into Rwanda-Rundi entries (e.g. "ishuri" = "young bull").
    if (/kirundi|rundi/i.test(tags + gloss) || SKIP_GLOSS.test(gloss)) continue;
    const english = clean(gloss.split(/[,;(:]/)[0].replace(/^to\s+/i, '').replace(/^(a|an|the)\s+/i, ''));
    if (!english || english.split(' ').length > 2 || !hasSign(english)) continue;
    if (entry.pos === 'verb') {
      const infinitive = (/^[aeiu]/.test(word) ? 'kw' : /^o/.test(word) ? 'k' : /^[ptkfsch]/.test(word) ? 'gu' : 'ku') + word;
      verbs[infinitive] ??= english;
    } else {
      words[word] ??= english;
    }
    break;
  }
}
fs.writeFileSync(path.join(DATA, 'kinyarwanda-wiktionary.json'), JSON.stringify({ words, verbs }, null, 1));
console.log(`kinyarwanda-wiktionary.json: ${Object.keys(words).length} words, ${Object.keys(verbs).length} verbs`);
