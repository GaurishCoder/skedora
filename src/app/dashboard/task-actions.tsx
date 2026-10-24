"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TaskStatus } from "@/generated/prisma/client";
import { TASK_STATUSES, statusLabel } from "@/lib/task-display";

type TaskActionsProps = {
  taskId: string;
  status: TaskStatus;
};

export function TaskActions({ taskId, status }: TaskActionsProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleStatusChange(nextStatus: TaskStatus) {
    setError("");
    setIsUpdating(true);

    const response = await fetch(`/api/tasks/${taskId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });

    const data = await response.json();
    setIsUpdating(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to update status");
      return;
    }

    router.refresh();
  }

  async function handleDelete() {
    if (!window.confirm("Delete this task?")) {
      return;
    }

    setError("");
    setIsDeleting(true);

    const response = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    const data = await response.json();
    setIsDeleting(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to delete task");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={status}
          disabled={isUpdating || isDeleting}
          onChange={(event) => handleStatusChange(event.target.value as TaskStatus)}
          className="rounded-full border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-900"
        >
          {TASK_STATUSES.map((item) => (
            <option key={item} value={item}>
              {statusLabel(item)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isUpdating || isDeleting}
          className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-60"
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
