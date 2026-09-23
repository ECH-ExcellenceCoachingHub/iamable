import React from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/marketing/reveal';

export const Eyebrow = ({ icon, children, className }: { icon?: React.ReactNode; children: React.ReactNode; className?: string }) => (
  <span
    className={cn(
      'inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700',
      'dark:border-brand-500/25 dark:bg-brand-500/10 dark:text-brand-300 [&_svg]:size-3.5',
      className
    )}
  >
    {icon}
    {children}
  </span>
);

interface PageHeroProps {
  eyebrow?: string;
  eyebrowIcon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
}

/** Top-of-page hero used by all secondary marketing pages. */
export const PageHero = ({ eyebrow, eyebrowIcon, title, description, children }: PageHeroProps) => (
  <section className="relative isolate overflow-hidden pb-14 pt-32 sm:pb-20 sm:pt-40">
    <div className="bg-grid mask-fade-b pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
    <div
      className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-gradient-to-r from-brand-400/20 via-sky-400/15 to-accent-400/20 blur-3xl"
      aria-hidden="true"
    />
    <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
      <Reveal>
        {eyebrow && <Eyebrow icon={eyebrowIcon}>{eyebrow}</Eyebrow>}
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">{title}</h1>
        {description && <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted">{description}</p>}
        {children}
      </Reveal>
    </div>
  </section>
);

export const SectionHeading = ({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}) => (
  <Reveal className={cn('mx-auto mb-12 max-w-2xl text-center sm:mb-16', className)}>
    {eyebrow && <p className="text-sm font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">{eyebrow}</p>}
    <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{title}</h2>
    {description && <p className="mt-4 text-lg leading-relaxed text-muted">{description}</p>}
  </Reveal>
);

export const Section = ({ children, className, muted }: { children: React.ReactNode; className?: string; muted?: boolean }) => (
  <section className={cn('px-4 py-20 sm:px-6 sm:py-24 lg:px-8', muted && 'border-y border-border bg-surface', className)}>
    <div className="mx-auto max-w-7xl">{children}</div>
  </section>
);

interface CtaBannerProps {
  title: string;
  description: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
}

export const CtaBanner = ({ title, description, primary, secondary }: CtaBannerProps) => (
  <section className="px-4 pb-24 sm:px-6 lg:px-8">
    <Reveal className="mx-auto max-w-5xl">
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-14 text-center shadow-2xl sm:px-16 sm:py-20">
        <div className="bg-brand-gradient absolute inset-0 opacity-90" aria-hidden="true" />
        <div
          className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]"
          aria-hidden="true"
        />
        <div className="absolute -right-24 -top-24 size-72 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
        <div className="relative">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/85">{description}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button href={primary.href} variant="white" size="lg" className="group">
              {primary.label}
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </Button>
            {secondary && (
              <Button
                href={secondary.href}
                size="lg"
                variant="ghost"
                className="text-white ring-1 ring-inset ring-white/30 hover:bg-white/10 hover:text-white"
              >
                {secondary.label}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Reveal>
  </section>
);

export const IconTile = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div
    className={cn(
      'flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100',
      'dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/20 [&_svg]:size-6',
      className
    )}
  >
    {children}
  </div>
);
