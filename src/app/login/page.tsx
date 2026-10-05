import type { CSSProperties } from "react";
import Link from "next/link";
import { DEFAULT_ACCENT, accentInk } from "@/lib/accent";
import { redirect } from "next/navigation";
import { databaseFailureMessage } from "@/lib/database";
import { isConfigured } from "@/lib/config";
import { isFrameworkControlFlow, loginOffersCreate, type SetupCheck } from "@/lib/setup-gate";
import { getCurrentUser } from "@/server/dal";
import { checkFirstAccount } from "@/server/setup";
import { LoginForm } from "@/app/login/login-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (!isConfigured()) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="font-display text-4xl">Builder Buddy is closed</h1>
        <p className="mt-3 text-lg">
          Sign-in stays shut until AUTH_SECRET and DATABASE_URL are set. The diary is not open to the public.
        </p>
      </main>
    );
  }
  let check: SetupCheck;
  try {
    const user = await getCurrentUser();
    if (user) redirect("/");
    check = await checkFirstAccount();
  } catch (error) {
    if (isFrameworkControlFlow(error)) throw error;
    check = { state: "unavailable", message: databaseFailureMessage(error) };
  }
  const offerCreate = loginOffersCreate(check);
  return (
    <main className="signin" style={{ "--brand": DEFAULT_ACCENT, "--brand-ink": accentInk(DEFAULT_ACCENT) } as CSSProperties}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/work/site-photo.webp" alt="" className="signin-photo" />
      <div className="signin-shade" aria-hidden="true" />
      <div className="signin-panel">
        <p className="font-bold text-stone">For the tradesperson</p>
        <h1 className="font-display text-5xl leading-none tracking-tight">Builder Buddy</h1>
        <p className="mt-3 text-lg">Jobs, materials, and a signature the customer can give on their own phone.</p>
        <div className="card mt-6">
          <LoginForm showDemo={process.env.SHOW_DEMO_LOGIN === "true"} />
          {offerCreate ? (
            <div className="mt-4 border-t border-line pt-4">
              <p className="mb-3">
                {check.state === "unavailable"
                  ? check.message
                  : "First time on this tablet? Create the account for your business. This can only be done once."}
              </p>
              <Link href="/setup" className="btn btn-secondary w-full">
                Create your account
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
