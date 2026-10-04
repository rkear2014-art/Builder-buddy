import Link from "next/link";

export default function JobNotFound() {
  return (
    <div className="card">
      <h1 className="font-display text-3xl">That job is not in your diary</h1>
      <Link href="/jobs" className="btn btn-primary mt-4">
        Back to jobs
      </Link>
    </div>
  );
}
