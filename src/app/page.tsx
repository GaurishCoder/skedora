import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-semibold tracking-[0.2em] text-stone-500 uppercase">Skedora</p>
      <h1 className="mt-4 max-w-2xl text-5xl font-semibold tracking-tight text-stone-900">
        Add tasks, set deadlines, and get reminded before time runs out.
      </h1>
      <p className="mt-6 max-w-xl text-lg text-stone-600">
        Skedora helps you manage work deadlines and task deadlines in one place.
        Sign in to add tasks. Reminder notifications will follow.
      </p>
      <div className="mt-10 flex gap-4">
        <Link
          href="/register"
          className="rounded-full bg-stone-900 px-6 py-3 text-sm font-medium text-white"
        >
          Create account
        </Link>
        <Link
          href="/login"
          className="rounded-full border border-stone-300 px-6 py-3 text-sm font-medium text-stone-800"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
