"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/diary", label: "Diary" },
  { href: "/jobs", label: "Jobs" },
  { href: "/jobs/new", label: "Book in" },
  { href: "/library", label: "Library" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/jobs/new") return pathname === "/jobs/new";
  if (href === "/jobs") return pathname === "/jobs" || /^\/jobs\/(?!new$).+/.test(pathname);
  return pathname === href;
}

export function DeskNav({ variant }: { variant: "side" | "tab" }) {
  const pathname = usePathname();
  const className =
    variant === "side"
      ? "hidden flex-col gap-2 p-4 md:flex"
      : "tab-nav fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-line bg-card md:hidden";

  return (
    <nav className={className} aria-label="Main">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              variant === "side"
                ? `btn ${active ? "btn-primary" : "btn-secondary"} w-full`
                : `flex flex-col items-center justify-center px-1 text-sm font-bold ${active ? "text-ink" : "text-stone"}`
            }
          >
            {variant === "tab" && active ? <span className="mb-1 h-1 w-8 rounded-full bg-amber" /> : null}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
