'use client';

import React, { useCallback, useState } from 'react';
import { Check, Copy, Eye, EyeOff, KeyRound, Pencil, RefreshCw } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ErrorState, Skeleton } from '@/components/ui/feedback';
import { Avatar } from '@/components/layout/app-header';
import { toast } from '@/store/toast-store';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { formatDate, formatRelativeTime, getErrorMessage } from '@/lib/utils';
import { AdminUser, AdminUserDetails, generatePassword, isActive } from './types';

// ---------------------------------------------------------------------------
// Details
// ---------------------------------------------------------------------------

const PREFERENCE_LABELS: Record<string, string> = {
  largeText: 'Large text',
  highContrast: 'High contrast',
  reducedMotion: 'Reduced motion',
  keyboardNavigation: 'Keyboard navigation',
  screenReader: 'Screen reader',
};

export function UserStatusBadges({ user }: { user: AdminUser }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge tone={user.role === 'admin' ? 'violet' : 'neutral'}>{user.role}</Badge>
      {isActive(user) ? (
        <Badge tone="success" dot>
          Active
        </Badge>
      ) : (
        <Badge tone="danger" dot>
          Suspended
        </Badge>
      )}
      {user.isEmailVerified ? <Badge tone="brand">Verified</Badge> : <Badge tone="warning">Unverified</Badge>}
    </div>
  );
}

const DetailRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4 py-2.5">
    <dt className="text-sm text-muted">{label}</dt>
    <dd className="text-right text-sm font-medium text-foreground">{children}</dd>
  </div>
);

interface UserDetailsModalProps {
  userId: string | null;
  onClose: () => void;
  onEdit: (user: AdminUser) => void;
  onResetPassword: (user: AdminUser) => void;
}

export function UserDetailsModal({ userId, onClose, onEdit, onResetPassword }: UserDetailsModalProps) {
  const fetchUser = useCallback(async () => (userId ? ((await api.admin.getUserById(userId)) as AdminUserDetails) : null), [userId]);
  const { data: user, loading, error, reload } = useApi(fetchUser, 'Could not load this user.');

  return (
    <Modal
      isOpen={!!userId}
      onClose={onClose}
      title="User details"
      size="lg"
      footer={
        user && (
          <>
            <Button variant="outline" onClick={() => onResetPassword(user)}>
              <KeyRound />
              Reset password
            </Button>
            <Button onClick={() => onEdit(user)}>
              <Pencil />
              Edit user
            </Button>
          </>
        )
      }
    >
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading || !user ? (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="size-14 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
          </div>
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar name={user.name} className="size-14 text-lg" />
            <div className="min-w-0 space-y-1.5">
              <p className="truncate text-lg font-semibold text-foreground">{user.name}</p>
              <p className="truncate text-sm text-muted">{user.email}</p>
              <UserStatusBadges user={user} />
            </div>
          </div>

          {!isActive(user) && user.suspendedReason && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
              <span className="font-medium">Suspension reason:</span> {user.suspendedReason}
            </p>
          )}

          {user.activity && (
            <div className="grid grid-cols-3 gap-3">
              {[
                ['Translations', user.activity.translations],
                ['Saved items', user.activity.savedItems],
                ['Reports', user.activity.reports],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-border p-3 text-center">
                  <p className="text-xl font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted">{label}</p>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-6 sm:grid-cols-2">
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-subtle">Account</h3>
              <dl className="divide-y divide-border">
                <DetailRow label="User ID">
                  <code className="text-xs">{user._id}</code>
                </DetailRow>
                <DetailRow label="Joined">{formatDate(user.createdAt)}</DetailRow>
                <DetailRow label="Last sign-in">{user.lastLoginAt ? formatRelativeTime(user.lastLoginAt) : 'Never'}</DetailRow>
                <DetailRow label="Last updated">{user.updatedAt ? formatRelativeTime(user.updatedAt) : '—'}</DetailRow>
              </dl>
            </section>
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-subtle">Accessibility preferences</h3>
              <dl className="divide-y divide-border">
                {Object.entries(PREFERENCE_LABELS).map(([key, label]) => (
                  <DetailRow key={key} label={label}>
                    {user.accessibilityPreferences?.[key as keyof NonNullable<AdminUserDetails['accessibilityPreferences']>] ? (
                      <Badge tone="success">On</Badge>
                    ) : (
                      <Badge>Off</Badge>
                    )}
                  </DetailRow>
                ))}
              </dl>
            </section>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Reset password
// ---------------------------------------------------------------------------

interface ResetPasswordModalProps {
  user: AdminUser | null;
  onClose: () => void;
}

/** Give it a new `key` each time it opens so the password field starts empty. */
export function ResetPasswordModal({ user, onClose }: ResetPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setSaving(true);
    try {
      await api.admin.resetUserPassword(user._id, password);
      setDone(true);
      toast.success('Password reset', `${user.name} has been notified.`);
    } catch (err) {
      toast.error('Could not reset password', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy', 'Select the password and copy it manually.');
    }
  };

  return (
    <Modal
      isOpen={!!user}
      onClose={onClose}
      title="Reset password"
      description={user ? `Set a new password for ${user.name}.` : undefined}
      size="sm"
      footer={
        done ? (
          <Button onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="reset-password-form" isLoading={saving}>
              Reset password
            </Button>
          </>
        )
      }
    >
      <form id="reset-password-form" onSubmit={submit} className="space-y-3" noValidate>
        <Input
          label="New password"
          type={show ? 'text' : 'password'}
          value={password}
          readOnly={done}
          onChange={(e) => {
            setPassword(e.target.value);
            setError('');
          }}
          error={error}
          hint={done ? 'Share this password securely. It will not be shown again.' : 'At least 6 characters.'}
          autoComplete="new-password"
          className="pr-20 font-mono"
          trailing={
            <div className="flex">
              {done ? (
                <Button variant="ghost" size="icon-sm" aria-label="Copy password" onClick={copy}>
                  {copied ? <Check /> : <Copy />}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Generate password"
                  title="Generate password"
                  onClick={() => {
                    setPassword(generatePassword());
                    setShow(true);
                    setError('');
                  }}
                >
                  <RefreshCw />
                </Button>
              )}
              <Button variant="ghost" size="icon-sm" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((s) => !s)}>
                {show ? <EyeOff /> : <Eye />}
              </Button>
            </div>
          }
        />
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Suspend
// ---------------------------------------------------------------------------

interface SuspendModalProps {
  user: AdminUser | null;
  onClose: () => void;
  onSuspended: (user: AdminUser) => void;
}

/** Give it a new `key` each time it opens so the reason starts empty. */
export function SuspendUserModal({ user, onClose, onSuspended }: SuspendModalProps) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const confirm = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const updated = (await api.admin.updateUserStatus(user._id, false, reason.trim() || undefined)) as AdminUser;
      toast.success('User suspended', `${user.name} can no longer sign in.`);
      onSuspended(updated);
      onClose();
    } catch (err) {
      toast.error('Could not suspend user', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={!!user}
      onClose={onClose}
      title="Suspend user?"
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirm} isLoading={saving}>
            Suspend user
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted">
          {user?.name} will be signed out immediately and won&apos;t be able to sign in until you reactivate the account. Their data is kept.
        </p>
        <Textarea
          label="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={300}
          hint="Shown to the user when they try to sign in."
          className="min-h-20"
        />
      </div>
    </Modal>
  );
}
