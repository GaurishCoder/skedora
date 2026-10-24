import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/require-api-user";
import { assertDeadlineOrder, normalizeDescription } from "@/lib/tasks";
import { createTaskSchema, taskStatusEnum } from "@/lib/validations";
import { scheduleTaskReminders } from "@/lib/queue/task-reminder-queue";

export async function GET(request: Request) {
  const { session, error } = await requireApiUser();

  if (!session) {
    return error;
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const statusFilter = statusParam ? taskStatusEnum.safeParse(statusParam) : null;

  if (statusFilter && !statusFilter.success) {
    return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
  }

  const tasks = await prisma.task.findMany({
    where: {
      userId: session.userId,
      ...(statusFilter?.success ? { status: statusFilter.data } : {}),
    },
    orderBy: [{ taskDeadline: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const { session, error } = await requireApiUser();

  if (!session) {
    return error;
  }

  try {
    const body = await request.json();
    const parsed = createTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { title, description, workDeadline, taskDeadline, status, priority } = parsed.data;

    if (!assertDeadlineOrder(workDeadline, taskDeadline)) {
      return NextResponse.json(
        { error: "Work deadline must be on or before the task deadline" },
        { status: 400 }
      );
    }

    const task = await prisma.task.create({
      data: {
        title,
        description: normalizeDescription(description),
        workDeadline,
        taskDeadline,
        status,
        priority,
        userId: session.userId,
      },
    });

    try {
      await scheduleTaskReminders(task);
    } catch (reminderError) {
      console.error(`[Tasks API] Failed to schedule reminders for task ${task.id}:`, reminderError);
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create task" }, { status: 500 });
  }
}
