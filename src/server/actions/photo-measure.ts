"use server";

import { findStarterTemplate } from "@/lib/trade-starters";
import { photoDraftSchema, placeForJob, roomFromPhotoMeasure, addQuantity, type PhotoDraft } from "@/lib/photo-measure";
import { starterMeasureMaterials } from "@/lib/measure-plan";
import { tenantWhere } from "@/lib/tenancy";
import { requireUser } from "@/server/dal";
import { getPrisma } from "@/server/prisma";
import { noteQuoteMade } from "@/server/quote-progress";
import { revalidateDesk } from "@/server/revalidate";

function decimal(value: number): string {
  return value.toFixed(2);
}

type PricedLine = { name: string; unit: string; unitPricePence: number | null };

async function libraryLines(businessId: string, trade: string, typeKey: string): Promise<Map<string, PricedLine>> {
  const saved = await getPrisma().savedMaterial.findMany({
    where: { ...tenantWhere(businessId), trade },
    select: { name: true, unit: true, unitPricePence: true },
  });
  const savedByName = new Map(saved.map((item) => [item.name.trim().toLowerCase(), item]));
  const lines = new Map<string, PricedLine>();
  const remember = (name: string, unit: string, unitPricePence: number | null) => {
    const key = name.trim().toLowerCase();
    if (!key || lines.has(key)) return;
    const known = savedByName.get(key);
    lines.set(key, {
      name: name.trim(),
      unit: known?.unit || unit,
      unitPricePence: known?.unitPricePence ?? unitPricePence,
    });
  };
  const starter = typeKey.startsWith("template:") ? null : findStarterTemplate(typeKey);
  if (starter) {
    for (const item of starterMeasureMaterials(starter.id)) remember(item.name, item.unit, item.unitPricePence);
    return lines;
  }
  if (!typeKey.startsWith("template:")) return lines;
  const template = await getPrisma().materialTemplate.findFirst({
    where: { id: typeKey.slice("template:".length), ...tenantWhere(businessId), trade },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  for (const item of template?.items ?? []) remember(item.name, item.unit, item.unitPricePence);
  return lines;
}

export async function applyPhotoMeasure(input: {
  jobId: string;
  sectionId: string;
  roomIndex: number | null;
  draft: PhotoDraft;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const parsed = photoDraftSchema.safeParse(input.draft);
  if (!parsed.success) return { ok: false, error: "Check the sizes and try again." };
  const draft = parsed.data;
  if (draft.lengthM <= 0 || draft.heightM <= 0) return { ok: false, error: "Enter the length and height before using these." };

  const job = await getPrisma().job.findFirst({
    where: { id: input.jobId, ...tenantWhere(user.businessId) },
    select: { id: true, trade: true, shareToken: true },
  });
  if (!job) return { ok: false, error: "That job could not be found." };
  const section = await getPrisma().jobSection.findFirst({
    where: { id: input.sectionId, jobId: job.id, ...tenantWhere(user.businessId) },
    include: {
      rooms: { orderBy: { sortOrder: "asc" } },
      materials: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!section) return { ok: false, error: "That job could not be found." };

  const place = placeForJob(section.typeKey, section.title);
  if (place === "room" && section.typeKey !== "plaster-render" && draft.widthM <= 0 && measureNeedsWidth(section.typeKey)) {
    return { ok: false, error: "Enter the width as well." };
  }
  const room = roomFromPhotoMeasure({
    typeKey: section.typeKey,
    place,
    name: draft.name,
    lengthM: draft.lengthM,
    widthM: draft.widthM,
    heightM: draft.heightM,
    openings: draft.openings,
    stopBeadM: draft.stopBeadM,
    angleBeadM: draft.angleBeadM,
  });
  const library = await libraryLines(user.businessId, job.trade, section.typeKey);
  const existingByName = new Map(section.materials.map((material) => [material.name.trim().toLowerCase(), material]));
  const additions = draft.materials.filter((line) => Number(line.quantity) > 0);

  await getPrisma().$transaction(async (tx) => {
    const target = input.roomIndex != null ? section.rooms[input.roomIndex] : undefined;
    const data = {
      name: room.name,
      mode: room.mode,
      lengthM: decimal(room.lengthM),
      widthM: decimal(room.widthM),
      heightM: decimal(room.heightM),
      includeWalls: room.includeWalls,
      includeCeiling: room.includeCeiling,
      directAreaM2: decimal(room.directAreaM2),
      doorCount: room.doorCount,
      doorAreaM2: decimal(room.doorAreaM2),
      windowCount: room.windowCount,
      windowAreaM2: decimal(room.windowAreaM2),
      externalCorners: room.externalCorners,
      stopBeadM: decimal(room.stopBeadM),
    };
    if (target) {
      await tx.roomMeasure.update({ where: { id: target.id }, data });
    } else {
      const sortOrder = (section.rooms.at(-1)?.sortOrder ?? -1) + 1;
      await tx.roomMeasure.create({
        data: {
          ...data,
          businessId: user.businessId,
          jobId: job.id,
          sectionId: section.id,
          sortOrder,
        },
      });
    }

    let sortOrder = (section.materials.at(-1)?.sortOrder ?? -1) + 1;
    for (const line of additions) {
      const key = line.name.trim().toLowerCase();
      const known = library.get(key);
      const existing = existingByName.get(key);
      if (!known && !existing) continue;
      if (existing) {
        await tx.jobMaterial.update({
          where: { id: existing.id },
          data: { quantity: addQuantity(existing.quantity.toString(), line.quantity) },
        });
        continue;
      }
      if (!known) continue;
      await tx.jobMaterial.create({
        data: {
          businessId: user.businessId,
          jobId: job.id,
          sectionId: section.id,
          name: known.name,
          quantity: line.quantity,
          unit: known.unit,
          unitPricePence: known.unitPricePence,
          fromMeasure: true,
          sortOrder,
        },
      });
      sortOrder += 1;
    }
  });

  await noteQuoteMade(job.id);
  revalidateDesk(job.id, job.shareToken);
  return { ok: true };
}

function measureNeedsWidth(typeKey: string): boolean {
  return typeKey !== "plaster-stud-wall";
}
