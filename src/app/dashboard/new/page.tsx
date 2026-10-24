import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserFromCookie } from "@/lib/auth";
import { TaskForm } from "../task-form";

export default async function NewTaskPage() {
  const session = await getCurrentUserFromCookie();

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <Link href="/dashboard" className="text-sm font-medium text-stone-600 hover:text-stone-900">
        Back to tasks
      </Link>
      <h1 className="mt-4 text-4xl font-semibold text-stone-900">Add a task</h1>
      <p className="mt-2 text-stone-600">
        Set a work deadline for when you plan to finish, and a task deadline for the final due date.
      </p>
      <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-6">
        <TaskForm />
      </section>
    </main>
  );
}
