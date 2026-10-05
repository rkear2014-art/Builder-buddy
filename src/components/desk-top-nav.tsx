"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogoutButton } from "@/components/logout-button";

const links = [
  { href: "/jobs", label: "Jobs" },
  { href: "/quotes", label: "Quotes" },
  { href: "/invoices", label: "Invoices" },
  { href: "/#to-chase", label: "To chase", chase: true },
  { href: "/diary", label: "Diary" },
  { href: "/library", label: "Library" },
  { href: "/settings", label: "Business" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/#to-chase") return false;
  if (href === "/jobs") return pathname === "/jobs" || /^\/jobs\/(?!new$).+/.test(pathname);
  if (href === "/invoices") return pathname === "/invoices" || pathname.startsWith("/invoices/");
  if (href === "/quotes") return pathname === "/quotes";
  return pathname === href;
}

export function DeskTopNav({
  businessName,
  logoSrc,
  logoCompact = false,
  chaseCount,
  accentColour,
  accentInk,
}: {
  businessName: string;
  logoSrc: string | null;
  logoCompact?: boolean;
  chaseCount: number;
  accentColour: string;
  accentInk: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [spinning, setSpinning] = useState(false);

  function refresh() {
    setSpinning(true);
    router.refresh();
    window.setTimeout(() => setSpinning(false), 700);
  }

  return (
    <header className="no-print sticky top-0 z-30 bg-[#17171a] text-white">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2.5">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt=""
              className={
                logoCompact
                  ? "h-9 w-9 rounded-lg bg-white object-contain p-0.5"
                  : "h-9 w-auto max-w-16 rounded-lg bg-white object-contain p-0.5"
              }
            />
          ) : null}
          <span className="max-w-[7.5rem] truncate text-base font-extrabold tracking-wide sm:max-w-[11rem] sm:text-lg">
            {businessName.toUpperCase()}
          </span>
        </Link>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full text-white/80 hover:bg-white/10"
            aria-label="Refresh"
            onClick={refresh}
          >
            <svg viewBox="0 0 24 24" className={`h-5 w-5 ${spinning ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-2.2-5.8" strokeLinecap="round" />
              <path d="M21 4v5h-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <Link
            href="/jobs/new"
            className="inline-flex min-h-10 items-center rounded-full px-4 text-sm font-extrabold"
            style={{ background: accentColour, color: accentInk }}
          >
            New job
          </Link>
        </div>
      </div>
      <nav className="mx-auto hidden max-w-6xl flex-wrap items-center gap-1 px-3 pb-2 sm:flex" aria-label="Main">
        {links.map((link) => (
          <NavLink
            key={link.href}
            link={link}
            active={isActive(pathname, link.href)}
            chaseCount={chaseCount}
            accentColour={accentColour}
            accentInk={accentInk}
          />
        ))}
        <LogoutButton compact />
      </nav>
    </header>
  );
}

function NavLink({
  link,
  active,
  chaseCount,
  accentColour,
  accentInk,
}: {
  link: (typeof links)[number];
  active: boolean;
  chaseCount: number;
  accentColour: string;
  accentInk: string;
}) {
  return (
    <Link
      href={link.href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-bold ${link.href === "/settings" ? "" : active ? "bg-white/10 text-white" : "text-white/70"}`}
      style={link.href === "/settings" ? { background: accentColour, color: accentInk } : undefined}
    >
      {link.label}
      {link.chase && chaseCount > 0 ? (
        <span
          className="inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-extrabold"
          style={{ background: accentColour, color: accentInk }}
        >
          {chaseCount}
        </span>
      ) : null}
    </Link>
  );
}
