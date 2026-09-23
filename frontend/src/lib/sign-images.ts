import ASL_SIGNS from '@/data/asl-signs.json';
import KINYARWANDA_EXTRA from '@/data/kinyarwanda-wiktionary.json';
import {
  ENGLISH_FIRST,
  KINYARWANDA_COPULA,
  KINYARWANDA_PERFECTIVE,
  KINYARWANDA_VERBS,
  KINYARWANDA_WORDS,
} from '@/data/kinyarwanda';

/**
 * Sign media sources. Entries in asl-signs.json are "<source>:<path>", built by
 * scripts/sign-dictionary/build.mjs from lifeprint.com and ASL Signbank.
 */
const SOURCES = {
  L: 'https://www.lifeprint.com/asl101/',
  S: 'https://aslsignbank.com/dictionary/protected_media/glossvideo/',
} as const;
const FINGERSPELLING = `${SOURCES.L}fingerspelling/abc-gifs`;
const SIGNS = ASL_SIGNS as Record<string, string>;

export type SignFrame =
  /** One fingerspelled character (A–Z or a digit). */
  | { kind: 'letter'; char: string; imageUrl: string | null }
  /** A whole word shown as one sign. `source` is the text as typed when it differs from the sign's gloss. */
  | { kind: 'word'; word: string; source?: string; mediaUrl: string; mediaType: 'gif' | 'video' | 'image' }
  /** Gap between words. */
  | { kind: 'space' };

export type SignLanguageHint = 'auto' | 'en' | 'rw';

// ---------------------------------------------------------------------------
// English

