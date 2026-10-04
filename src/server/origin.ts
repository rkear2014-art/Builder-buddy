import "server-only";
import { headers } from "next/headers";

function safeOrigin(proto: string, host: string): string | null {
  if (proto !== "http" && proto !== "https") return null;
  if (!/^[A-Za-z0-9.:-]+$/.test(host)) return null;
  return `${proto}://${host}`;
}

export async function requestOrigin(): Promise<string> {
  const configured = process.env.APP_ORIGIN?.replace(/\/$/, "");
  if (configured && /^https?:\/\/[A-Za-z0-9.:-]+$/.test(configured)) {
    return configured;
  }
  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  return safeOrigin(proto, host) ?? "";
}
