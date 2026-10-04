import { redirect } from "next/navigation";
import { isConfigured } from "@/lib/config";
import { getCurrentUser } from "@/server/dal";
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
  const user = await getCurrentUser();
  if (user) redirect("/");
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-10">
      <p className="font-bold text-stone">For the tradesperson</p>
      <h1 className="font-display text-5xl leading-none">Builder Buddy</h1>
      <p className="mt-3 text-lg">Jobs, materials, and a signature the customer can give on their own phone.</p>
      <div className="card mt-6">
        <LoginForm showDemo={process.env.SHOW_DEMO_LOGIN === "true"} />
      </div>
    </main>
  );
}
