const ABSOLUTE = /^https?:\/\/[A-Za-z0-9.:-]+$/;

/** Customer links use APP_BASE_URL, then the older APP_ORIGIN, then the request host. */
export function publicBaseUrl(env: Record<string, string | undefined>, requestOrigin: string): string {
  const configured = (env.APP_BASE_URL || env.APP_ORIGIN || "").trim().replace(/\/$/, "");
  if (ABSOLUTE.test(configured)) return configured;
  return requestOrigin.replace(/\/$/, "");
}
