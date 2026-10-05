"use server";

import { redirect } from "next/navigation";
import { isCoverageBasis, starterCoverage, type CoverageBasis } from "@/lib/coverage";
import type { ActionState } from "@/lib/form-state";
import { parseCrewFields } from "@/lib/crew";
import { parseRoomInputs, parseWastagePercent, quoteFromMeasure, type RoomInput } from "@/lib/measure";
import {
  extraMeasureLines,
  materialsForChoices,
  measurePlanFor,
  normaliseChoices,
  serialiseMeasureSelection,
} from "@/lib/measure-plan";
import { parsePoundsToPence } from "@/lib/money";
import { tenantWhere } from "@/lib/tenancy";
import { findStarterTemplate, isRetiredTemplateName, PLASTERING_STARTER_TEMPLATES } from "@/lib/trade-starters";
import { writeCrewDefaults } from "@/server/crew-store";
import { requireUser } from "@/server/dal";
import { getPrisma } from "@/server/prisma";
import { noteQuoteMade } from "@/server/quote-progress";
import { revalidateDesk } from "@/server/revalidate";

function decimal(value: number | null): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return value.toFixed(2);
}

export async function saveMeasuredQuote(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const jobId = String(formData.get("jobId") ?? "");
  const typeKey = String(formData.get("typeKey") ?? "");
  const typeName = String(formData.get("typeName") ?? "").trim().slice(0, 80);
  let rooms: RoomInput[];
  try {
    const checked = parseRoomInputs(JSON.parse(String(formData.get("rooms") ?? "")));
    if (!checked) return { error: "Check the room sizes and try again." };
    rooms = checked;
  } catch {
    return { error: "Check the room sizes and try again." };
  }
  const wastage = parseWastagePercent(String(formData.get("wastagePercent") ?? ""));
  if (!wastage.ok) return { error: wastage.error };
  const crew = parseCrewFields(formData);
  if (!crew.ok) return { error: crew.error };
  const dayRate = parsePoundsToPence(String(formData.get("dayRate") ?? ""));
  if (!dayRate.ok) return { error: dayRate.error };
  const dayCountRaw = String(formData.get("dayCount") ?? "").trim();
  let dayCount: number | null = crew.crew.days;
  if (!formData.has("crewDays") && dayCountRaw) {
    if (!/^\d+(\.\d{1,2})?$/.test(dayCountRaw)) return { error: "Enter the days as a number, such as 1 or 1.5." };
    dayCount = Number(dayCountRaw);
    if (dayCount <= 0 || dayCount > 60) return { error: "Enter the days from 0.5 to 60, or leave them blank." };
  }

  const job = await getPrisma().job.findFirst({
    where: { id: jobId, ...tenantWhere(user.businessId) },
    select: { id: true, trade: true, description: true, shareToken: true },
  });
  if (!job) return { error: "That job could not be found." };

  const prepared = await materialsForMeasure(user.businessId, job.trade, typeKey);
  if (!prepared) return { error: "That job type could not be found." };
  let choiceRaw: unknown = {};
  let includedRaw: unknown = null;
  try {
    choiceRaw = JSON.parse(String(formData.get("choices") ?? "{}"));
    includedRaw = JSON.parse(String(formData.get("included") ?? "null"));
  } catch {
    return { error: "Check the materials and try again." };
  }
  const choices = normaliseChoices(prepared.plan, choiceRaw && typeof choiceRaw === "object" ? (choiceRaw as Record<string, unknown>) : {});
  const included = Array.isArray(includedRaw)
    ? includedRaw.filter((item): item is string => typeof item === "string").slice(0, 40)
    : null;
  const rate = await getPrisma().labourRate.findUnique({
    where: { businessId_jobTypeKey: { businessId: user.businessId, jobTypeKey: typeKey } },
    select: { labourPerM2Pence: true },
  });
  const quote = quoteFromMeasure({
    rooms,
    materials: materialsForChoices(prepared.materials, prepared.plan, choices),
    wastagePercent: wastage.percent,
    labourPerM2Pence: rate?.labourPerM2Pence ?? null,
    dayRatePence: formData.has("crewDays") ? null : dayRate.pence,
    dayCount: formData.has("crewDays") ? null : dayCount,
    crew: formData.has("crewDays") ? crew.crew : null,
    included,
  });
  const lines = quote.lines.filter((line) => line.quantity && (included == null || included.includes(line.name)));
  if (lines.length === 0) return { error: "Enter a room size before adding this to the quote." };

  await getPrisma().$transaction(async (tx) => {
    await tx.roomMeasure.deleteMany({ where: { jobId: job.id, ...tenantWhere(user.businessId) } });
    await tx.jobMaterial.deleteMany({ where: { jobId: job.id, ...tenantWhere(user.businessId), fromMeasure: true } });
    await tx.job.update({
      where: { id: job.id },
      data: {
        wastagePercent: wastage.percent,
        measureTypeKey: typeKey,
        measureTypeName: typeName || prepared.name,
        dayRatePence: formData.has("crewDays") ? null : dayRate.pence,
        dayCount: dayCount == null ? null : dayCount.toFixed(2),
        measureSelection: serialiseMeasureSelection(choices, included ?? []),
        description: job.description.trim() ? undefined : prepared.description,
      },
    });
    if (formData.has("crewDays")) {
      for (const role of crew.crew.roles) {
        await tx.jobCrew.upsert({
          where: { jobId_role: { jobId: job.id, role: role.role } },
          create: {
            businessId: user.businessId,
            jobId: job.id,
            role: role.role,
            count: role.count,
            basis: role.basis,
            ratePence: role.ratePence,
          },
          update: { count: role.count, basis: role.basis, ratePence: role.ratePence },
        });
      }
    }
    await tx.roomMeasure.createMany({
      data: rooms.map((room, index) => ({
        businessId: user.businessId,
        jobId: job.id,
        name: room.name,
        mode: room.mode,
        lengthM: decimal(room.lengthM),
        widthM: decimal(room.widthM),
        heightM: decimal(room.heightM),
        includeWalls: room.includeWalls,
        includeCeiling: room.includeCeiling,
        directAreaM2: decimal(room.directAreaM2),
        doorCount: room.doorCount,
        doorAreaM2: decimal(room.doorAreaM2) ?? "1.90",
        windowCount: room.windowCount,
        windowAreaM2: decimal(room.windowAreaM2) ?? "1.50",
        externalCorners: room.externalCorners,
        stopBeadM: decimal(room.stopBeadM) ?? "0.00",
        sortOrder: index,
      })),
    });
    const existing = await tx.jobMaterial.findFirst({
      where: { jobId: job.id },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    let sortOrder = (existing?.sortOrder ?? -1) + 1;
    for (const line of lines) {
      await tx.jobMaterial.create({
        data: {
          businessId: user.businessId,
          jobId: job.id,
          name: line.name,
          quantity: line.quantity ?? "1",
          unit: line.unit,
          unitPricePence: line.unitPricePence,
          costPricePence: null,
          fromMeasure: true,
          sortOrder,
        },
      });
      sortOrder += 1;
    }
  });
  await noteQuoteMade(job.id);
  revalidateDesk(job.id, job.shareToken);
  redirect(`/jobs/${job.id}#materials`);
}

async function materialsForMeasure(businessId: string, trade: string, typeKey: string) {
  const saved = await getPrisma().savedMaterial.findMany({
    where: { ...tenantWhere(businessId), trade },
    select: { name: true, unitPricePence: true, coverageBasis: true, coverageAmount: true },
  });
  const savedByName = new Map(saved.map((item) => [item.name.trim().toLowerCase(), item]));
  const starter = typeKey.startsWith("template:") ? null : findStarterTemplate(typeKey);
  if (starter && !starter.retired && starter.trade === trade) {
    const plan = measurePlanFor(starter.id);
    const materials = [
      ...starter.items.map((item) => lineFrom(item.name, item.unit, item.unitPricePence, savedByName, starter.id)),
      ...extraMeasureLines(plan, starter.items.map((item) => item.name)).map((item) =>
        lineFrom(item.name, item.unit, item.unitPricePence, savedByName, starter.id),
      ),
    ];
    return { name: starter.name, description: starter.description, materials, plan };
  }
  if (!typeKey.startsWith("template:")) return null;
  const template = await getPrisma().materialTemplate.findFirst({
    where: { id: typeKey.slice("template:".length), ...tenantWhere(businessId), trade },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!template || isRetiredTemplateName(template.name)) return null;
  const matched = PLASTERING_STARTER_TEMPLATES.find((item) => item.name.toLowerCase() === template.name.toLowerCase());
  const plan = measurePlanFor(matched?.id ?? "");
  const source: Array<{ name: string; unit: string; unitPricePence: number | null; coverageBasis?: string; coverageAmount?: unknown }> = [
    ...template.items.map((item) => ({ name: item.name, unit: item.unit, unitPricePence: item.unitPricePence, coverageBasis: item.coverageBasis, coverageAmount: item.coverageAmount })),
    ...extraMeasureLines(plan, template.items.map((item) => item.name)),
  ];
  return {
    name: template.name,
    description: "",
    plan,
    materials: source.map((item) => {
      const stored =
        item.coverageBasis && item.coverageAmount != null && isCoverageBasis(item.coverageBasis)
          ? { basis: item.coverageBasis, perUnit: Number(item.coverageAmount) }
          : null;
      const line = lineFrom(item.name, item.unit, item.unitPricePence, savedByName, matched?.id ?? "");
      return stored ? { ...line, coverage: stored.perUnit > 0 ? stored : line.coverage } : line;
    }),
  };
}

function lineFrom(
  name: string,
  unit: string,
  unitPricePence: number | null,
  savedByName: Map<string, { unitPricePence: number | null; coverageBasis: string; coverageAmount: unknown }>,
  starterId: string,
) {
  const saved = savedByName.get(name.trim().toLowerCase());
  const savedCoverage =
    saved && isCoverageBasis(saved.coverageBasis) && saved.coverageAmount != null
      ? { basis: saved.coverageBasis as CoverageBasis, perUnit: Number(saved.coverageAmount) }
      : null;
  const guide = starterId ? starterCoverage(starterId, name) : null;
  return {
    name,
    unit,
    unitPricePence: saved?.unitPricePence ?? unitPricePence,
    coverage: savedCoverage && savedCoverage.perUnit > 0 ? savedCoverage : guide,
  };
}

export async function saveLabourRate(formData: FormData): Promise<void> {
  const user = await requireUser();
  const jobTypeKey = String(formData.get("jobTypeKey") ?? "").slice(0, 80);
  if (!jobTypeKey) redirect("/library");
  const parsed = parsePoundsToPence(String(formData.get("labourPerM2") ?? ""));
  if (!parsed.ok) redirect("/library?notice=labour");
  if (parsed.pence == null) {
    await getPrisma().labourRate.deleteMany({ where: { ...tenantWhere(user.businessId), jobTypeKey } });
  } else {
    await getPrisma().labourRate.upsert({
      where: { businessId_jobTypeKey: { businessId: user.businessId, jobTypeKey } },
      create: { businessId: user.businessId, jobTypeKey, labourPerM2Pence: parsed.pence },
      update: { labourPerM2Pence: parsed.pence },
    });
  }
  revalidateDesk();
  redirect("/library?notice=labour-saved");
}

export async function saveBusinessMeasure(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (user.role !== "OWNER") redirect("/settings?notice=owner");
  const wastage = parseWastagePercent(String(formData.get("wastagePercent") ?? ""));
  if (!wastage.ok) redirect("/settings?notice=wastage");
  await getPrisma().business.update({ where: { id: user.businessId }, data: { wastagePercent: wastage.percent } });
  const crewSaved = await writeCrewDefaults(user.businessId, formData);
  if (!crewSaved) redirect("/settings?notice=wastage");
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("labour:") || typeof value !== "string") continue;
    const jobTypeKey = key.slice("labour:".length).slice(0, 80);
    if (!jobTypeKey) continue;
    const parsed = parsePoundsToPence(value);
    if (!parsed.ok) redirect("/settings?notice=wastage");
    if (parsed.pence == null) {
      await getPrisma().labourRate.deleteMany({ where: { businessId: user.businessId, jobTypeKey } });
    } else {
      await getPrisma().labourRate.upsert({
        where: { businessId_jobTypeKey: { businessId: user.businessId, jobTypeKey } },
        create: { businessId: user.businessId, jobTypeKey, labourPerM2Pence: parsed.pence },
        update: { labourPerM2Pence: parsed.pence },
      });
    }
  }
  revalidateDesk();
  redirect("/settings?saved=measure");
}

export async function saveMaterialCoverage(formData: FormData): Promise<void> {
  const user = await requireUser();
  const savedId = String(formData.get("savedId") ?? "");
  const starterId = String(formData.get("starterId") ?? "");
  const basisRaw = String(formData.get("coverageBasis") ?? "");
  const amountRaw = String(formData.get("coverageAmount") ?? "").trim();
  const clear = !amountRaw || !isCoverageBasis(basisRaw);
  let amount: number | null = null;
  if (!clear) {
    if (!/^\d+(\.\d{1,2})?$/.test(amountRaw)) redirect("/library?notice=coverage");
    amount = Number(amountRaw);
    if (amount <= 0 || amount > 10000) redirect("/library?notice=coverage");
  }
  if (savedId) {
    await getPrisma().savedMaterial.updateMany({
      where: { id: savedId, ...tenantWhere(user.businessId) },
      data: clear ? { coverageBasis: "", coverageAmount: null } : { coverageBasis: basisRaw, coverageAmount: amount },
    });
  } else {
    const { findStarterMaterial } = await import("@/lib/trade-starters");
    const starter = findStarterMaterial(starterId);
    if (!starter || clear) redirect("/library?notice=coverage");
    await getPrisma().savedMaterial.upsert({
      where: { businessId_trade_name: { businessId: user.businessId, trade: starter.trade, name: starter.name } },
      create: {
        businessId: user.businessId,
        userId: user.id,
        trade: starter.trade,
        name: starter.name,
        unit: starter.unit,
        unitPricePence: starter.unitPricePence,
        coverageBasis: basisRaw,
        coverageAmount: amount,
      },
      update: { coverageBasis: basisRaw, coverageAmount: amount },
    });
  }
  revalidateDesk();
  redirect("/library?notice=coverage-saved");
}

