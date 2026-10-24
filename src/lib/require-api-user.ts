import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth";

export async function requireApiUser() {
  const session = await getCurrentUserFromCookie();

  if (!session) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { session, error: null };
}
