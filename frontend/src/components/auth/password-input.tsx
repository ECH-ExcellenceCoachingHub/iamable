'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, 'type' | 'icon' | 'trailing'>;

export const PasswordInput = (props: PasswordInputProps) => {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      icon={<Lock />}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="flex size-8 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-surface-muted hover:text-foreground"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      }
    />
  );
};
