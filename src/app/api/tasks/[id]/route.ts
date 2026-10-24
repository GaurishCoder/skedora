import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/require-api-user";
import { assertDeadlineOrder, findOwnedTask, normalizeDescription } from "@/lib/tasks";
import { updateTaskSchema } from "@/lib/validations";
import { cancelTaskReminders, scheduleTaskReminders } from "@/lib/queue/task-reminder-queue";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { session, error } = await requireApiUser();

  if (!session) {
    return error;
  }

  const { id } = await context.params;
  const task = await findOwnedTask(id, session.userId);

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({ task });
}

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
    const parsed = updateTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const workDeadline = data.workDeadline ?? existing.workDeadline;
    const taskDeadline = data.taskDeadline ?? existing.taskDeadline;

    if (!assertDeadlineOrder(workDeadline, taskDeadline)) {
      return NextResponse.json(
        { error: "Work deadline must be on or before the task deadline" },
        { status: 400 }
      );
    }

    const task = await prisma.task.update({
      where: { id: existing.id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined
          ? { description: normalizeDescription(data.description) }
          : {}),
        ...(data.workDeadline !== undefined ? { workDeadline: data.workDeadline } : {}),
        ...(data.taskDeadline !== undefined ? { taskDeadline: data.taskDeadline } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
      },
    });

    try {
      const deadlinesChanged = data.workDeadline !== undefined || data.taskDeadline !== undefined;
      const statusChanged = data.status !== undefined && data.status !== existing.status;

      if (task.status === "COMPLETED") {
        await cancelTaskReminders(task.id);
      } else if (deadlinesChanged || statusChanged) {
        await scheduleTaskReminders(task);
      }
    } catch (reminderError) {
      console.error(`[Tasks API] Failed to update reminders for task ${task.id}:`, reminderError);
    }

    return NextResponse.json({ task });
  } catch {
    return NextResponse.json({ error: "Unable to update task" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
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

    await prisma.task.delete({ where: { id: existing.id } });

    try {
      await cancelTaskReminders(existing.id);
    } catch (reminderError) {
      console.error(`[Tasks API] Failed to cancel reminders for deleted task ${existing.id}:`, reminderError);
    }

    return NextResponse.json({ message: "Task deleted" });
  } catch {
    return NextResponse.json({ error: "Unable to delete task" }, { status: 500 });
  }
}
