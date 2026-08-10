import webpush from 'web-push';
import { prisma } from '@/lib/db';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@myclass.app',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  image?: string;
}

/**
 * Send push notification to a specific user (by userId)
 */
export async function sendPushToUser(userId: number, payload: PushPayload) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) return;

  const payloadString = JSON.stringify(payload);

  const sendPromises = subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        payloadString
      );
    } catch (err: any) {
      // If subscription expired (410), delete it
      if (err.statusCode === 410 || err.statusCode === 404) {
        await prisma.pushSubscription.deleteMany({
          where: { endpoint: sub.endpoint },
        });
      } else {
        console.error('Push send error:', err);
      }
    }
  });

  await Promise.all(sendPromises);
}
