'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Mail, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/feedback';
import { PasswordInput } from '@/components/auth/password-input';
import { useAuthStore } from '@/store/auth-store';
import { useHydrated } from '@/lib/hooks';
import { api } from '@/lib/api';
import { cn, getErrorMessage } from '@/lib/utils';

function passwordStrength(password: string) {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

const strengthLabels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
const strengthColors = ['bg-red-500', 'bg-red-500', 'bg-amber-500', 'bg-lime-500', 'bg-emerald-500'];

export default function RegisterPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { setAuth, isAuthenticated } = useAuthStore();
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const strength = passwordStrength(formData.password);

  useEffect(() => {
    if (hydrated && isAuthenticated) router.replace('/dashboard');
  }, [hydrated, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const response = await api.auth.register(formData);
      setAuth(response.user, response.accessToken, response.refreshToken);
      router.replace('/dashboard');
    } catch (err) {
      setError(getErrorMessage(err, 'Registration failed. Please try again.'));
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Create your account</h1>
        <p className="mt-2 text-muted">Start translating in less than a minute. It&apos;s free.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Full name"
          placeholder="Jane Doe"
          autoComplete="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          icon={<User />}
        />
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          icon={<Mail />}
        />
        <div>
          <PasswordInput
            label="Password"
            placeholder="At least 6 characters"
            autoComplete="new-password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            minLength={6}
          />
          {formData.password && (
            <div className="mt-2 flex items-center gap-3" aria-live="polite">
              <div className="flex flex-1 gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className={cn('h-1 flex-1 rounded-full transition-colors', i <= strength ? strengthColors[strength] : 'bg-border')}
                  />
                ))}
              </div>
              <span className="w-16 text-right text-xs text-muted">{strengthLabels[strength]}</span>
            </div>
          )}
        </div>

        {error && <Alert>{error}</Alert>}

        <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
          {isLoading ? 'Creating account…' : 'Create account'}
          {!isLoading && <ArrowRight />}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">
          Sign in
        </Link>
      </p>
    </>
  );
}
