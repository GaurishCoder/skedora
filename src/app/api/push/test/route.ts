
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/require-api-user";
import webpush from "@/lib/web-push";

export const runtime = "nodejs";

export async function POST() {
  const { session, error } = await requireApiUser();

  if (!session) {
    return error;
  }

  try {
    // 1. Get subscriptions for the logged-in user
    const subscriptions =
      await prisma.pushSubscription.findMany({
        where: {
          userId: session.userId,
        },
      });

    if (subscriptions.length === 0) {
      return NextResponse.json(
        { error: "No push subscriptions found" },
        { status: 404 }
      );
    }

    // 2. Create notification payload
    const payload = JSON.stringify({
      title: "Skedora Notification",
      body: "Congratulations! Your browser push notification is working.",
      url: "/dashboard",
    });

    // 3. Send notification to each subscription
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
            payload
          );
        } catch (err: unknown) {
          const statusCode =
            typeof err === "object" &&
            err !== null &&
            "statusCode" in err
              ? err.statusCode
              : undefined;

          // Remove expired or invalid subscriptions
          if (statusCode === 404 || statusCode === 410) {
            await prisma.pushSubscription.deleteMany({
              where: {
                id: subscription.id,
                userId: session.userId,
              },
            });
          }

          throw err;
        }
      })
    );

    const successful = results.filter(
      (result) => result.status === "fulfilled"
    ).length;

    return NextResponse.json({
      message: "Push test completed",
      successful,
      failed: results.length - successful,
    });
  } catch (error) {
    console.error("Push notification error:", error);

    return NextResponse.json(
      { error: "Failed to send push notification" },
      { status: 500 }
    );
  }
}
