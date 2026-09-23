# Sign dictionary

Builds the data behind Text to Sign / Voice to Sign:

- `src/data/asl-signs.json`: English word or phrase → sign media (`L:` lifeprint.com path, `S:` ASL Signbank video path)
- `src/data/kinyarwanda-wiktionary.json`: extra Kinyarwanda → English words from Wiktionary

The hand-written Kinyarwanda dictionary is `src/data/kinyarwanda.ts`. Edit it directly; it takes priority over the Wiktionary data.

## Rebuild

```sh
node scripts/sign-dictionary/crawl-lifeprint.mjs   # ~2,300 pages, cached in .cache/
node scripts/sign-dictionary/crawl-signbank.mjs    # ~3,500 entries, cached in .cache/
curl -o scripts/sign-dictionary/raw/rwanda-rundi.jsonl \
  https://kaikki.org/dictionary/Rwanda-Rundi/kaikki.org-dictionary-RwandaRundi.jsonl
node scripts/sign-dictionary/build.mjs
```

Wrong sign for a word? Add it to `VERIFIED` (lifeprint path) or `SIGNBANK_PINNED` (Signbank gloss) in `build.mjs`, or to `SIGNBANK_SKIP_KEYWORDS` if Signbank attaches it to an unrelated sign.

## Sources and licenses

| Source | Used for | License |
| --- | --- | --- |
| [Lifeprint.com](https://www.lifeprint.com) (Dr. Bill Vicars) | Animated GIFs, fingerspelling | Copyright; linked, not copied |
| [ASL Signbank](https://aslsignbank.com) (Hochgesang, Crasborn & Lillo-Martin) | Sign videos | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/): attribution required, **no commercial use** without permission |
| [Wiktionary](https://en.wiktionary.org) via [kaikki.org](https://kaikki.org) | Kinyarwanda glosses | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |

All signs are American Sign Language, not Rwandan Sign Language.
