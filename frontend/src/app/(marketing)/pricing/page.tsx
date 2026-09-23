import type { Metadata } from 'next';
import { Headphones, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/marketing/reveal';
import { IconTile, PageHero, Section } from '@/components/marketing/sections';
import { PricingPlans } from './pricing-plans';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Simple, transparent pricing. Start free and upgrade when you need more.',
};

const guarantees = [
  { icon: <Zap />, title: 'Fast on every plan', description: 'Sub-150ms response time for everyone.' },
  { icon: <Shield />, title: 'Secure by default', description: 'Encryption in transit and at rest.' },
  { icon: <Headphones />, title: 'Real support', description: 'Priority help for Pro and Enterprise.' },
];

export default function PricingPage() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title={
          <>
            Simple, <span className="text-gradient">transparent</span> pricing
          </>
        }
        description="Choose the plan that fits your needs. No hidden fees, cancel anytime."
      />

      <Section className="pt-0 sm:pt-0">
        <PricingPlans />

        <div className="mt-20 grid gap-6 sm:grid-cols-3">
          {guarantees.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.06}>
              <div className="flex items-start gap-4">
                <IconTile className="shrink-0">{item.icon}</IconTile>
                <div>
                  <h3 className="font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted">{item.description}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section muted>
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Have questions?</h2>
          <p className="mt-3 text-lg text-muted">Check out our FAQ or talk to our team for more information.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button href="/faq" variant="outline" size="lg">
              Read the FAQ
            </Button>
            <Button href="/contact" size="lg">
              Contact sales
            </Button>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
