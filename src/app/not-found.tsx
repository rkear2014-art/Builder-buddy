import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="font-display text-4xl">That page is not here</h1>
      <p className="mt-3 text-stone">Check the address, or go back to the diary.</p>
      <Link href="/" className="btn btn-primary mt-6">
        Back to Builder Buddy
      </Link>
    </main>
  );
}
