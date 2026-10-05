import Link from "next/link";
import { documentEmail } from "@/lib/branded-email";
import { deskLogoSrc } from "@/lib/branding";
import { quoteMessage } from "@/lib/customer-message";
import { trustBadges } from "@/lib/trust";
import { requireUser } from "@/server/dal";
import { requestOrigin } from "@/server/origin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Email preview" };

export default async function EmailPreviewPage() {
  const user = await requireUser();
  const origin = await requestOrigin();
  const url = origin || "https://app.plastererinredditch.co.uk";
  const built = documentEmail({
    kind: "quote",
    businessName: user.businessName,
    accent: user.branding.accentColour,
    logoSrc: user.branding.hasLogo ? deskLogoSrc(user.branding.logoUpdatedAt) : null,
    body: quoteMessage({ customerName: "Mrs Priya Nair", businessName: user.businessName, url: `${url}/sign/preview` }),
    url: `${url}/sign/preview`,
    badges: trustBadges(user.branding),
  });

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <p>
        <Link href="/settings" className="font-bold underline" style={{ color: user.branding.accentColour }}>
          Business
        </Link>
      </p>
      <h1 className="font-display text-4xl">Branded email</h1>
      <p className="text-stone">
        This is how a customer email looks. The from name is {user.businessName}, and replies go to the business email
        {user.branding.email ? ` (${user.branding.email})` : ""}.
      </p>
      <iframe title="Branded email preview" className="h-[48rem] w-full rounded-2xl border border-line bg-white" srcDoc={built.html} />
    </div>
  );
}
