"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon, type NavIconName } from "@/components/nav-icons";

const items: Array<{ href: string; label: string; icon: NavIconName }> = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/jobs", label: "Jobs", icon: "jobs" },
  { href: "/diary", label: "Calendar", icon: "diary" },
  { href: "/#to-chase", label: "Messages", icon: "messages" },
  { href: "/library", label: "Library", icon: "library" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/#to-chase") return false;
  if (href === "/jobs") {
    return pathname === "/jobs" || (/^\/jobs\/.+/.test(pathname) && pathname !== "/jobs/new");
  }
  if (href === "/diary") return pathname === "/diary" || pathname.startsWith("/diary/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DeskNav({ accentColour, initials }: { accentColour: string; initials: string }) {
  const pathname = usePathname();
  const profileActive = pathname === "/settings" || pathname.startsWith("/settings/");

  return (
    <nav className="tab-nav no-print fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-18px_rgba(23,23,26,0.45)] lg:hidden" aria-label="Main">
      <ul className="grid grid-cols-6">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[4.25rem] flex-col items-center justify-center gap-0.5 px-0.5 py-1.5 text-center text-[0.62rem] font-extrabold leading-none sm:text-xs ${active ? "" : "text-stone"}`}
                style={active ? { color: accentColour } : undefined}
              >
                <NavIcon name={item.icon} />
                {item.label}
                <span className="h-0.5 w-6 rounded-full" style={active ? { background: accentColour } : undefined} />
              </Link>
            </li>
          );
        })}
        <li>
          <Link
            href="/settings"
            aria-label="Your profile"
            aria-current={profileActive ? "page" : undefined}
            className="flex min-h-[4.25rem] flex-col items-center justify-center gap-0.5 px-0.5 py-1.5"
          >
            <span
              className="grid h-7 w-7 place-items-center rounded-full text-[0.65rem] font-extrabold text-white"
              style={{ background: profileActive ? accentColour : "#17171a" }}
            >
              {initials}
            </span>
            <span className="h-0.5 w-6 rounded-full" style={profileActive ? { background: accentColour } : undefined} />
          </Link>
        </li>
      </ul>
    </nav>
  );
}
