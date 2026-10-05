"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon, type NavIconName } from "@/components/nav-icons";

const items: Array<{ href: string; label: string; icon: NavIconName }> = [
  { href: "/jobs", label: "Jobs", icon: "jobs" },
  { href: "/diary", label: "Diary", icon: "diary" },
  { href: "/quotes", label: "Quotes", icon: "quotes" },
  { href: "/invoices", label: "Invoices", icon: "invoices" },
  { href: "/settings", label: "Business", icon: "business" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/jobs") {
    return pathname === "/jobs" || (/^\/jobs\/.+/.test(pathname) && pathname !== "/jobs/new");
  }
  if (href === "/invoices") return pathname === "/invoices" || pathname.startsWith("/invoices/");
  if (href === "/quotes") return pathname === "/quotes";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DeskNav({ accentColour }: { accentColour: string }) {
  const pathname = usePathname();

  return (
    <nav className="tab-nav no-print fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-18px_rgba(23,23,26,0.45)] lg:hidden" aria-label="Main">
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[4.5rem] flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-center text-[0.72rem] font-extrabold sm:text-sm ${active ? "text-ink" : "text-stone"}`}
              >
                <span className="h-1 w-8 rounded-full" style={active ? { background: accentColour } : undefined} />
                <span style={active ? { color: accentColour } : undefined}>
                  <NavIcon name={item.icon} />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
