import Link from "next/link";

export default function TaskNotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6">
      <h1 className="text-3xl font-semibold text-stone-900">Task not found</h1>
      <p className="mt-2 text-stone-600">This task does not exist or you do not have access to it.</p>
      <Link
        href="/dashboard"
        className="mt-6 w-fit rounded-full bg-stone-900 px-6 py-3 text-sm font-medium text-white"
      >
        Back to tasks
      </Link>
    </main>
  );
}
