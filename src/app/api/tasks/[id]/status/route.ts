import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/require-api-user";
import { findOwnedTask } from "@/lib/tasks";
import { updateTaskStatusSchema } from "@/lib/validations";
import { cancelTaskReminders, scheduleTaskReminders } from "@/lib/queue/task-reminder-queue";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { session, error } = await requireApiUser();

  if (!session) {
    return error;
  }

  try {
    const { id } = await context.params;
    const existing = await findOwnedTask(id, session.userId);

    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateTaskStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const task = await prisma.task.update({
      where: { id: existing.id },
      data: { status: parsed.data.status },
    });

    try {
      if (task.status === "COMPLETED") {
        await cancelTaskReminders(task.id);
      } else if (existing.status === "COMPLETED") {
        // Re-opened task from completed state
        await scheduleTaskReminders(task);
      }
    } catch (reminderError) {
      console.error(`[Tasks API] Failed to update reminders on status change for task ${task.id}:`, reminderError);
    }

    return NextResponse.json({ task });
  } catch {
    return NextResponse.json({ error: "Unable to update task status" }, { status: 500 });
  }
}
