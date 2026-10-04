import Link from "next/link";
import { redirect } from "next/navigation";
import { databaseFailureMessage } from "@/lib/database";
import { isConfigured } from "@/lib/config";
import { isFrameworkControlFlow, requiredSetupToken, type SetupCheck } from "@/lib/setup-gate";
import { getCurrentUser } from "@/server/dal";
import { checkFirstAccount } from "@/server/setup";
import { SetupForm } from "@/app/setup/setup-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Create your account" };

export default async function SetupPage() {
  if (!isConfigured()) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="font-display text-4xl">Builder Buddy is closed</h1>
        <p className="mt-3 text-lg">Setup stays shut until AUTH_SECRET and DATABASE_URL are set.</p>
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
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-10">
      <p className="font-bold text-stone">First account</p>
      <h1 className="font-display text-5xl leading-none">Create your account</h1>
      {check.state !== "closed" ? (
        <>
          {check.state === "unavailable" ? (
            <p role="alert" className="mt-3 rounded-xl bg-blush px-3 py-2 font-bold text-clay">
              {check.message}
            </p>
          ) : (
            <p className="mt-3 text-lg">
              This sets up your business. It can only be done once, while Builder Buddy has no accounts.
            </p>
          )}
          <div className="card mt-6">
            <SetupForm tokenRequired={requiredSetupToken(process.env.SETUP_TOKEN) !== null} />
          </div>
        </>
      ) : (
        <>
          <p className="mt-3 text-lg">An account already exists. Sign in with that email.</p>
          <Link href="/login" className="btn btn-primary mt-6 w-full sm:w-auto">
            Sign in
          </Link>
        </>
      )}
    </main>
  );
}
