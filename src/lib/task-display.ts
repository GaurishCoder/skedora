import type { TaskPriority, TaskStatus } from "@/generated/prisma/client";

export const TASK_STATUSES: TaskStatus[] = ["PENDING", "IN_PROGRESS", "COMPLETED"];
export const TASK_PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH"];

export function formatDeadline(value: Date | string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function toDateTimeLocalValue(value: Date | string) {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function statusLabel(status: TaskStatus) {
  if (status === "IN_PROGRESS") {
    return "In progress";
  }

  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function priorityLabel(priority: TaskPriority) {
  return priority.charAt(0) + priority.slice(1).toLowerCase();
}

export function statusClassName(status: TaskStatus) {
  if (status === "COMPLETED") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "IN_PROGRESS") {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-stone-200 text-stone-800";
}

export function priorityClassName(priority: TaskPriority) {
  if (priority === "HIGH") {
    return "bg-red-100 text-red-800";
  }

  if (priority === "MEDIUM") {
    return "bg-orange-100 text-orange-800";
  }

  return "bg-sky-100 text-sky-800";
}
