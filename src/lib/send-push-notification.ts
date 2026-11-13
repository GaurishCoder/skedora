import { prisma } from "@/lib/prisma";
import webpush from "@/lib/web-push";

type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

export async function sendPushNotification(
  userId: string,
  payload: PushPayload
) {
  const subscriptions =
    await prisma.pushSubscription.findMany({
      where: { userId },
    });

  const results = await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          JSON.stringify(payload)
        );
      } catch (error: unknown) {
        const statusCode =
          typeof error === "object" &&
          error !== null &&
          "statusCode" in error
            ? error.statusCode
            : undefined;

        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.deleteMany({
            where: { id: subscription.id },
          });
        }

        throw error;
      }
    })
  );

  const successful = results.filter(
    (result) => result.status === "fulfilled"
  ).length;

  return {
    successful,
    failed: results.length - successful,
    total: results.length,
  };
}
