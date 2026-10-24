import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  formatDeadline,
  priorityClassName,
  priorityLabel,
  statusClassName,
  statusLabel,
} from "@/lib/task-display";
import { LogoutButton } from "./logout-button";
import { TaskActions } from "./task-actions";

type DashboardPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await getCurrentUserFromCookie();
  
  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      username: true,
      email: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  const { status } = await searchParams;
  const selectedStatus =
    status === "PENDING" || status === "IN_PROGRESS" || status === "COMPLETED" ? status : undefined;

  const tasks = await prisma.task.findMany({
    where: {
      userId: session.userId,
      ...(selectedStatus ? { status: selectedStatus } : {}),
    },
    orderBy: [{ taskDeadline: "asc" }, { createdAt: "desc" }],
  });

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-stone-500 uppercase">
            Dashboard
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-stone-900">Hello, {user.username}</h1>
          <p className="mt-2 text-stone-600">{user.email}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/new"
            className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white"
          >
            Add task
          </Link>
          <LogoutButton />
        </div>
      </div>

      <div className="mt-10 flex flex-wrap gap-2">
        {[
          { href: "/dashboard", label: "All" },
          { href: "/dashboard?status=PENDING", label: "Pending" },
          { href: "/dashboard?status=IN_PROGRESS", label: "In progress" },
          { href: "/dashboard?status=COMPLETED", label: "Completed" },
        ].map((filter) => {
          const isActive =
            (filter.label === "All" && !selectedStatus) ||
            filter.href.endsWith(`status=${selectedStatus ?? ""}`);

          return (
            <Link
              key={filter.href}
              href={filter.href}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                isActive ? "bg-stone-900 text-white" : "border border-stone-300 text-stone-800"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      {tasks.length === 0 ? (
        <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-6">
          <h2 className="text-lg font-medium text-stone-900">No tasks yet</h2>
          <p className="mt-2 text-stone-600">
            Create a task with a work deadline and a final task deadline to get started.
          </p>
        </section>
      ) : (
        <ul className="mt-8 space-y-4">
          {tasks.map((task) => (
            <li key={task.id} className="rounded-3xl border border-stone-200 bg-white p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/dashboard/${task.id}`}
                      className="text-xl font-semibold text-stone-900 hover:underline"
                    >
                      {task.title}
                    </Link>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${statusClassName(task.status)}`}
                    >
                      {statusLabel(task.status)}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${priorityClassName(task.priority)}`}
                    >
                      {priorityLabel(task.priority)}
                    </span>
                  </div>
                  {task.description ? (
                    <p className="max-w-3xl text-stone-600">{task.description}</p>
                  ) : null}
                  <p className="text-sm text-stone-500">
                    Work deadline: {formatDeadline(task.workDeadline)}
                  </p>
                  <p className="text-sm text-stone-500">
                    Task deadline: {formatDeadline(task.taskDeadline)}
                  </p>
                </div>
                <TaskActions taskId={task.id} status={task.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
