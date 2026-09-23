'use client';

import React, { useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/marketing/reveal';
import { cn } from '@/lib/utils';

const plans = [
  {
    name: 'Free',
    description: 'For individuals getting started',
    price: { monthly: 0, annual: 0 },
    features: ['100 translations per month', 'Sign to text', 'Standard accuracy', 'Community support', 'Web access'],
    cta: 'Get started free',
    href: '/register',
    popular: false,
  },
  {
    name: 'Pro',
    description: 'For professionals and small teams',
    price: { monthly: 29, annual: 24 },
    features: [
      'Unlimited translations',
      'All translation modes',
      'Highest accuracy models',
      'Priority support',
      'Desktop + mobile',
      'Custom vocabulary',
      'API access (10K calls/mo)',
    ],
    cta: 'Start Pro trial',
    href: '/register',
    popular: true,
  },
  {
    name: 'Enterprise',
    description: 'For large organisations',
    price: { monthly: 99, annual: 79 },
    features: [
      'Everything in Pro',
      'Unlimited API calls',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee',
      'On-premise deployment',
      'Advanced analytics',
    ],
    cta: 'Contact sales',
    href: '/contact',
    popular: false,
  },
];

export function PricingPlans() {
  const [annual, setAnnual] = useState(true);

  return (
    <>
      <div className="mb-12 flex justify-center">
        <div role="radiogroup" aria-label="Billing period" className="inline-flex rounded-full border border-border bg-surface p-1 shadow-xs">
          {[
            { value: false, label: 'Monthly' },
            { value: true, label: 'Annual' },
          ].map((option) => (
            <button
              key={option.label}
              type="button"
              role="radio"
              aria-checked={annual === option.value}
              onClick={() => setAnnual(option.value)}
              className={cn(
                'flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all',
                annual === option.value ? 'bg-slate-900 text-white shadow dark:bg-white dark:text-slate-900' : 'text-muted hover:text-foreground'
              )}
            >
              {option.label}
              {option.value && (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                    annual ? 'bg-accent-500 text-white' : 'bg-accent-100 text-accent-800 dark:bg-accent-500/15 dark:text-accent-300'
                  )}
                >
                  -20%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid items-stretch gap-6 lg:grid-cols-3">
        {plans.map((plan, i) => {
          const price = annual ? plan.price.annual : plan.price.monthly;
          return (
            <Reveal key={plan.name} delay={i * 0.08} className="h-full">
              <div
                className={cn(
                  'relative flex h-full flex-col rounded-3xl border p-8',
                  plan.popular
                    ? 'border-transparent bg-slate-950 text-white shadow-2xl shadow-brand-600/20 ring-2 ring-brand-500 dark:bg-slate-900'
                    : 'border-border bg-surface'
                )}
              >
                {plan.popular && (
                  <span className="bg-brand-gradient absolute -top-3.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-lg">
                    <Sparkles className="size-3.5" /> Most popular
                  </span>
                )}
                <h2 className={cn('text-lg font-semibold', plan.popular ? 'text-white' : 'text-foreground')}>{plan.name}</h2>
                <p className={cn('mt-1 text-sm', plan.popular ? 'text-slate-300' : 'text-muted')}>{plan.description}</p>
                <p className="mt-6 flex items-baseline gap-1">
                  <span className={cn('font-display text-5xl font-bold tracking-tight', plan.popular ? 'text-white' : 'text-foreground')}>
                    ${price}
                  </span>
                  <span className={cn('text-sm', plan.popular ? 'text-slate-400' : 'text-subtle')}>/ month</span>
                </p>
                <p className={cn('mt-1 h-5 text-xs', plan.popular ? 'text-slate-400' : 'text-subtle')}>
                  {price > 0 && (annual ? `Billed $${price * 12} yearly` : 'Billed monthly')}
                </p>
                <Button
                  href={plan.href}
                  variant={plan.popular ? 'gradient' : 'outline'}
                  size="lg"
                  className="mt-6 w-full"
                >
                  {plan.cta}
                </Button>
                <ul className="mt-8 space-y-3 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className={cn('mt-0.5 size-4 shrink-0', plan.popular ? 'text-accent-400' : 'text-accent-600 dark:text-accent-400')} />
                      <span className={plan.popular ? 'text-slate-200' : 'text-foreground'}>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          );
        })}
      </div>
    </>
  );
}
