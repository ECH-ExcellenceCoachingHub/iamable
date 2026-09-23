import React from 'react';
import {
  ArrowRight,
  Brain,
  Building2,
  Camera,
  CheckCircle2,
  GraduationCap,
  Landmark,
  Mic,
  Sparkles,
  Stethoscope,
  Type,
  Volume2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/marketing/reveal';
import { CtaBanner, Eyebrow, IconTile, Section, SectionHeading } from '@/components/marketing/sections';

const stats = [
  { value: '99.2%', label: 'Recognition accuracy' },
  { value: '<150ms', label: 'Translation latency' },
  { value: '42', label: 'Sign languages' },
  { value: '125K+', label: 'People connected' },
];

const modes = [
  {
    icon: <Camera />,
    title: 'Sign to Text',
    description: 'Computer vision tracks hand shapes in real time and turns signs into readable text and natural speech.',
    tag: 'Camera',
    tone: 'from-brand-500 to-sky-500',
  },
  {
    icon: <Type />,
    title: 'Text to Sign',
    description: 'Type any message and see it fingerspelled sign-by-sign, with playback you can slow down and replay.',
    tag: 'Keyboard',
    tone: 'from-emerald-500 to-teal-500',
  },
  {
    icon: <Mic />,
    title: 'Voice to Sign',
    description: 'Speech recognition in Kinyarwanda, English and French, converted to sign language as you speak.',
    tag: 'Microphone',
    tone: 'from-violet-500 to-fuchsia-500',
  },
];

const steps = [
  { title: 'Choose a mode', description: 'Sign, speak or type — pick whatever is most natural for the conversation.' },
  { title: 'Communicate naturally', description: 'Am Able listens, watches and translates live, right in your browser.' },
  { title: 'Save what matters', description: 'Keep important translations in your history and replay them anytime.' },
];

const useCases = [
  { icon: <Building2 />, title: 'Workplaces', description: 'Inclusive meetings and everyday conversations between colleagues.' },
  { icon: <GraduationCap />, title: 'Education', description: 'Classrooms where every student can follow along and participate.' },
  { icon: <Stethoscope />, title: 'Healthcare', description: 'Clear, fast communication between patients and care providers.' },
  { icon: <Landmark />, title: 'Public services', description: 'Government information and services accessible to every citizen.' },
];

function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
      <div
        className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-tr from-brand-500/25 via-sky-400/15 to-accent-400/25 blur-2xl"
        aria-hidden="true"
      />
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl shadow-slate-900/10 dark:shadow-black/40">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span className="size-2.5 rounded-full bg-red-400" />
          <span className="size-2.5 rounded-full bg-amber-400" />
          <span className="size-2.5 rounded-full bg-emerald-400" />
          <span className="ml-3 text-xs font-medium text-subtle">Translation Studio</span>
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-5">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 sm:col-span-3">
            <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_1px_1px,#94a3b8_1px,transparent_0)] [background-size:18px_18px]" />
            <svg viewBox="0 0 200 150" className="absolute inset-0 size-full" aria-hidden="true">
              <g stroke="#599aff" strokeWidth="1.5" fill="none" strokeLinecap="round">
                <path d="M100 128 L88 100 L80 72 L76 50 L74 32" />
                <path d="M100 128 L98 96 L98 64 L98 40 L99 22" />
                <path d="M100 128 L108 98 L114 70 L118 50 L121 36" />
                <path d="M100 128 L116 104 L126 84 L132 70 L136 60" />
                <path d="M100 128 L82 116 L66 104 L56 94 L48 84" />
              </g>
              <g fill="#3aea80">
                {[
                  [100, 128], [88, 100], [80, 72], [76, 50], [74, 32], [98, 96], [98, 64], [98, 40], [99, 22],
                  [108, 98], [114, 70], [118, 50], [121, 36], [116, 104], [126, 84], [132, 70], [136, 60],
                  [82, 116], [66, 104], [56, 94], [48, 84],
                ].map(([cx, cy], i) => (
                  <circle key={i} cx={cx} cy={cy} r="2.6" />
                ))}
              </g>
            </svg>
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              <span className="size-1.5 animate-pulse rounded-full bg-white" /> Live
            </span>
          </div>
          <div className="flex flex-col gap-3 sm:col-span-2">
            <div className="flex-1 rounded-xl bg-surface-muted p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle">Detected</p>
              <p className="mt-1 font-display text-2xl font-bold text-foreground">muraho</p>
              <p className="text-sm text-muted">hello</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
                <div className="h-full w-[94%] rounded-full bg-gradient-to-r from-brand-500 to-accent-500" />
              </div>
              <p className="mt-1.5 text-xs text-subtle">94% confidence</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm text-muted">
              <Volume2 className="size-4 text-brand-500" /> Speaking aloud…
            </div>
          </div>
        </div>
      </div>
      <div className="animate-float absolute -bottom-5 -left-3 hidden items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-xl sm:flex">
        <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
          <CheckCircle2 className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">Runs in your browser</p>
          <p className="text-xs text-muted">No downloads required</p>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden pb-20 pt-28 sm:pt-36 lg:pb-28">
        <div className="bg-grid mask-fade-b pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[520px] w-[1000px] -translate-x-1/2 rounded-full bg-gradient-to-r from-brand-400/25 via-sky-400/15 to-accent-400/25 blur-3xl"
          aria-hidden="true"
        />
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-8">
          <Reveal className="text-center lg:text-left">
            <Eyebrow icon={<Sparkles />}>AI sign language translation</Eyebrow>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-5xl xl:text-6xl">
              Every conversation, <span className="text-gradient">understood.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted lg:mx-0">
              Am Able translates between sign language, text and speech in real time — so deaf, hard-of-hearing and
              hearing people can talk freely, anywhere.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Button href="/register" size="lg" variant="gradient" className="group">
                Start translating free
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Button>
              <Button href="/features" size="lg" variant="outline">
                See how it works
              </Button>
            </div>
            <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted lg:justify-start">
              {['Free plan available', 'No credit card required', 'Works on any webcam'].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-accent-600 dark:text-accent-400" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.15}>
            <HeroPreview />
          </Reveal>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-surface px-4 py-10 sm:px-6 lg:px-8">
        <dl className="mx-auto grid max-w-5xl grid-cols-2 gap-8 text-center md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col-reverse">
              <dt className="mt-1 text-sm text-muted">{stat.label}</dt>
              <dd className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Modes */}
      <Section>
        <SectionHeading
          eyebrow="Three ways to communicate"
          title="One app for signing, speaking and typing"
          description="Switch between modes instantly. Every translation happens live, with confidence scores you can trust."
        />
        <div className="grid gap-6 md:grid-cols-3">
          {modes.map((mode, i) => (
            <Reveal key={mode.title} delay={i * 0.08}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-border bg-surface p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5 dark:hover:shadow-black/30">
                <div
                  className={`absolute -right-10 -top-10 size-32 rounded-full bg-gradient-to-br ${mode.tone} opacity-10 blur-2xl transition-opacity group-hover:opacity-25`}
                  aria-hidden="true"
                />
                <div className={`flex size-12 items-center justify-center rounded-xl bg-gradient-to-br ${mode.tone} text-white shadow-lg [&_svg]:size-6`}>
                  {mode.icon}
                </div>
                <h3 className="mt-6 text-xl font-semibold text-foreground">{mode.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{mode.description}</p>
                <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-subtle">Uses your {mode.tag.toLowerCase()}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* How it works */}
      <Section muted>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">How it works</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              From gesture to meaning in milliseconds
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              Our models track 21 points on each hand, recognise the sign, and deliver the translation as text and speech —
              without sending your video anywhere.
            </p>
            <div className="mt-8 flex items-center gap-4 rounded-2xl border border-border bg-background p-5">
              <IconTile>
                <Brain />
              </IconTile>
              <div>
                <p className="font-semibold text-foreground">Always improving</p>
                <p className="text-sm text-muted">Community feedback helps the models get more accurate over time.</p>
              </div>
            </div>
          </Reveal>
          <ol className="space-y-4">
            {steps.map((step, i) => (
              <Reveal key={step.title} delay={i * 0.08}>
                <li className="flex gap-5 rounded-2xl border border-border bg-background p-6">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-600 font-display text-sm font-bold text-white dark:bg-brand-500">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-foreground">{step.title}</h3>
                    <p className="mt-1 text-muted">{step.description}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </Section>

      {/* Use cases */}
      <Section>
        <SectionHeading
          eyebrow="Built for real life"
          title="Accessible communication, everywhere it matters"
          description="Organisations of every size use Am Able to include deaf and hard-of-hearing people from day one."
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {useCases.map((useCase, i) => (
            <Reveal key={useCase.title} delay={i * 0.06}>
              <div className="h-full rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-brand-300 dark:hover:border-brand-500/40">
                <IconTile>{useCase.icon}</IconTile>
                <h3 className="mt-5 font-semibold text-foreground">{useCase.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{useCase.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <CtaBanner
        title="Ready to break the barrier?"
        description="Create a free account and start your first translation in under a minute."
        primary={{ href: '/register', label: 'Get started free' }}
        secondary={{ href: '/contact', label: 'Talk to our team' }}
      />
    </>
  );
}

export const metadata = {
  title: { absolute: 'Am Able — AI-Powered Sign Language Translation' },
};
