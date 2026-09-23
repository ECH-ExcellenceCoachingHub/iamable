import React from 'react';
import { Reveal } from '@/components/marketing/reveal';
import { Eyebrow } from '@/components/marketing/sections';

export interface LegalSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

interface LegalDocumentProps {
  eyebrow: string;
  icon: React.ReactNode;
  title: string;
  updated: string;
  sections: LegalSection[];
}

export const LegalDocument = ({ eyebrow, icon, title, updated, sections }: LegalDocumentProps) => (
  <div className="relative isolate">
    <div className="bg-grid mask-fade-b pointer-events-none absolute inset-x-0 top-0 -z-10 h-96" aria-hidden="true" />
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-32 sm:px-6 sm:pt-40 lg:px-8">
      <Reveal className="max-w-3xl">
        <Eyebrow icon={icon}>{eyebrow}</Eyebrow>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">{title}</h1>
        <p className="mt-4 text-muted">Last updated: {updated}</p>
      </Reveal>

      <div className="mt-14 grid gap-12 lg:grid-cols-[220px_1fr]">
        <nav aria-label="On this page" className="hidden lg:block">
          <div className="sticky top-24">
            <p className="text-xs font-semibold uppercase tracking-wider text-subtle">On this page</p>
            <ul className="mt-4 space-y-1 border-l border-border">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="-ml-px block border-l border-transparent py-1.5 pl-4 text-sm text-muted transition-colors hover:border-brand-500 hover:text-foreground"
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <article className="max-w-3xl space-y-12">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="flex items-baseline gap-3 text-xl font-semibold text-foreground">
                <span className="font-mono text-sm text-subtle">{String(i + 1).padStart(2, '0')}</span>
                {s.title}
              </h2>
              <div className="mt-4 space-y-4 leading-relaxed text-muted [&_li]:pl-1 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_ul]:marker:text-brand-500">
                {s.body}
              </div>
            </section>
          ))}
        </article>
      </div>
    </div>
  </div>
);
