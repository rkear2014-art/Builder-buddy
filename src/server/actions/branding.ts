"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { accentFromImage, DEFAULT_ACCENT, isReplacedAccent, normaliseAccent } from "@/lib/accent";
import { parseQuoteSettings } from "@/lib/quote";
import { businessLogoQuery, canEditBusiness, parseBusinessProfile, parseOwnerName } from "@/lib/branding";
import type { ActionState } from "@/lib/form-state";
import { AK_HERO_CAPTION, MAX_HERO_PHOTOS, missingSampleHeroKeys } from "@/lib/heroes";
import { detectLogoMime, MAX_HERO_STORED_BYTES, MAX_LOGO_UPLOAD_BYTES, prepareHero, prepareLogo } from "@/lib/logo";
import { requireUser } from "@/server/dal";
import { readSampleHero } from "@/server/sample-heroes";
import { readBundledLogo, readBundledMark } from "@/server/sample-logo";
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

export async function saveQuoteSettings(_state: ActionState, formData: FormData): Promise<ActionState> {
  const owner = await ownerBusinessId();
  if ("error" in owner) return { error: owner.error };
  const parsed = parseQuoteSettings(formData);
  if (!parsed.ok) return { error: parsed.error };
  await getPrisma().business.update({
    where: { id: owner.id },
    data: parsed.data,
  });
  refreshBranding();
  redirect("/settings?saved=quote");
}

export async function saveOwnerName(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!canEditBusiness(user.role)) {
    return { error: "Only the owner can change the business details." };
  }
  const parsed = parseOwnerName(formData);
  if (!parsed.ok) return { error: parsed.error };
  await getPrisma().user.update({
    where: { id: user.id },
    data: { name: parsed.data.name },
  });
  refreshBranding();
  redirect("/settings?saved=name");
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
  const sampled = !current?.accent || isReplacedAccent(current.accent) ? await accentFromImage(prepared.bytes) : null;
  const accent = sampled == null ? undefined : isReplacedAccent(sampled) ? DEFAULT_ACCENT : sampled;
  await getPrisma().business.update({
    where: { id: businessId },
    data: {
      logoBytes: Buffer.from(prepared.bytes),
      logoMime: prepared.mime,
      logoUpdatedAt: new Date(),
      markBytes: null,
      markMime: null,
      markUpdatedAt: new Date(),
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
    data: {
      logoBytes: null,
      logoMime: null,
      logoUpdatedAt: new Date(),
      markBytes: null,
      markMime: null,
      markUpdatedAt: new Date(),
    },
  });
  refreshBranding();
  redirect("/settings?saved=removed");
}

export async function useSampleLogo(): Promise<void> {
  const owner = await ownerBusinessId();
  if ("error" in owner) redirect("/settings?notice=owner");
  let logo: Uint8Array;
  let mark: Uint8Array;
  try {
    logo = await readBundledLogo();
    mark = await readBundledMark();
  } catch {
    redirect("/settings?notice=sample");
  }
  if (
    detectLogoMime(logo) !== "image/webp" ||
    detectLogoMime(mark) !== "image/webp" ||
    logo.byteLength === 0 ||
    mark.byteLength === 0 ||
    logo.byteLength > MAX_LOGO_UPLOAD_BYTES ||
    mark.byteLength > MAX_LOGO_UPLOAD_BYTES
  ) {
    redirect("/settings?notice=sample");
  }
  const current = await getPrisma().business.findFirst({
    where: { id: owner.id },
    select: { accent: true },
  });
  const storedAccent = current?.accent.toLowerCase() ?? "";
  const accent = !storedAccent || isReplacedAccent(storedAccent) ? DEFAULT_ACCENT : undefined;
  await getPrisma().business.update({
    where: { id: owner.id },
    data: {
      logoBytes: Buffer.from(logo),
      logoMime: "image/webp",
      logoUpdatedAt: new Date(),
      markBytes: Buffer.from(mark),
      markMime: "image/webp",
      markUpdatedAt: new Date(),
      ...(accent ? { accent } : {}),
    },
  });
  refreshBranding();
  redirect("/settings?saved=sample");
}

