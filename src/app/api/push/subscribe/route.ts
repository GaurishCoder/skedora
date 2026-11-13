
import { NextResponse } from "next/server";
import { z } from "zod";

// Update these imports to match your project
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/require-api-user";

const subscriptionSchema = z.object({
  endpoint: z.string().url().refine(
    (url) => new URL(url).protocol === "https:",
    "Push endpoint must use HTTPS"
  ),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(request: Request) {
  const { session, error } = await requireApiUser();

  if (!session) {
    return error;
  }

  try {
    const body = await request.json();
    const parsed = subscriptionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid push subscription" },
        { status: 400 }
      );
    }

    const { endpoint, keys } = parsed.data;

    const existing = await prisma.pushSubscription.findUnique({
      where: { endpoint },
      select: { userId: true },
    });

    // Do not silently transfer another user's subscription.
    if (existing && existing.userId !== session.userId) {
      return NextResponse.json(
        { error: "Subscription is already registered to another account" },
        { status: 409 }
      );
    }

    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: session.userId,
      },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    });

    return NextResponse.json(
      {
        message: "Push subscription saved successfully",
        subscriptionId: subscription.id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Push subscription error:", error);

    return NextResponse.json(
      { error: "Failed to save push subscription" },
      { status: 500 }
    );
  }
}