"use client";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-10">
      <p className="font-bold text-stone">Builder Buddy</p>
      <h1 className="font-display text-4xl leading-none">This page could not be loaded</h1>
      <p className="mt-3 text-lg">Your jobs are still saved. Try again in a moment.</p>
      <button type="button" className="btn btn-primary mt-6 w-full" onClick={() => reset()}>
        Try again
      </button>
    </main>
  );
}
