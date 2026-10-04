"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { accentFromImage, normaliseAccent } from "@/lib/accent";
import { businessLogoQuery, canEditBusiness, parseBusinessProfile } from "@/lib/branding";
import type { ActionState } from "@/lib/form-state";
import { MAX_LOGO_UPLOAD_BYTES, prepareHero, prepareLogo } from "@/lib/logo";
import { requireUser } from "@/server/dal";
import { readBundledLogo } from "@/server/sample-logo";
import { getPrisma } from "@/server/prisma";
import { revalidateDesk } from "@/server/revalidate";

function refreshBranding(): void {
  revalidatePath("/", "layout");
  revalidatePath("/settings");
  revalidateDesk();
}

async function ownerBusinessId(): Promise<{ id: string } | { error: string }> {
  const user = await requireUser();
  if (!canEditBusiness(user.role)) {
    return { error: "Only the owner can change the business details." };
  }
  return { id: businessLogoQuery(user.businessId).id };
}

export async function saveBusinessProfile(_state: ActionState, formData: FormData): Promise<ActionState> {
  const owner = await ownerBusinessId();
  if ("error" in owner) return { error: owner.error };
  const parsed = parseBusinessProfile(formData);
  if (!parsed.ok) return { error: parsed.error };
  await getPrisma().business.update({
    where: { id: owner.id },
    data: parsed.data,
  });
  refreshBranding();
  redirect("/settings?saved=profile");
}

async function storeLogo(bytes: Uint8Array, businessId: string): Promise<string | null> {
  const prepared = await prepareLogo(bytes);
  if ("error" in prepared) return prepared.error;
  const current = await getPrisma().business.findFirst({
    where: { id: businessId },
    select: { accent: true },
  });
  const accent = current?.accent ? undefined : await accentFromImage(prepared.bytes);
  await getPrisma().business.update({
    where: { id: businessId },
    data: {
      logoBytes: Buffer.from(prepared.bytes),
      logoMime: prepared.mime,
      logoUpdatedAt: new Date(),
      ...(accent ? { accent } : {}),
    },
  });
  refreshBranding();
  return null;
}

export async function uploadBusinessLogo(_state: ActionState, formData: FormData): Promise<ActionState> {
  const owner = await ownerBusinessId();
  if ("error" in owner) return { error: owner.error };
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a PNG, JPG, or WebP logo." };
  }
  if (file.size > MAX_LOGO_UPLOAD_BYTES) {
    return { error: "That logo is larger than 2 MB. Choose a smaller picture." };
  }
  const error = await storeLogo(new Uint8Array(await file.arrayBuffer()), owner.id);
  if (error) return { error };
  redirect("/settings?saved=logo");
}

export async function removeBusinessLogo(): Promise<void> {
  const owner = await ownerBusinessId();
  if ("error" in owner) redirect("/settings?notice=owner");
  await getPrisma().business.update({
    where: { id: owner.id },
    data: { logoBytes: null, logoMime: null, logoUpdatedAt: new Date() },
  });
  refreshBranding();
  redirect("/settings?saved=removed");
}

export async function useSampleLogo(): Promise<void> {
  const owner = await ownerBusinessId();
  if ("error" in owner) redirect("/settings?notice=owner");
  let bytes: Uint8Array;
  try {
    bytes = await readBundledLogo();
  } catch {
    redirect("/settings?notice=sample");
  }
  const error = await storeLogo(bytes, owner.id);
  if (error) redirect("/settings?notice=sample");
  redirect("/settings?saved=sample");
}

export async function uploadHeroPhoto(_state: ActionState, formData: FormData): Promise<ActionState> {
  const owner = await ownerBusinessId();
  if ("error" in owner) return { error: owner.error };
  const file = formData.get("hero");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a PNG, JPG, or WebP photo." };
  }
  if (file.size > MAX_LOGO_UPLOAD_BYTES) {
    return { error: "That photo is larger than 2 MB. Choose a smaller picture." };
  }
  const prepared = await prepareHero(new Uint8Array(await file.arrayBuffer()));
  if ("error" in prepared) return { error: prepared.error };
  await getPrisma().business.update({
    where: { id: owner.id },
    data: {
      heroBytes: Buffer.from(prepared.bytes),
      heroMime: prepared.mime,
      heroUpdatedAt: new Date(),
    },
  });
  refreshBranding();
  redirect("/settings?saved=hero");
}

export async function removeHeroPhoto(): Promise<void> {
  const owner = await ownerBusinessId();
  if ("error" in owner) redirect("/settings?notice=owner");
  await getPrisma().business.update({
    where: { id: owner.id },
    data: { heroBytes: null, heroMime: null, heroUpdatedAt: new Date() },
  });
  refreshBranding();
  redirect("/settings?saved=hero-removed");
}

export async function saveAccent(_state: ActionState, formData: FormData): Promise<ActionState> {
  const owner = await ownerBusinessId();
  if ("error" in owner) return { error: owner.error };
  const accent = normaliseAccent(String(formData.get("accent") ?? ""));
  if (accent === null) return { error: "Choose a colour." };
  await getPrisma().business.update({
    where: { id: owner.id },
    data: { accent },
  });
  refreshBranding();
  redirect("/settings?saved=accent");
}

export async function useLogoAccent(): Promise<void> {
  const owner = await ownerBusinessId();
  if ("error" in owner) redirect("/settings?notice=owner");
  const business = await getPrisma().business.findFirst({
    where: { id: owner.id },
    select: { logoBytes: true },
  });
  if (!business?.logoBytes) redirect("/settings?notice=accent");
  const accent = await accentFromImage(business.logoBytes);
  await getPrisma().business.update({
    where: { id: owner.id },
    data: { accent },
  });
  refreshBranding();
  redirect("/settings?saved=accent");
}
