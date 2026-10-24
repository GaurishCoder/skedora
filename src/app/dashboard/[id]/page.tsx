import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUserFromCookie } from "@/lib/auth";
import { findOwnedTask } from "@/lib/tasks";
import { TaskActions } from "../task-actions";
import { TaskForm } from "../task-form";

type TaskPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TaskPage({ params }: TaskPageProps) {
  const session = await getCurrentUserFromCookie();

  if (!session) {
    redirect("/login");
  }

  const { id } = await params;
  const task = await findOwnedTask(id, session.userId);

  if (!task) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <Link href="/dashboard" className="text-sm font-medium text-stone-600 hover:text-stone-900">
        Back to tasks
      </Link>
      <h1 className="mt-4 text-4xl font-semibold text-stone-900">Edit task</h1>
      <p className="mt-2 text-stone-600">Update the details, deadlines, status, or priority.</p>
      <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-6">
        <div className="mb-6">
          <TaskActions taskId={task.id} status={task.status} />
        </div>
        <TaskForm task={task} />
      </section>
    </main>
  );
}
