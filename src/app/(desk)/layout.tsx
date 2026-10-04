import Link from "next/link";
import { requireUser } from "@/server/dal";
import { deskLogoSrc } from "@/lib/branding";
import { DeskNav } from "@/components/desk-nav";
import { LogoutButton } from "@/components/logout-button";

export const dynamic = "force-dynamic";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-dvh">
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:bg-card focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex min-h-12 min-w-0 items-center gap-3">
            {user.branding.hasLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={deskLogoSrc(user.branding.logoUpdatedAt)}
                alt=""
                className="brand-logo brand-logo-header"
              />
            ) : (
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber font-display text-xl">
                Bb
              </span>
            )}
            <span className="min-w-0">
              <span className="block font-display text-2xl leading-none">Builder Buddy</span>
              <span className="block truncate text-sm font-semibold text-stone">{user.businessName}</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/settings" className="btn btn-secondary !min-h-12">
              Business
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl md:grid-cols-[13rem_1fr]">
        <DeskNav variant="side" />
        <main id="content" className="px-4 py-5 pb-28 md:pb-10">
          {children}
        </main>
      </div>
      <DeskNav variant="tab" />
    </div>
  );
}
