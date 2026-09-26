'use client';

import React, { useEffect, useState } from 'react';
import { BellRing, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';
import { disablePush, enablePush, getPermission, getPushSupport, isSubscribed, type PushSupport } from '@/lib/push';
import { toast } from '@/store/toast-store';
import { getErrorMessage } from '@/lib/utils';

interface PushState {
  support: PushSupport;
  permission: NotificationPermission | 'unsupported';
  subscribed: boolean;
}

const unsupportedMessages: Partial<Record<PushSupport, string>> = {
  'ios-needs-install':
    'On iPhone and iPad, add Am Able to your Home Screen (Share → Add to Home Screen) and open it from there to turn on push notifications.',
  unsupported: "This browser doesn't support push notifications. You'll still see them here.",
  dev: 'Push notifications only work in the production build, where the service worker is registered.',
};

/** Lets the user turn push notifications on or off for this device and send a test. */
export function PushSettings() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    isSubscribed()
      .catch(() => false)
      .then((subscribed) => {
        if (!cancelled) setState({ support: getPushSupport(), permission: getPermission(), subscribed });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!state) return null;

  const toggle = async (on: boolean) => {
    setBusy(true);
    try {
      if (on) {
        await enablePush();
        toast.success('Push notifications on', "You'll be notified on this device even when Am Able is closed.");
      } else {
        await disablePush();
        toast.success('Push notifications off', "This device won't receive push notifications.");
      }
    } catch (err) {
      toast.error('Could not update push notifications', getErrorMessage(err));
    } finally {
      const subscribed = await isSubscribed().catch(() => false);
      setState((s) => (s ? { ...s, permission: getPermission(), subscribed } : s));
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      const { devices } = await api.notifications.sendTestPush();
      toast.success('Test sent', devices > 0 ? `Sent to ${devices} device${devices > 1 ? 's' : ''}.` : 'No devices are subscribed yet.');
    } catch (err) {
      toast.error('Could not send a test notification', getErrorMessage(err));
    } finally {
      setTesting(false);
    }
  };

  const unsupportedMessage = unsupportedMessages[state.support];
  const blocked = state.permission === 'denied';

  return (
    <Card className="mb-4 p-2">
      {unsupportedMessage ? (
        <Alert tone="info" className="m-1">
          {unsupportedMessage}
        </Alert>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Switch
            className="flex-1"
            checked={state.subscribed}
            onCheckedChange={toggle}
            disabled={busy || (blocked && !state.subscribed)}
            icon={<BellRing />}
            label="Push notifications on this device"
            description={
              blocked
                ? 'Blocked in your browser. Allow notifications for this site in your browser settings to turn them on.'
                : 'Get alerts even when Am Able is closed.'
            }
          />
          {state.subscribed && (
            <Button variant="outline" size="sm" onClick={sendTest} isLoading={testing} className="mx-3 mb-3 sm:mb-0">
              {!testing && <Send />}
              Send test
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
