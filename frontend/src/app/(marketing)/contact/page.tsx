import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Mail, MapPin, MessageSquare, Phone } from 'lucide-react';
import { Reveal } from '@/components/marketing/reveal';
import { IconTile, PageHero, Section } from '@/components/marketing/sections';
import { ContactForm } from './contact-form';

export const metadata: Metadata = {
  title: 'Contact',
  description: "Have questions? We'd love to hear from you.",
};

const channels = [
  {
    icon: <Mail />,
    title: 'Email',
    lines: [
      { text: 'hello@amable.com', href: 'mailto:hello@amable.com' },
      { text: 'support@amable.com', href: 'mailto:support@amable.com' },
    ],
  },
  {
    icon: <Phone />,
    title: 'Phone',
    lines: [{ text: '+1 (555) 123-4567', href: 'tel:+15551234567' }, { text: 'Mon–Fri, 9am–6pm EST' }],
  },
  {
    icon: <MapPin />,
    title: 'Office',
    lines: [{ text: '123 Innovation Drive' }, { text: 'San Francisco, CA 94102' }],
  },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title={
          <>
            Let&apos;s <span className="text-gradient">talk</span>
          </>
        }
        description="Questions, feedback or partnership ideas — send us a message and we'll respond as soon as possible."
      />

      <Section className="pt-0 sm:pt-0">
        <div className="grid gap-8 lg:grid-cols-5">
          <Reveal className="space-y-4 lg:col-span-2">
            {channels.map((channel) => (
              <div key={channel.title} className="flex gap-4 rounded-2xl border border-border bg-surface p-5">
                <IconTile className="shrink-0">{channel.icon}</IconTile>
                <div>
                  <h2 className="font-semibold text-foreground">{channel.title}</h2>
                  {channel.lines.map((line) =>
                    'href' in line && line.href ? (
                      <a key={line.text} href={line.href} className="block text-sm text-muted hover:text-brand-600 dark:hover:text-brand-400">
                        {line.text}
                      </a>
                    ) : (
                      <p key={line.text} className="text-sm text-muted">
                        {line.text}
                      </p>
                    )
                  )}
                </div>
              </div>
            ))}

            <Link
              href="/faq"
              className="group flex items-center gap-4 rounded-2xl border border-brand-200 bg-brand-50 p-5 transition-colors hover:bg-brand-100 dark:border-brand-500/25 dark:bg-brand-500/10 dark:hover:bg-brand-500/15"
            >
              <MessageSquare className="size-5 shrink-0 text-brand-600 dark:text-brand-300" />
              <div className="flex-1">
                <p className="font-semibold text-foreground">Looking for quick answers?</p>
                <p className="text-sm text-muted">Browse our frequently asked questions.</p>
              </div>
              <ArrowRight className="size-4 text-brand-600 transition-transform group-hover:translate-x-0.5 dark:text-brand-300" />
            </Link>
          </Reveal>

          <Reveal delay={0.1} className="lg:col-span-3">
            <div className="rounded-3xl border border-border bg-surface p-6 shadow-xl shadow-slate-900/5 sm:p-8 dark:shadow-black/20">
              <h2 className="text-2xl font-semibold text-foreground">Send us a message</h2>
              <p className="mb-6 mt-1 text-sm text-muted">We usually reply within one business day.</p>
              <ContactForm />
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