function captionFromForm(formData: FormData): string {
  return String(formData.get("caption") ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export async function uploadHeroPhoto(_state: ActionState, formData: FormData): Promise<ActionState> {
  const owner = await ownerBusinessId();
  if ("error" in owner) return { error: owner.error };
  const files = formData
    .getAll("hero")
    .filter((file): file is File => file instanceof File && file.size > 0);
  if (files.length === 0) return { error: "Choose a PNG, JPG, or WebP photo." };
  if (files.length > 6) return { error: "Add up to 6 photos at a time." };
  const existing = await getPrisma().heroPhoto.findMany({
    where: { businessId: owner.id },
    select: { sortOrder: true },
  });
  if (existing.length + files.length > MAX_HERO_PHOTOS) {
    return { error: "This business can keep 12 dashboard photos. Remove one before adding more." };
  }
  const prepared: Array<{ bytes: Uint8Array; mime: "image/webp" }> = [];
  for (const file of files) {
    if (file.size > MAX_LOGO_UPLOAD_BYTES) {
      return { error: "That photo is larger than 2 MB. Choose a smaller picture." };
    }
    const result = await prepareHero(new Uint8Array(await file.arrayBuffer()));
    if ("error" in result) return { error: result.error };
    prepared.push(result);
  }
  const caption = captionFromForm(formData);
  let sortOrder = existing.reduce((max, photo) => Math.max(max, photo.sortOrder), -1) + 1;
  await getPrisma().$transaction(async (tx) => {
    for (const photo of prepared) {
      await tx.heroPhoto.create({
        data: {
          businessId: owner.id,
          bytes: Buffer.from(photo.bytes),
          mime: photo.mime,
          caption,
          sourceKey: `upload:${crypto.randomUUID()}`,
          sortOrder,
        },
      });
      sortOrder += 1;
    }
  });
  refreshBranding();
  redirect(`/settings?saved=hero&added=${prepared.length}`);
}

export async function removeHeroPhoto(formData: FormData): Promise<void> {
  const owner = await ownerBusinessId();
  if ("error" in owner) redirect("/settings?notice=owner");
  const photoId = String(formData.get("photoId") ?? "");
  if (!photoId) redirect("/settings");
  await getPrisma().heroPhoto.deleteMany({ where: { id: photoId, businessId: owner.id } });
  refreshBranding();
  redirect("/settings?saved=hero-removed");
}

export async function useSampleHeroes(): Promise<void> {
  const owner = await ownerBusinessId();
  if ("error" in owner) redirect("/settings?notice=owner");
  const existing = await getPrisma().heroPhoto.findMany({
    where: { businessId: owner.id },
    select: { sourceKey: true, sortOrder: true },
  });
  const missing = missingSampleHeroKeys(existing.map((photo) => photo.sourceKey));
  const room = MAX_HERO_PHOTOS - existing.length;
  if (missing.length === 0) redirect("/settings?saved=heroes&added=0");
  if (room <= 0) redirect("/settings?notice=heroes-full");
  const chosen = missing.slice(0, room);
  const ready: Array<{ sourceKey: string; bytes: Uint8Array }> = [];
  for (const sourceKey of chosen) {
    let bytes: Uint8Array;
    try {
      bytes = await readSampleHero(sourceKey);
    } catch {
      redirect("/settings?notice=heroes");
    }
    if (
      detectLogoMime(bytes) !== "image/webp" ||
      bytes.byteLength === 0 ||
      bytes.byteLength > MAX_HERO_STORED_BYTES
    ) {
      redirect("/settings?notice=heroes");
    }
    ready.push({ sourceKey, bytes });
  }
  let sortOrder = existing.reduce((max, photo) => Math.max(max, photo.sortOrder), -1) + 1;
  await getPrisma().$transaction(async (tx) => {
    for (const photo of ready) {
      await tx.heroPhoto.create({
        data: {
          businessId: owner.id,
          bytes: Buffer.from(photo.bytes),
          mime: "image/webp",
          caption: AK_HERO_CAPTION,
          sourceKey: photo.sourceKey,
          sortOrder,
        },
      });
      sortOrder += 1;
    }
  });
  refreshBranding();
  redirect(`/settings?saved=heroes&added=${ready.length}`);
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
