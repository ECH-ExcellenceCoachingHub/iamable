'use client';

import { api } from '@/lib/api';

export type PushSupport = 'supported' | 'unsupported' | 'ios-needs-install' | 'dev';

const CHANGED_EVENT = 'notifications:changed';

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as { standalone?: boolean }).standalone);
}

export function getPushSupport(): PushSupport {
  if (typeof window === 'undefined') return 'unsupported';
  // iOS only exposes Web Push to apps added to the home screen (iOS 16.4+).
  if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !isStandalone()) return 'ios-needs-install';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  // The service worker is only registered in production builds (see PwaSupport).
  if (process.env.NODE_ENV !== 'production') return 'dev';
  return 'supported';
}

export function getPermission(): NotificationPermission | 'unsupported' {
  return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';
}

async function getRegistration() {
  const existing = await navigator.serviceWorker.getRegistration();
  if (!existing) await navigator.serviceWorker.register('/sw.js');
  return navigator.serviceWorker.ready;
}

function base64UrlToUint8Array(base64Url: string) {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const raw = atob((base64Url + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function sameKey(a: ArrayBuffer | null | undefined, b: Uint8Array) {
  if (!a) return false;
  const view = new Uint8Array(a);
  return view.length === b.length && view.every((byte, i) => byte === b[i]);
}

async function getServerKey() {
  const { publicKey, enabled } = await api.notifications.getPushPublicKey();
  if (!enabled || !publicKey) throw new Error('Push notifications are not available right now.');
  return base64UrlToUint8Array(publicKey);
}

async function subscribeWithServer(registration: ServiceWorkerRegistration, key: Uint8Array) {
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: key as BufferSource,
  });
  await api.notifications.subscribePush(subscription.toJSON());
  return subscription;
}

export async function isSubscribed() {
  if (getPushSupport() !== 'supported' || getPermission() !== 'granted') return false;
  const registration = await navigator.serviceWorker.getRegistration();
  return Boolean(await registration?.pushManager.getSubscription());
}

/** Asks for permission and subscribes this device. Call it from a click handler. */
export async function enablePush() {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? 'Notifications are blocked. Allow them for this site in your browser settings, then try again.'
        : 'Permission was not granted.'
    );
  }
  const [registration, key] = await Promise.all([getRegistration(), getServerKey()]);
  const existing = await registration.pushManager.getSubscription();
  if (existing && sameKey(existing.options.applicationServerKey, key)) {
    await api.notifications.subscribePush(existing.toJSON());
    return;
  }
  await existing?.unsubscribe();
  await subscribeWithServer(registration, key);
}

export async function disablePush() {
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await api.notifications.unsubscribePush(subscription.endpoint).catch(() => {});
  await subscription.unsubscribe();
}

/**
 * Makes sure the server knows this device belongs to the signed-in user, and renews the
 * subscription if the server's key changed. Never prompts, and never re-subscribes a
 * device the user turned off.
 */
export async function syncPushSubscription({ renew = false } = {}) {
  if (getPushSupport() !== 'supported' || getPermission() !== 'granted') return;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return;
  const existing = await registration.pushManager.getSubscription();
  if (!existing && !renew) return;
  const key = await getServerKey();
  if (existing && sameKey(existing.options.applicationServerKey, key)) {
    await api.notifications.subscribePush(existing.toJSON());
    return;
  }
  await existing?.unsubscribe();
  await subscribeWithServer(registration, key);
}

/** On sign-out, stop this device from receiving the previous user's notifications. */
export async function unsubscribeDevice() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  await (await registration?.pushManager.getSubscription())?.unsubscribe();
  if ('clearAppBadge' in navigator) await navigator.clearAppBadge().catch(() => {});
}

/** Tell other components (e.g. the header bell) that notifications were read, removed or received. */
export function notifyNotificationsChanged() {
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

/** Runs `callback` when a push arrives or another component changes notifications. */
export function onNotificationsChanged(callback: () => void) {
  const onMessage = (e: MessageEvent) => {
    if (e.data?.type === 'notification:received') callback();
  };
  window.addEventListener(CHANGED_EVENT, callback);
  navigator.serviceWorker?.addEventListener('message', onMessage);
  return () => {
    window.removeEventListener(CHANGED_EVENT, callback);
    navigator.serviceWorker?.removeEventListener('message', onMessage);
  };
}

/** Keeps the installed app's icon badge in step with the unread count. */
export function setAppBadge(count: number) {
  if (typeof navigator === 'undefined' || !('setAppBadge' in navigator)) return;
  (count > 0 ? navigator.setAppBadge(count) : navigator.clearAppBadge()).catch(() => {});
}
