'use client';

import React, { useRef, useState } from 'react';
import { Play, Stethoscope } from 'lucide-react';
import { PageHeader } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/input';
import { Alert } from '@/components/ui/feedback';
import { SPEECH_LANGUAGES } from '@/lib/speech';
import { cn } from '@/lib/utils';

type StepStatus = 'pending' | 'running' | 'pass' | 'warn' | 'fail';
type Step = { id: string; title: string; status: StepStatus; detail: string };

const STEPS: Omit<Step, 'status' | 'detail'>[] = [
  { id: 'browser', title: '1. Browser support' },
  { id: 'permission', title: '2. Microphone permission' },
  { id: 'devices', title: '3. Microphone devices' },
  { id: 'level', title: '4. Sound reaching the browser' },
  { id: 'recognition', title: '5. Speech recognition' },
];

const initialSteps = (): Step[] => STEPS.map((s) => ({ ...s, status: 'pending', detail: '' }));

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* eslint-disable @typescript-eslint/no-explicit-any */
const getRecognitionCtor = (): any => (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;

/** Diagnoses voice input step by step and reports the first step that fails. */
export default function VoiceTestPage() {
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [log, setLog] = useState<string[]>([]);
  const [verdict, setVerdict] = useState<{ tone: 'success' | 'danger' | 'warning'; text: string } | null>(null);
  const [running, setRunning] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [level, setLevel] = useState(0);
  const [lang, setLang] = useState('en-US');
  const t0 = useRef(0);

  const update = (id: string, status: StepStatus, detail: string) =>
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, status, detail } : s)));
  const addLog = (line: string) => setLog((prev) => [...prev, `${((performance.now() - t0.current) / 1000).toFixed(1)}s  ${line}`]);

  const run = async () => {
    setRunning(true);
    setSteps(initialSteps());
    setLog([]);
    setVerdict(null);
    t0.current = performance.now();
    const fail = (text: string) => setVerdict({ tone: 'danger', text });

    try {
      // 1. Browser
      update('browser', 'running', '');
      const Ctor = getRecognitionCtor();
      const isBrave = !!(await (navigator as any).brave?.isBrave?.().catch(() => false));
      const ua = navigator.userAgent;
      const browser = isBrave ? 'Brave' : /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Unknown';
      const info = `${browser} · secure context: ${window.isSecureContext} · online: ${navigator.onLine}`;
      addLog(`browser: ${info}`);
      addLog(`user agent: ${ua}`);
      if (!Ctor) {
        update('browser', 'fail', `${info}. This browser has no SpeechRecognition API.`);
        return fail('Your browser does not support speech recognition. Use Google Chrome or Microsoft Edge.');
      }
      if (!window.isSecureContext) {
        update('browser', 'fail', `${info}. The page must be served over https or localhost.`);
        return fail('The page is not a secure context (https/localhost), so the microphone is blocked.');
      }
      if (['Brave', 'Opera'].includes(browser)) {
        update('browser', 'warn', `${info}. ${browser} has the API but usually returns no results.`);
      } else {
        update('browser', 'pass', info);
      }

      // 2. Permission
      update('permission', 'running', 'Waiting for you to allow the microphone…');
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err: any) {
        update('permission', 'fail', `${err?.name}: ${err?.message}`);
        return fail(
          err?.name === 'NotAllowedError'
            ? 'Microphone access is blocked. Click the icon at the left of the address bar and allow the microphone.'
            : err?.name === 'NotFoundError'
              ? 'No microphone was found. Plug one in or enable it in Windows sound settings.'
              : `The microphone could not be opened (${err?.name}). Another app may be using it.`
        );
      }
      const track = stream.getAudioTracks()[0];
      update('permission', 'pass', `Granted. Browser opened: "${track?.label || 'unknown device'}"`);
      addLog(`getUserMedia track: ${track?.label} (muted: ${track?.muted}, enabled: ${track?.enabled})`);

      // 3. Devices
      update('devices', 'running', '');
      const inputs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'audioinput');
      inputs.forEach((d) => addLog(`input device: [${d.deviceId.slice(0, 12)}] ${d.label}`));
      const sysDefault = inputs.find((d) => d.deviceId === 'default');
      const defaultLabel = sysDefault?.label.replace(/^Default - /, '') ?? '(not reported)';
      const sameAsDefault = !sysDefault || (track?.label && sysDefault.label.includes(track.label));
      update(
        'devices',
        sameAsDefault ? 'pass' : 'warn',
        `${inputs.filter((d) => !['default', 'communications'].includes(d.deviceId)).length} microphone(s). Windows default: "${defaultLabel}".` +
          (sameAsDefault ? '' : ` This differs from the mic the browser opened. Speech recognition always uses the Windows default.`)
      );

      // 4. Level
      update('level', 'running', 'Speak now, for example count from one to five…');
      setPrompt('Speak now: count from one to five');
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      let peak = 0;
      const end = performance.now() + 5000;
      while (performance.now() < end) {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        peak = Math.max(peak, avg);
        setLevel(Math.min(100, avg * 1.2));
        await wait(50);
      }
      setLevel(0);
      setPrompt('');
      stream.getTracks().forEach((t) => t.stop());
      await ctx.close();
      addLog(`peak level: ${peak.toFixed(1)}`);
      if (peak < 3) {
        update('level', 'fail', `Peak level ${peak.toFixed(1)}: no sound at all.`);
        return fail(`No sound is reaching the browser from "${track?.label}". The mic is muted, too quiet, or the wrong device. Check Windows Settings → System → Sound → Input.`);
      }
      update('level', peak < 10 ? 'warn' : 'pass', `Peak level ${peak.toFixed(1)}${peak < 10 ? ' (very quiet)' : ''}.`);

      // 5. Recognition (mic stream is closed first so nothing competes with it)
      update('recognition', 'running', 'Speak now, for example "hello, how are you"…');
      setPrompt('Speak now: say "hello, how are you"');
      const seen = new Set<string>();
      let errorCode = '';
      let text = '';
      await new Promise<void>((resolve) => {
        const rec = new Ctor();
        rec.lang = lang;
        rec.continuous = true;
        rec.interimResults = true;
        for (const evt of ['start', 'audiostart', 'soundstart', 'speechstart', 'speechend', 'soundend', 'audioend', 'nomatch']) {
          rec.addEventListener(evt, () => {
            seen.add(evt);
            addLog(`recognition: ${evt}`);
          });
        }
        rec.onresult = (e: any) => {
          seen.add('result');
          const r = e.results[e.results.length - 1];
          text = r[0].transcript;
          addLog(`recognition: result${r.isFinal ? ' (final)' : ''} "${text}"`);
          if (r.isFinal) rec.stop();
        };
        rec.onerror = (e: any) => {
          errorCode = e.error;
          addLog(`recognition: error ${e.error}${e.message ? ` (${e.message})` : ''}`);
        };
        const timer = setTimeout(() => rec.stop(), 12000);
        rec.onend = () => {
          clearTimeout(timer);
          addLog('recognition: end');
          resolve();
        };
        try {
          rec.start();
        } catch (err: any) {
          addLog(`recognition: start() threw ${err?.name}`);
          resolve();
        }
      });
      setPrompt('');

      if (seen.has('result')) {
        update('recognition', 'pass', `Heard: "${text}"`);
        return setVerdict({
          tone: 'success',
          text: `Everything works in this test. If the Voice to Sign page still shows nothing, the problem is in that page's code, not your setup. Send the log below to the developer.`,
        });
      }
      const detail = `Events: ${[...seen].join(', ') || 'none'}${errorCode ? ` · error: ${errorCode}` : ''}`;
      update('recognition', 'fail', detail);
      if (errorCode === 'network' || (browser === 'Brave' && !errorCode))
        return fail(`The browser cannot reach its speech service (${browser}). Use Google Chrome or Edge, and turn off any VPN or firewall that blocks Google.`);
      if (errorCode === 'language-not-supported') return fail(`This browser cannot recognise ${lang}. Try English.`);
      if (errorCode === 'not-allowed' || errorCode === 'service-not-allowed') return fail('Speech recognition was blocked by the browser or an extension.');
      if (errorCode === 'audio-capture') return fail('Speech recognition could not open the microphone. Another app may be using it.');
      if (!seen.has('audiostart')) return fail('Speech recognition never started capturing audio. Restart the browser and try again.');
      if (!seen.has('soundstart'))
        return fail(
          `Step 4 heard you, but speech recognition heard only silence. It is listening to a different microphone: the Windows default input ("${defaultLabel}"). Set your real mic as default in Windows Settings → System → Sound → Input, then reload.`
        );
      return fail('Speech recognition heard you but returned no words. The speech service may be blocked (VPN, firewall, or browser), or the language does not match what you said.');
    } catch (err: any) {
      addLog(`unexpected error: ${err?.name}: ${err?.message}`);
      fail(`The test crashed: ${err?.message}`);
    } finally {
      setRunning(false);
      setPrompt('');
    }
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return (
    <>
      <PageHeader title="Voice input test" description="Checks each part of voice input in order and shows where it breaks." />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              <Stethoscope className="size-4 text-subtle" />
              Run the test
            </CardTitle>
            <CardDescription>Takes about 20 seconds. You&apos;ll be asked to speak twice.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Select label="Recognition language" value={lang} onChange={(e) => setLang(e.target.value)} disabled={running}>
              {SPEECH_LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </Select>
            <Button onClick={run} isLoading={running} className="w-full">
              {!running && <Play />}
              {running ? 'Testing…' : 'Start test'}
            </Button>

            {prompt && (
              <div className="space-y-2 rounded-xl bg-brand-50 p-4 text-sm font-medium text-brand-800 ring-1 ring-inset ring-brand-100 dark:bg-brand-500/10 dark:text-brand-200 dark:ring-brand-500/20">
                <p>{prompt}</p>
                <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                  <div className="h-full bg-emerald-500 transition-[width] duration-75" style={{ width: `${level}%` }} />
                </div>
              </div>
            )}

            {verdict && <Alert tone={verdict.tone}>{verdict.text}</Alert>}

            <ol className="space-y-3">
              {steps.map((s) => (
                <li key={s.id} className="flex gap-3 text-sm">
                  <span
                    className={cn(
                      'mt-1.5 size-2.5 shrink-0 rounded-full',
                      s.status === 'pass' && 'bg-emerald-500',
                      s.status === 'warn' && 'bg-amber-500',
                      s.status === 'fail' && 'bg-red-500',
                      s.status === 'running' && 'animate-pulse bg-brand-500',
                      s.status === 'pending' && 'bg-slate-400'
                    )}
                  />
                  <div>
                    <p className="font-medium text-foreground">{s.title}</p>
                    {s.detail && <p className="text-subtle">{s.detail}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Log</CardTitle>
            <CardDescription>Copy this if you need to report the problem.</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[32rem] min-h-40 overflow-auto whitespace-pre-wrap break-all rounded-xl border border-border bg-surface-muted/50 p-4 font-mono text-xs leading-relaxed text-foreground">
              {log.length ? log.join('\n') : 'The log appears here when you run the test.'}
            </pre>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
