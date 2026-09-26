import * as webpush from 'web-push';
import { ConfigService } from '@nestjs/config';
import { PushService } from './push.service';
import { NotificationsService } from './notifications.service';

jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}));

const keys = webpush as jest.Mocked<typeof webpush>;

function config(values: Record<string, string>) {
  return { get: (key: string, fallback?: string) => values[key] ?? fallback } as ConfigService;
}

function subscriptionModel(subs: Array<{ _id: string; endpoint: string; keys: object }>) {
  return {
    find: jest.fn(() => ({ lean: () => Promise.resolve(subs) })),
    deleteOne: jest.fn(() => Promise.resolve()),
    findOneAndUpdate: jest.fn(() => Promise.resolve()),
  };
}

const vapid = { VAPID_PUBLIC_KEY: 'pub', VAPID_PRIVATE_KEY: 'priv' };

describe('PushService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('is disabled without VAPID keys and sends nothing', async () => {
    const model = subscriptionModel([{ _id: '1', endpoint: 'https://push.example/a', keys: {} }]);
    const service = new PushService(config({}), model as never);
    service.onModuleInit();

    expect(service.enabled).toBe(false);
    expect(await service.sendToUser('u1', { title: 't', body: 'b' })).toBe(0);
    expect(keys.sendNotification).not.toHaveBeenCalled();
  });

  it('sends to every device and forgets expired subscriptions', async () => {
    const model = subscriptionModel([
      { _id: 'ok', endpoint: 'https://push.example/ok', keys: { p256dh: 'p', auth: 'a' } },
      { _id: 'gone', endpoint: 'https://push.example/gone', keys: { p256dh: 'p', auth: 'a' } },
      { _id: 'flaky', endpoint: 'https://push.example/flaky', keys: { p256dh: 'p', auth: 'a' } },
    ]);
    keys.sendNotification.mockImplementation(async (sub) => {
      if (sub.endpoint.endsWith('gone')) throw Object.assign(new Error('Gone'), { statusCode: 410 });
      if (sub.endpoint.endsWith('flaky')) throw Object.assign(new Error('Server error'), { statusCode: 500 });
      return { statusCode: 201, body: '', headers: {} };
    });
    const service = new PushService(config(vapid), model as never);
    service.onModuleInit();

    const delivered = await service.sendToUser('u1', { title: 'Hi', body: 'There', tag: 'abc123' });

    expect(delivered).toBe(1);
    expect(keys.setVapidDetails).toHaveBeenCalledWith('mailto:support@iamable.app', 'pub', 'priv');
    expect(JSON.parse(keys.sendNotification.mock.calls[0][1] as string)).toEqual({ title: 'Hi', body: 'There', tag: 'abc123' });
    expect(model.deleteOne).toHaveBeenCalledTimes(1);
    expect(model.deleteOne).toHaveBeenCalledWith({ _id: 'gone' });
  });

  it('reassigns an existing endpoint to the user who subscribes', async () => {
    const model = subscriptionModel([]);
    const service = new PushService(config(vapid), model as never);
    await service.subscribe('u2', { endpoint: 'https://push.example/x', keys: { p256dh: 'p', auth: 'a' } }, 'UA');

    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { endpoint: 'https://push.example/x' },
      { userId: 'u2', endpoint: 'https://push.example/x', keys: { p256dh: 'p', auth: 'a' }, userAgent: 'UA' },
      expect.objectContaining({ upsert: true }),
    );
  });
});

describe('NotificationsService.create', () => {
  it('saves the notification and pushes it with the unread count', async () => {
    const saved = { _id: 'n1', userId: 'u1', title: 'T', message: 'M', type: 'warning', link: undefined };
    const NotificationModel = Object.assign(
      jest.fn(() => ({ save: () => Promise.resolve(saved) })),
      { countDocuments: jest.fn(() => Promise.resolve(3)) },
    );
    const push = { sendToUser: jest.fn(() => Promise.resolve(1)) };
    const service = new NotificationsService(NotificationModel as never, push as never);

    const result = await service.create({ userId: 'u1', title: 'T', message: 'M', type: 'warning' });
    await new Promise((r) => setImmediate(r));

    expect(result).toBe(saved);
    expect(push.sendToUser).toHaveBeenCalledWith('u1', {
      title: 'T',
      body: 'M',
      type: 'warning',
      url: '/dashboard/notifications',
      tag: 'n1',
      badgeCount: 3,
    });
  });

  it('still returns the notification when push delivery fails', async () => {
    const saved = { _id: 'n2', userId: 'u1', title: 'T', message: 'M', type: 'info' };
    const NotificationModel = Object.assign(
      jest.fn(() => ({ save: () => Promise.resolve(saved) })),
      { countDocuments: jest.fn(() => Promise.resolve(1)) },
    );
    const push = { sendToUser: jest.fn(() => Promise.reject(new Error('boom'))) };
    const service = new NotificationsService(NotificationModel as never, push as never);

    await expect(service.create({ userId: 'u1', title: 'T', message: 'M', type: 'info' })).resolves.toBe(saved);
  });
});
