import { NextResponse, type NextRequest } from "next/server";
import { decideAccess } from "@/lib/access";
import { missingConfiguration } from "@/lib/config";
import { SESSION_COOKIE, decryptSession } from "@/lib/session-token";

function unavailableHtml(): string {
  return `<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Builder Buddy is not configured</title>
    <style>
      body { margin: 0; font-family: "Source Sans 3", sans-serif; background: #f3efe4; color: #1c1915; }
      main { max-width: 36rem; margin: 0 auto; padding: 3rem 1.25rem; }
      h1 { font-size: 2rem; line-height: 1.1; }
      p { font-size: 1.125rem; line-height: 1.5; }
    </style>
  </head>
  <body>
    <main>
      <h1>Builder Buddy is closed</h1>
      <p>The tradesperson pages stay shut until <strong>AUTH_SECRET</strong> (at least 32 characters) and <strong>DATABASE_URL</strong> are set. Nothing is opened to the public while that configuration is missing.</p>
    </main>
  </body>
</html>`;
}

export async function proxy(request: NextRequest) {
  const configured = missingConfiguration().length === 0;
  const session = configured
    ? await decryptSession(request.cookies.get(SESSION_COOKIE)?.value, process.env.AUTH_SECRET)
    : null;
  const decision = decideAccess({
    pathname: request.nextUrl.pathname,
    configured,
    hasValidSession: Boolean(session?.userId),
  });

  if (decision.type === "unavailable") {
    return new NextResponse(unavailableHtml(), {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  if (decision.type === "redirect") {
    return NextResponse.redirect(new URL(decision.to, request.url));
  }

  const response = NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/sign/")) {
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|.*\\.png$).*)"],
};
