'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Accessibility, KeyRound, LogOut, Mail, Palette, Save, User } from 'lucide-react';
import { PageHeader } from '@/components/layout/app-shell';
import { Avatar } from '@/components/layout/app-header';
import { ThemeSelector } from '@/components/layout/theme-toggle';
import { AccessibilityOptions } from '@/components/accessibility/accessibility-toolbar';
import { PasswordInput } from '@/components/auth/password-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth-store';
import { useAccessibilityStore, type AccessibilityPreferences } from '@/store/accessibility-store';
import { toast } from '@/store/toast-store';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';

function ProfileCard() {
  const { user, updateUser } = useAuthStore();
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const dirty = name.trim() !== (user?.name ?? '') && name.trim().length > 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirty) return;
    setSaving(true);
    try {
      // The API only accepts name/profileImage/password here; email is read-only
      await api.users.updateProfile({ name: name.trim() });
      updateUser({ name: name.trim() });
      toast.success('Profile updated');
    } catch (err) {
      toast.error('Could not update profile', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSave}>
        <CardHeader>
          <CardTitle>
            <User className="size-4 text-subtle" />
            Profile
          </CardTitle>
          <CardDescription>Your personal information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar name={name || user?.name} className="size-14 text-lg" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{user?.name}</p>
              <p className="truncate text-sm text-muted">{user?.email}</p>
            </div>
            <Badge tone={user?.role === 'admin' ? 'violet' : 'neutral'} className="ml-auto">
              {user?.role ?? 'user'}
            </Badge>
          </div>
          <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
          <Input
            label="Email address"
            value={user?.email ?? ''}
            icon={<Mail />}
            disabled
            hint="Contact support if you need to change your email address."
          />
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={!dirty} isLoading={saving}>
            {!saving && <Save />}
            Save changes
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function PasswordCard() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const mismatch = confirm.length > 0 && password !== confirm;
  const tooShort = password.length > 0 && password.length < 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tooShort || mismatch || !password) return;
    setSaving(true);
    try {
      await api.users.updateProfile({ password });
      setPassword('');
      setConfirm('');
      toast.success('Password updated');
    } catch (err) {
      toast.error('Could not update password', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>
            <KeyRound className="size-4 text-subtle" />
            Password
          </CardTitle>
          <CardDescription>Use at least 6 characters.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <PasswordInput
            label="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            error={tooShort ? 'Password must be at least 6 characters.' : undefined}
          />
          <PasswordInput
            label="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            error={mismatch ? "Passwords don't match." : undefined}
          />
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={!password || !confirm || mismatch || tooShort} isLoading={saving}>
            Update password
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const resetPreferences = useAccessibilityStore((s) => s.resetPreferences);

  const syncAccessibility = (prefs: AccessibilityPreferences) => {
    // Stored locally first; syncing to the account is best-effort
    api.users.updateAccessibility({ ...prefs }).catch(() => {});
  };

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <>
      <PageHeader title="Settings" description="Manage your account, appearance and accessibility preferences." />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <ProfileCard />
          <PasswordCard />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                <Palette className="size-4 text-subtle" />
                Appearance
              </CardTitle>
              <CardDescription>Choose how Am Able looks on this device.</CardDescription>
            </CardHeader>
            <CardContent>
              <ThemeSelector />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>
                  <Accessibility className="size-4 text-subtle" />
                  Accessibility
                </CardTitle>
                <CardDescription className="mt-1">Changes apply instantly across the app.</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  resetPreferences();
                  syncAccessibility(useAccessibilityStore.getState().preferences);
                }}
              >
                Reset
              </Button>
            </CardHeader>
            <CardContent className="px-3 sm:px-3">
              <AccessibilityOptions onChange={syncAccessibility} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <LogOut className="size-4 text-subtle" />
                Session
              </CardTitle>
              <CardDescription>Sign out of Am Able on this device.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={handleLogout} className="text-red-600 hover:text-red-700 dark:text-red-400">
                <LogOut />
                Sign out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
