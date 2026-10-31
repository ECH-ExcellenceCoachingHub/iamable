// Download the Vosk speech models used for on-device recognition and repack them the way
// vosk-browser expects them: public/models/vosk-<lang>.tar.gz containing a `model/` folder.
// Skips models that already exist, so it is cheap to run before every build.
//
//   node scripts/vosk-models.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, '../public/models');

/** Must match VOSK_MODELS in src/lib/vosk.ts. */
const MODELS = {
  en: 'vosk-model-small-en-us-0.15',
  fr: 'vosk-model-small-fr-0.22',
};

const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: 'inherit' });

fs.mkdirSync(OUT, { recursive: true });

for (const [lang, name] of Object.entries(MODELS)) {
  const target = path.join(OUT, `vosk-${lang}.tar.gz`);
  if (fs.existsSync(target)) {
    console.log(`✓ ${path.basename(target)} already exists`);
    continue;
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vosk-'));
  try {
    console.log(`↓ ${name}`);
    const res = await fetch(`https://alphacephei.com/vosk/models/${name}.zip`);
    if (!res.ok) throw new Error(`Download of ${name} failed: ${res.status}`);
    fs.writeFileSync(path.join(tmp, 'model.zip'), Buffer.from(await res.arrayBuffer()));

    // unzip on Linux/macOS; Windows' built-in tar (bsdtar) also reads zip files
    try {
      run('unzip', ['-q', 'model.zip'], tmp);
    } catch {
      run('tar', ['-xf', 'model.zip'], tmp);
    }
    fs.renameSync(path.join(tmp, name), path.join(tmp, 'model'));
    // Relative paths only: GNU tar treats "C:\..." as a remote host
    run('tar', ['-czf', 'model.tar.gz', 'model'], tmp);
    fs.copyFileSync(path.join(tmp, 'model.tar.gz'), target);
    console.log(`✓ ${path.basename(target)} (${(fs.statSync(target).size / 1e6).toFixed(1)} MB)`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