/** Function words ASL normally leaves out. */
const ENGLISH_DROP = new Set(['a', 'an', 'the', 'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'to', 'of']);

const IRREGULAR: Record<string, string> = {
  went: 'go', gone: 'go', ate: 'eat', eaten: 'eat', drank: 'drink', drunk: 'drink', slept: 'sleep', ran: 'run',
  sat: 'sit', stood: 'stand', came: 'come', gave: 'give', given: 'give', took: 'take', taken: 'take', made: 'make',
  did: 'do', done: 'do', had: 'have', has: 'have', said: 'say', told: 'tell', knew: 'know', known: 'know',
  thought: 'think', felt: 'feel', got: 'get', bought: 'buy', sold: 'sell', wrote: 'write', written: 'write',
  spoke: 'speak', spoken: 'speak', met: 'meet', taught: 'teach', brought: 'bring', understood: 'understand',
  forgot: 'forget', forgotten: 'forget', began: 'begin', begun: 'begin', drove: 'drive', driven: 'drive',
  found: 'find', heard: 'hear', lost: 'lose', paid: 'pay', sent: 'send', won: 'win', flew: 'fly', fell: 'fall',
  kept: 'keep', left: 'leave', saw: 'see', seen: 'see', swam: 'swim', sang: 'sing', sung: 'sing', wore: 'wear',
  worn: 'wear', chose: 'choose', broke: 'break', broken: 'break', caught: 'catch', fought: 'fight', built: 'build',
  cried: 'cry', tried: 'try', married: 'marry', studied: 'study', better: 'good', best: 'good', worse: 'bad',
  worst: 'bad', children: 'child', men: 'man', women: 'woman', feet: 'foot', teeth: 'tooth', mice: 'mouse',
  people: 'people', mom: 'mother', mum: 'mother', dad: 'father', kids: 'children', ok: 'okay', thanks: 'thank you',
  hi: 'hello', hey: 'hello', bye: 'goodbye', tv: 'television', pls: 'please', plz: 'please', u: 'you', ur: 'your',
  im: 'i', ive: 'i have', dont: "don't", cant: "can't", wont: "won't", didnt: "didn't", isnt: 'not', doesnt: "doesn't",
};

/** Base forms to try for an inflected English word, most likely first. */
function englishLemmas(word: string): string[] {
  const out: string[] = [];
  const add = (w: string) => {
    if (w.length > 1 && !out.includes(w)) out.push(w);
  };
  if (IRREGULAR[word]) add(IRREGULAR[word]);
  if (word.endsWith("'s")) add(word.slice(0, -2));
  if (word.endsWith('ies')) add(word.slice(0, -3) + 'y');
  if (word.endsWith('ves')) {
    add(word.slice(0, -3) + 'f');
    add(word.slice(0, -3) + 'fe');
  }
  if (word.endsWith('es')) add(word.slice(0, -2));
  if (word.endsWith('s') && !word.endsWith('ss')) add(word.slice(0, -1));
  for (const suffix of ['ing', 'ed']) {
    if (!word.endsWith(suffix) || word.length < suffix.length + 3) continue;
    const stem = word.slice(0, -suffix.length);
    add(stem);
    add(stem + 'e');
    if (/(.)\1$/.test(stem)) add(stem.slice(0, -1));
    if (suffix === 'ed' && stem.endsWith('i')) add(stem.slice(0, -1) + 'y');
  }
  if (word.endsWith('ly') && word.length > 4) {
    add(word.slice(0, -2));
    add(word.slice(0, -3) + 'y');
  }
  if (word.endsWith('er') && word.length > 4) {
    add(word.slice(0, -2));
    add(word.slice(0, -1));
  }
  return out;
}

/** Split an English contraction into signable words, e.g. "can't" → ["can't"] or ["can", "not"]. */
function expandContraction(word: string): string[] | null {
  if (!word.includes("'")) return null;
  if (SIGNS[word]) return [word];
  const neg = word.match(/^(.+)n't$/);
  if (neg) return [{ ca: 'can', wo: 'will', sha: 'shall' }[neg[1]] ?? neg[1], 'not'];
  const m = word.match(/^(.+)'(re|m|s|ll|ve|d)$/);
  if (m) return [m[1], ...(m[2] === 'll' ? ['will'] : m[2] === 've' ? ['have'] : [])];
  return [word.replace(/'/g, '')];
}

function mediaFor(gloss: string): Pick<Extract<SignFrame, { kind: 'word' }>, 'mediaUrl' | 'mediaType'> | null {
  const entry = SIGNS[gloss];
  if (!entry) return null;
  const path = entry.slice(2);
  const mediaUrl = SOURCES[entry[0] as keyof typeof SOURCES] + path;
  const mediaType = path.endsWith('.mp4') ? 'video' : path.startsWith('images-signs/') ? 'image' : 'gif';
  return { mediaUrl, mediaType };
}

/** Find the sign gloss for an English word or phrase, trying base forms of single words. */
function englishSign(phrase: string): string | null {
  if (SIGNS[phrase]) return phrase;
  if (phrase.includes(' ')) return null;
  for (const lemma of englishLemmas(phrase)) if (SIGNS[lemma]) return lemma;
  return null;
}

// ---------------------------------------------------------------------------
// Kinyarwanda

const KIN_WORDS: Record<string, string> = { ...KINYARWANDA_EXTRA.words, ...KINYARWANDA_WORDS };
const KIN_VERBS: Record<string, string> = { ...KINYARWANDA_EXTRA.verbs, ...KINYARWANDA_VERBS };

/** Verb roots ("shak" from "gushaka") with their English meaning, longest first so the best match wins. */
const VERB_ROOTS: [string, string][] = Object.entries(KIN_VERBS)
  .map(([infinitive, english]): [string, string] => [infinitive.replace(/^(ku|gu|kw|k(?=o))/, '').replace(/a$/, ''), english])
  .filter(([root]) => root.length >= 2)
  .sort((a, b) => b[0].length - a[0].length);
const PERFECTIVE_ROOTS = Object.entries(KINYARWANDA_PERFECTIVE).sort((a, b) => b[0].length - a[0].length);

/** Negation + subject + tense + object prefixes that can come before a verb root. */
const VERB_PREFIX =
  /^(?:nti|si|nta)?(?:n|m|u|a|tu|mu|ba|i|bi|ki|ri|zi|ru|ka|bu|ku|y|w|nd|ng|nk|mb|mp|nt|tw|mw|by|cy)?(?:ra|a|za|zaa|ka|ki|ri|ari|aa|ta|ga|ho|no|kwi|iy)?(?:mu|ku|gu|ba|bi|n|m|tu|ki|ri|zi|ha|bu|yi|wu|mw|y|w|b|bi|ki|zi|ri|ku|twi|mwi|ki|zi)?$/;
const VERB_ENDINGS = ['a', 'e', 'aga', 'ga', 'ye', 'we', 'wa', 'ira', 'ire', 'ra', 'ana', 'isha'];

/** Singular and augment variants for a Kinyarwanda noun: "abana" → "umwana", "muntu" → "umuntu". */
function kinyarwandaNounForms(word: string): string[] {
  const forms: string[] = [];
  const rules: [RegExp, string][] = [
    [/^aba/, 'umu'], [/^ab(?=[aeiou])/, 'umw'], [/^ibi/, 'iki'], [/^iby/, 'icy'], [/^imi/, 'umu'], [/^imy/, 'umw'],
    [/^ama/, 'i'], [/^ama/, 'iri'], [/^utu/, 'aka'], [/^(kw|mw)(?=i)/, ''], [/^(mu|ku)(?=[^aeiou])/, 'u'],
  ];
  for (const [re, rep] of rules) if (re.test(word)) forms.push(word.replace(re, rep));
  if (/^[^aeiou]/.test(word)) forms.push('u' + word, 'i' + word, 'a' + word);
  return forms;
}

function kinyarwandaWord(word: string): string | null {
  if (word in KIN_WORDS) return KIN_WORDS[word];
  if (word in KIN_VERBS) return KIN_VERBS[word];
  if (KINYARWANDA_COPULA.has(word)) return '';
  for (const form of kinyarwandaNounForms(word)) if (form in KIN_WORDS) return KIN_WORDS[form];
  // Past tense: "nagiye" = n + a + giye
  for (const [root, english] of PERFECTIVE_ROOTS) {
    if (word.endsWith(root) && word.length > root.length && VERB_PREFIX.test(word.slice(0, -root.length))) return english;
  }
  for (const [root, english] of VERB_ROOTS) {
    const at = word.lastIndexOf(root);
    if (at < 0) continue;
    const prefix = word.slice(0, at);
    // Two-letter roots ("ry" in "turarya") only count after a tense marker, or they'd match too much.
    if (root.length < 3 && !/(ra|za|aa)$/.test(prefix)) continue;
    if (VERB_ENDINGS.includes(word.slice(at + root.length)) && VERB_PREFIX.test(prefix)) return english;
  }
  return null;
}

/** Guess whether text is mainly Kinyarwanda, from words only one of the two languages knows. */
function looksKinyarwanda(words: string[]): boolean {
  let rw = 0;
  let en = 0;
  for (const w of words) {
    const isEnglish = !!englishSign(w) || ENGLISH_DROP.has(w);
    const isKinyarwanda = kinyarwandaWord(w) != null;
    if (isKinyarwanda && !isEnglish) rw++;
    if (isEnglish && !isKinyarwanda) en++;
  }
  return rw > en;
}

// ---------------------------------------------------------------------------
// Text → frames

function spell(word: string): SignFrame[] {
  return [...word.replace(/'/g, '')].map((ch) =>
    /[a-z]/.test(ch)
      ? { kind: 'letter', char: ch.toUpperCase(), imageUrl: `${FINGERSPELLING}/${ch}.gif` }
      : // Digits have no image in this set; show them as a styled character.
        { kind: 'letter', char: ch, imageUrl: null }
  );
}

function wordFrame(gloss: string, source?: string): SignFrame {
  return { kind: 'word', word: gloss, ...(source && source !== gloss ? { source } : {}), ...mediaFor(gloss)! };
}

/** Sign an English string (no Kinyarwanda lookup), fingerspelling words without a sign. */
function englishUnits(text: string, source?: string): SignFrame[][] {
  const words = text.split(' ').flatMap((w) => expandContraction(w) ?? [w]);
  const units: SignFrame[][] = [];
  for (let i = 0; i < words.length; i++) {
    let matched = false;
    for (let n = Math.min(3, words.length - i); n >= 1 && !matched; n--) {
      // Multi-word signs like "a little bit" win, but on its own a filler word is left out.
      if (n === 1 && words.length > 1 && ENGLISH_DROP.has(words[i])) {
        matched = true;
        break;
      }
      const phrase = words.slice(i, i + n).join(' ');
      const gloss = englishSign(phrase);
      if (gloss) {
        // A Kinyarwanda word signed as several English signs is labelled once, on the first sign.
        units.push([wordFrame(gloss, source === undefined ? phrase : units.length ? undefined : source)]);
        i += n - 1;
        matched = true;
      }
    }
    if (!matched) units.push(spell(words[i]));
  }
  return units;
}

/**
 * Convert English or Kinyarwanda text into sign frames. Known words and phrases (including
 * inflected forms like "eating" or "ndashaka") become whole-word signs; anything else is
 * fingerspelled letter by letter.
 */
export function textToSignFrames(text: string, hint: SignLanguageHint = 'auto'): SignFrame[] {
  const words = text
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[^a-z0-9'\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^'+|'+$/g, ''))
    .filter(Boolean);
  const units: SignFrame[][] = [];

  const tryEnglish = (i: number): number => {
    for (let n = Math.min(3, words.length - i); n >= 1; n--) {
      if (n === 1 && words.length > 1 && ENGLISH_DROP.has(words[i])) return 1;
      const phrase = words.slice(i, i + n).join(' ');
      if (englishSign(phrase)) {
        units.push(...englishUnits(phrase));
        return n;
      }
    }
    const contraction = expandContraction(words[i]);
    if (contraction && contraction.some((w) => englishSign(w))) {
      units.push(...englishUnits(contraction.join(' ')));
      return 1;
    }
    return 0;
  };

  const tryKinyarwanda = (i: number): number => {
    for (let n = Math.min(3, words.length - i); n >= 1; n--) {
      const phrase = words.slice(i, i + n).join(' ');
      const english = n === 1 ? kinyarwandaWord(phrase) : KIN_WORDS[phrase];
      if (english == null) continue;
      if (english) units.push(...englishUnits(english, phrase));
      return n;
    }
    return 0;
  };

  const preferKinyarwanda = hint === 'rw' || (hint === 'auto' && looksKinyarwanda(words));
  for (let i = 0; i < words.length; ) {
    const word = words[i];
    const kinyarwandaFirst = preferKinyarwanda && !ENGLISH_FIRST.has(word);
    const used = kinyarwandaFirst
      ? tryKinyarwanda(i) || tryEnglish(i)
      : tryEnglish(i) || (hint === 'en' ? 0 : tryKinyarwanda(i));
    if (used) {
      i += used;
    } else {
      units.push(spell(word));
      i++;
    }
  }

  return units.flatMap((unit, i) => (i ? [{ kind: 'space' } as SignFrame, ...unit] : unit));
}

/** Fingerspell text letter by letter, ignoring the sign dictionary. */
export function fingerspellFrames(text: string): SignFrame[] {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  return words.flatMap((word, i) => (i ? [{ kind: 'space' } as SignFrame, ...spell(word)] : spell(word)));
}

/** The whole-word sign for an English gloss, or null if the dictionary has none. */
export function signForWord(gloss: string): Extract<SignFrame, { kind: 'word' }> | null {
  const key = gloss.toLowerCase();
  return SIGNS[key] ? (wordFrame(key) as Extract<SignFrame, { kind: 'word' }>) : null;
}

/** Short human summary, e.g. "3 word signs, 2 fingerspelled words". */
export function describeFrames(frames: SignFrame[]): string {
  let signed = 0;
  let spelled = 0;
  frames.forEach((f, i) => {
    if (f.kind === 'word') signed++;
    else if (f.kind === 'letter' && (i === 0 || frames[i - 1].kind === 'space')) spelled++;
  });
  const parts = [];
  if (signed) parts.push(`${signed} word sign${signed === 1 ? '' : 's'}`);
  if (spelled) parts.push(`${spelled} fingerspelled word${spelled === 1 ? '' : 's'}`);
  return parts.join(', ');
}

/** Number of distinct ASL signs the dictionary knows. */
export const SIGN_COUNT = Object.keys(SIGNS).length;

/** Every sign in the dictionary, alphabetically. */
export const SIGN_GLOSSES = Object.keys(SIGNS).sort();
