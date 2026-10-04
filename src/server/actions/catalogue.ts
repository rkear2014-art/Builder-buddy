"use server";

import { redirect } from "next/navigation";
import { canEditBusiness } from "@/lib/branding";
import { isCatalogueKey } from "@/lib/catalogue";
import { MAX_LOGO_UPLOAD_BYTES, prepareHero } from "@/lib/logo";
import { findStarterTemplate } from "@/lib/trade-starters";
import { tenantWhere } from "@/lib/tenancy";
import { requireUser } from "@/server/dal";
import { getPrisma } from "@/server/prisma";
import { revalidateDesk } from "@/server/revalidate";

async function ownerBusinessId(): Promise<{ id: string } | { error: string }> {
  const user = await requireUser();
  if (!canEditBusiness(user.role)) return { error: "Only the owner can change tile photos." };
  return { id: user.businessId };
}

async function keyBelongs(businessId: string, catalogueKey: string): Promise<boolean> {
  if (!isCatalogueKey(catalogueKey)) return false;
  if (findStarterTemplate(catalogueKey)) return true;
  const template = await getPrisma().materialTemplate.findFirst({
    where: { id: catalogueKey, ...tenantWhere(businessId) },
    select: { id: true },
  });
  return Boolean(template);
}

export async function saveCataloguePhoto(formData: FormData): Promise<void> {
  const owner = await ownerBusinessId();
  if ("error" in owner) redirect("/library?notice=owner");
  const catalogueKey = String(formData.get("catalogueKey") ?? "");
  if (!(await keyBelongs(owner.id, catalogueKey))) redirect("/library?notice=photo");
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) redirect("/library?notice=photo");
  if (file.size > MAX_LOGO_UPLOAD_BYTES) redirect("/library?notice=photo");
  const prepared = await prepareHero(new Uint8Array(await file.arrayBuffer()));
  if ("error" in prepared) redirect("/library?notice=photo");
  await getPrisma().cataloguePhoto.upsert({
    where: { businessId_catalogueKey: { businessId: owner.id, catalogueKey } },
    create: {
      businessId: owner.id,
      catalogueKey,
      bytes: Buffer.from(prepared.bytes),
      mime: prepared.mime,
    },
    update: {
      bytes: Buffer.from(prepared.bytes),
      mime: prepared.mime,
    },
  });
  revalidateDesk();
  redirect("/library?notice=photo-saved");
}

export async function removeCataloguePhoto(formData: FormData): Promise<void> {
  const owner = await ownerBusinessId();
  if ("error" in owner) redirect("/library?notice=owner");
  const catalogueKey = String(formData.get("catalogueKey") ?? "");
  if (!isCatalogueKey(catalogueKey)) redirect("/library");
  await getPrisma().cataloguePhoto.deleteMany({
    where: { catalogueKey, ...tenantWhere(owner.id) },
  });
  revalidateDesk();
  redirect("/library?notice=photo-removed");
}
