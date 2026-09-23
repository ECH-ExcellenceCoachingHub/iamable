'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/feedback';
import { PasswordInput } from '@/components/auth/password-input';
import { useAuthStore } from '@/store/auth-store';
import { useHydrated } from '@/lib/hooks';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';

/** Only allow redirects to in-app paths. */
function safeNext(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hydrated = useHydrated();
  const { setAuth, isAuthenticated } = useAuthStore();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const expired = searchParams.get('expired') === '1';
  const next = safeNext(searchParams.get('next'));

  useEffect(() => {
    if (hydrated && isAuthenticated) router.replace(next);
  }, [hydrated, isAuthenticated, next, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const response = await api.auth.login(formData);
      setAuth(response.user, response.accessToken, response.refreshToken);
      router.replace(next);
    } catch (err) {
      setError(getErrorMessage(err, 'Sign in failed. Please try again.'));
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome back</h1>
        <p className="mt-2 text-muted">Sign in to continue translating.</p>
      </div>

      {expired && !error && (
        <Alert tone="info" className="mb-5">
          Your session has expired. Please sign in again.
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
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
            placeholder="Enter your password"
            autoComplete="current-password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />
          <div className="mt-2 text-right">
            <Link href="/forgot-password" className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">
              Forgot password?
            </Link>
          </div>
        </div>

        {error && <Alert>{error}</Alert>}

        <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
          {isLoading ? 'Signing in…' : 'Sign in'}
          {!isLoading && <ArrowRight />}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">
          Create one
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
