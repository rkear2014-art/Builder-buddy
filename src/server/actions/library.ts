"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/form-state";
import { tenantWhere } from "@/lib/tenancy";
import { parseLibraryItemForm, parseMaterialForm, parseTemplateForm } from "@/lib/validators";
import { requireUser } from "@/server/dal";
import { getPrisma, isUniqueConstraint } from "@/server/prisma";
import { revalidateDesk } from "@/server/revalidate";

export async function createSavedItem(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseLibraryItemForm(formData);
  if (!parsed.ok) return { error: parsed.error };
  try {
    await getPrisma().savedMaterial.create({
      data: {
        ...tenantWhere(user.businessId),
        userId: user.id,
        trade: parsed.data.trade,
        name: parsed.data.name,
        unit: parsed.data.unit,
        unitPricePence: parsed.data.unitPricePence,
        costPricePence: parsed.data.costPricePence,
      },
    });
  } catch (error) {
    if (isUniqueConstraint(error)) {
      return { error: "You already have a saved item with that name for this trade." };
    }
    throw error;
  }
  revalidateDesk();
  redirect("/library");
}

export async function deleteSavedItem(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("savedId") ?? "");
  await getPrisma().savedMaterial.deleteMany({ where: { id, ...tenantWhere(user.businessId) } });
  revalidateDesk();
}

export async function createTemplate(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseTemplateForm(formData);
  if (!parsed.ok) return { error: parsed.error };
  const material = parseMaterialForm(formData);
  if (!material.ok) return { error: material.error };
  await getPrisma().materialTemplate.create({
    data: {
      ...tenantWhere(user.businessId),
      userId: user.id,
      name: parsed.data.name,
      trade: parsed.data.trade,
      items: { create: [{ ...material.data, sortOrder: 0 }] },
    },
  });
  revalidateDesk();
  redirect("/library");
}

export async function addTemplateItem(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const templateId = String(formData.get("templateId") ?? "");
  const parsed = parseMaterialForm(formData);
  if (!parsed.ok) return { error: parsed.error };
  const template = await getPrisma().materialTemplate.findFirst({
    where: { id: templateId, ...tenantWhere(user.businessId) },
    include: { items: { select: { sortOrder: true }, orderBy: { sortOrder: "desc" }, take: 1 } },
  });
  if (!template) return { error: "That template could not be found." };
  await getPrisma().materialTemplateItem.create({
    data: {
      templateId: template.id,
      name: parsed.data.name,
      quantity: parsed.data.quantity,
      unit: parsed.data.unit,
      unitPricePence: parsed.data.unitPricePence,
      costPricePence: parsed.data.costPricePence,
      sortOrder: (template.items[0]?.sortOrder ?? -1) + 1,
    },
  });
  revalidateDesk();
  redirect("/library");
}

export async function deleteTemplate(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("templateId") ?? "");
  await getPrisma().materialTemplate.deleteMany({ where: { id, ...tenantWhere(user.businessId) } });
  revalidateDesk();
}
