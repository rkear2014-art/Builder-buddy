import "server-only";
import { headers } from "next/headers";
import { publicBaseUrl } from "@/lib/base-url";

function safeOrigin(proto: string, host: string): string | null {
  if (proto !== "http" && proto !== "https") return null;
  if (!/^[A-Za-z0-9.:-]+$/.test(host)) return null;
  return `${proto}://${host}`;
}

export async function requestOrigin(): Promise<string> {
  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  return publicBaseUrl(process.env, safeOrigin(proto, host) ?? "");
}
