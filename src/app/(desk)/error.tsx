"use client";

export default function DeskError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card">
      <h1 className="font-display text-3xl">Something went wrong</h1>
      <p className="mt-2">The page could not be loaded. Try again in a moment.</p>
      <button type="button" className="btn btn-primary mt-4" onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
