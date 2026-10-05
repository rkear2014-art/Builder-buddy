import { deskSmallLogoSrc } from "@/lib/branding";
import { DeskNav } from "@/components/desk-nav";
import { DeskTopNav } from "@/components/desk-top-nav";
import { countChase, requireUser } from "@/server/dal";

export const dynamic = "force-dynamic";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const chaseCount = await countChase(user.businessId);
  return (
    <div className="min-h-dvh bg-[#eef1f4]">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-40 focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <DeskTopNav
        businessName={user.businessName}
        logoSrc={deskSmallLogoSrc(user.branding)}
        logoCompact={user.branding.hasMark}
        chaseCount={chaseCount}
        accentColour={user.branding.accentColour}
        accentInk={user.branding.accentInk}
      />
      <main id="content" className="mx-auto w-full max-w-6xl px-3 py-4 pb-44 sm:pb-8">
        {children}
      </main>
      <DeskNav />
    </div>
  );
}
