'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/feedback';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await api.auth.forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to send reset email.'));
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/25">
          <MailCheck className="size-7" />
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">Check your email</h1>
        <p className="mt-3 text-muted">
          If an account exists for <span className="font-medium text-foreground">{email}</span>, we&apos;ve sent a link to reset
          your password.
        </p>
        <Button href="/login" size="lg" className="mt-8 w-full">
          <ArrowLeft />
          Back to sign in
        </Button>
        <button
          type="button"
          onClick={() => setSuccess(false)}
          className="mt-4 text-sm font-medium text-muted hover:text-foreground"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Reset your password</h1>
        <p className="mt-2 text-muted">Enter your email and we&apos;ll send you a reset link.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          icon={<Mail />}
        />

        {error && <Alert>{error}</Alert>}

        <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
          Send reset link
        </Button>
      </form>

      <Link
        href="/login"
        className="mt-8 flex items-center justify-center gap-2 text-sm font-medium text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to sign in
      </Link>
    </>
  );
}
