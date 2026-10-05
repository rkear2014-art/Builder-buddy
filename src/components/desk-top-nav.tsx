"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogoutButton } from "@/components/logout-button";
import { initials } from "@/lib/place";
import { NavIcon, type NavIconName } from "@/components/nav-icons";

const links: Array<{ href: string; label: string; icon: NavIconName; chase?: boolean }> = [
  { href: "/jobs", label: "Jobs", icon: "jobs" },
  { href: "/quotes", label: "Quotes", icon: "quotes" },
  { href: "/invoices", label: "Invoices", icon: "invoices" },
  { href: "/#to-chase", label: "To chase", icon: "chase", chase: true },
  { href: "/diary", label: "Diary", icon: "diary" },
  { href: "/library", label: "Library", icon: "library" },
  { href: "/settings", label: "Business", icon: "business" },
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
  subtitle,
  logoSrc,
  logoCompact = false,
  chaseCount,
  accentColour,
  accentInk,
}: {
  businessName: string;
  subtitle: string;
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
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt=""
              className={
                logoCompact
                  ? "h-10 w-10 rounded-full bg-white object-cover p-0.5"
                  : "h-10 w-10 rounded-full bg-white object-contain p-1"
              }
            />
          ) : (
            <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-xs font-extrabold text-ink">
              {initials(businessName)}
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate text-sm font-extrabold tracking-wide sm:text-base">{businessName.toUpperCase()}</span>
            {subtitle.trim() ? (
              <span className="block truncate text-[0.62rem] font-bold tracking-[0.12em] text-white/65 sm:text-[0.68rem]">
                {subtitle.trim().toUpperCase()}
              </span>
            ) : null}
          </span>
        </Link>
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
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
            className="inline-flex min-h-10 items-center gap-1 rounded-full px-3.5 text-sm font-extrabold"
            style={{ background: accentColour, color: accentInk }}
          >
            <span aria-hidden="true">+</span>
            New job
          </Link>
        </div>
      </div>
      <nav className="mx-auto flex max-w-6xl items-center gap-0.5 overflow-x-auto px-2 pb-2" aria-label="Main">
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
        <span className="ml-auto shrink-0">
          <LogoutButton compact />
        </span>
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
      className={`inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold sm:text-sm ${link.href === "/settings" ? "" : active ? "bg-white/10 text-white" : "text-white/75"}`}
      style={link.href === "/settings" ? { background: accentColour, color: accentInk } : undefined}
    >
      <NavIcon name={link.icon} />
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
