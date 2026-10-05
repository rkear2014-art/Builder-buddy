export default function Loading() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <div className="skeleton h-72 rounded-[1.6rem]" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="skeleton h-36 rounded-3xl" />
        <div className="skeleton h-36 rounded-3xl" />
        <div className="skeleton h-36 rounded-3xl" />
      </div>
    </div>
  );
}
