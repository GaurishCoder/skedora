import { prisma } from "@/lib/prisma";

export async function findOwnedTask(taskId: string, userId: string) {
  return prisma.task.findFirst({
    where: {
      id: taskId,
      userId,
    },
  });
}

export function normalizeDescription(description: string | null | undefined) {
  if (description == null) {
    return null;
  }

  const trimmed = description.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function assertDeadlineOrder(workDeadline: Date, taskDeadline: Date) {
  return workDeadline.getTime() <= taskDeadline.getTime();
}
