import Link from "next/link";
import type { ReactNode } from "react";

/** Small navigation links. Solid brand red, or a quiet outline for a toggle that should not shout. */
export function PillLink({
  href,
  children,
  back = false,
}: {
  href: string;
  children: ReactNode;
  back?: boolean;
}) {
  return (
    <Link href={href} className="pill">
      {back ? <PillArrow direction="left" /> : null}
      <span>{children}</span>
      {back ? null : <PillArrow />}
    </Link>
  );
}

export function PillArrow({ direction = "right" }: { direction?: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" className="pill-arrow" aria-hidden="true" data-direction={direction}>
      <path d="M5 12h12M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
