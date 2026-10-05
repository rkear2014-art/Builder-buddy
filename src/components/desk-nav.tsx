"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/jobs", label: "Jobs" },
  { href: "/choose", label: "Choose" },
  { href: "/quotes", label: "Quotes" },
  { href: "/settings", label: "Business" },
  { href: "/invoices", label: "Invoices" },
  { href: "/diary", label: "Diary" },
  { href: "/library", label: "Library" },
  { href: "/jobs/new", label: "Book in" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/jobs/new") return pathname === "/jobs/new";
  if (href === "/choose") return pathname === "/choose" || pathname.endsWith("/choose");
  if (href === "/jobs") {
    return pathname === "/jobs" || (/^\/jobs\/.+/.test(pathname) && pathname !== "/jobs/new" && !pathname.endsWith("/choose"));
  }
  if (href === "/invoices") return pathname === "/invoices" || pathname.startsWith("/invoices/");
  if (href === "/quotes") return pathname === "/quotes";
  return pathname === href;
}

export function DeskNav() {
  const pathname = usePathname();

  return (
    <nav
      className="tab-nav fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-line bg-card sm:hidden"
      aria-label="Main"
    >
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center justify-center px-1 text-center text-sm font-bold ${active ? "text-ink" : "text-stone"}`}
          >
            {active ? <span className="mb-1 h-1 w-8 rounded-full bg-amber" /> : <span className="mb-1 h-1 w-8" />}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
