"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { Task, TaskPriority, TaskStatus } from "@/generated/prisma/client";
import { TASK_PRIORITIES, TASK_STATUSES, toDateTimeLocalValue } from "@/lib/task-display";

type TaskFormProps = {
  task?: Task;
};

export function TaskForm({ task }: TaskFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(task);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      title: formData.get("title"),
      description: formData.get("description"),
      workDeadline: formData.get("workDeadline"),
      taskDeadline: formData.get("taskDeadline"),
      status: formData.get("status") as TaskStatus,
      priority: formData.get("priority") as TaskPriority,
    };

    const response = await fetch(isEditing ? `/api/tasks/${task?.id}` : "/api/tasks", {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to save task");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block text-sm font-medium text-stone-700">
        Title
        <input
          name="title"
          required
          maxLength={120}
          defaultValue={task?.title}
          className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none focus:border-stone-900"
        />
      </label>
      <label className="block text-sm font-medium text-stone-700">
        Description
        <textarea
          name="description"
          rows={4}
          maxLength={2000}
          defaultValue={task?.description ?? ""}
          className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none focus:border-stone-900"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-stone-700">
          Work deadline
          <input
            name="workDeadline"
            type="datetime-local"
            required
            defaultValue={task ? toDateTimeLocalValue(task.workDeadline) : ""}
            className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none focus:border-stone-900"
          />
        </label>
        <label className="block text-sm font-medium text-stone-700">
          Task deadline
          <input
            name="taskDeadline"
            type="datetime-local"
            required
            defaultValue={task ? toDateTimeLocalValue(task.taskDeadline) : ""}
            className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none focus:border-stone-900"
          />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-stone-700">
          Status
          <select
            name="status"
            defaultValue={task?.status ?? "PENDING"}
            className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none focus:border-stone-900"
          >
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-stone-700">
          Priority
          <select
            name="priority"
            defaultValue={task?.priority ?? "MEDIUM"}
            className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none focus:border-stone-900"
          >
            {TASK_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-full bg-stone-900 px-6 py-3 text-sm font-medium text-white disabled:opacity-60"
      >
        {isSubmitting ? "Saving..." : isEditing ? "Save changes" : "Create task"}
      </button>
    </form>
  );
}
