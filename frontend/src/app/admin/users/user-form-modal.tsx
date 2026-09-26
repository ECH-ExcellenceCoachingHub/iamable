'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Mail, RefreshCw, User as UserIcon } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/store/toast-store';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { AdminUser, UserRole, generatePassword, isActive } from './types';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The user to edit. Omit to create a new user. */
  user?: AdminUser | null;
  isSelf?: boolean;
  onSaved: (user: AdminUser) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Give it a new `key` each time it opens so the fields start from the user's current values. */
export function UserFormModal({ isOpen, onClose, user, isSelf, onSaved }: UserFormModalProps) {
  const editing = !!user;
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [role, setRole] = useState<UserRole>(user?.role ?? 'user');
  const [verified, setVerified] = useState(user?.isEmailVerified ?? false);
  const [active, setActive] = useState(user ? isActive(user) : true);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Name is required.';
    if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address.';
    if (!editing && password.length < 6) next.password = 'Password must be at least 6 characters.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      let saved: AdminUser;
      if (editing) {
        const changes: Parameters<typeof api.admin.updateUser>[1] = {};
        if (name.trim() !== user.name) changes.name = name.trim();
        if (email.trim().toLowerCase() !== user.email) changes.email = email.trim();
        if (role !== user.role) changes.role = role;
        if (verified !== !!user.isEmailVerified) changes.isEmailVerified = verified;
        if (active !== isActive(user)) changes.isActive = active;
        if (Object.keys(changes).length === 0) {
          onClose();
          return;
        }
        saved = await api.admin.updateUser(user._id, changes);
        toast.success('User updated', `${saved.name}'s account was saved.`);
      } else {
        saved = await api.admin.createUser({ name: name.trim(), email: email.trim(), password, role, isEmailVerified: verified });
        toast.success('User created', `${saved.name} can now sign in with the password you set.`);
      }
      onSaved(saved);
      onClose();
    } catch (err) {
      const message = getErrorMessage(err);
      if (/email/i.test(message)) setErrors({ email: message });
      else toast.error(editing ? 'Could not update user' : 'Could not create user', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? 'Edit user' : 'Add user'}
      description={editing ? `Update ${user.name}'s profile, role and access.` : 'Create an account and share the password with the person.'}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="user-form" isLoading={saving}>
            {editing ? 'Save changes' : 'Create user'}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={submit} className="space-y-4" noValidate>
        <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} icon={<UserIcon />} autoComplete="off" maxLength={100} />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} icon={<Mail />} autoComplete="off" />

        {!editing && (
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            hint="At least 6 characters."
            autoComplete="new-password"
            trailing={
              <div className="flex">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Generate password"
                  title="Generate password"
                  onClick={() => {
                    setPassword(generatePassword());
                    setShowPassword(true);
                  }}
                >
                  <RefreshCw />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((s) => !s)}>
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
            }
            className="pr-20"
          />
        )}

        <Select
          label="Role"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          disabled={isSelf}
          hint={isSelf ? "You can't change your own role." : 'Admins can access this dashboard and manage every user.'}
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </Select>

        <div className="-mx-3 space-y-1">
          <Switch checked={verified} onCheckedChange={setVerified} label="Email verified" description="Mark the email address as confirmed." />
          {editing && (
            <Switch
              checked={active}
              onCheckedChange={setActive}
              disabled={isSelf}
              label="Account active"
              description={isSelf ? "You can't suspend your own account." : 'Suspended users are signed out and cannot sign in.'}
            />
          )}
        </div>
      </form>
    </Modal>
  );
}
