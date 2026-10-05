import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { isCoverageBasis, starterCoverage } from "@/lib/coverage";
import { startingCrew } from "@/lib/crew";
import { measureDefaults, type MeasureMode, type RoomInput } from "@/lib/measure";
import { extraMeasureLines, measurePlanFor, normaliseChoices, parseMeasureSelection } from "@/lib/measure-plan";
import { isExteriorMeasure } from "@/lib/room-names";
import { findStarterTemplate, isRetiredTemplateName, PLASTERING_STARTER_TEMPLATES } from "@/lib/trade-starters";
import { MeasureForm } from "@/components/measure-form";
import { getBusinessWastage, getJob, getLibrary, listCrewRates, listJobCrew, listLabourRates, listRoomMeasures, requireUser } from "@/server/dal";

export const dynamic = "force-dynamic";

export default async function MeasurePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ starter?: string; template?: string; section?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const user = await requireUser();
  const job = await getJob(user.businessId, id);
  if (!job) notFound();
  const starter = query.starter ? findStarterTemplate(query.starter) : null;
  const typeKeyGuess = query.starter ? query.starter : query.template ? `template:${query.template}` : "";
  const sectionId =
    query.section ||
    job.sections.find((section) => section.typeKey === typeKeyGuess)?.id ||
    job.sections.find((section) => !section.typeKey)?.id ||
    "";
  const [library, rates, crewRates, jobCrew, wastageDefault, saved] = await Promise.all([
    getLibrary(user.businessId),
    listLabourRates(user.businessId),
    listCrewRates(user.businessId),
    listJobCrew(user.businessId, job.id, sectionId || undefined),
    getBusinessWastage(user.businessId),
    listRoomMeasures(user.businessId, job.id, sectionId || undefined),
  ]);
  const template = query.template ? library.templates.find((item) => item.id === query.template) : null;
  if (starter?.retired || (template && isRetiredTemplateName(template.name))) notFound();
  if (!starter && !template) notFound();
  if (starter && starter.trade !== job.trade) notFound();
  if (template && template.trade !== job.trade) notFound();
  if (query.section && !saved) notFound();

  const typeKey = starter ? starter.id : `template:${template?.id}`;
  const typeName = starter?.name ?? template?.name ?? "";
  const place = isExteriorMeasure(typeKey, typeName) ? "wall" : "room";
  const matched = PLASTERING_STARTER_TEMPLATES.find((item) => item.name.toLowerCase() === typeName.toLowerCase());
  const plan = measurePlanFor(starter?.id ?? matched?.id ?? "");
  const savedByName = new Map(library.savedItems.map((item) => [item.name.trim().toLowerCase(), item]));
  const baseItems = starter
    ? starter.items.map((item) => ({
        name: item.name,
        unit: item.unit,
        unitPricePence: item.unitPricePence,
        coverageBasis: "",
        coverageAmount: null as string | null,
      }))
    : (template?.items ?? []);
  const sourceItems = [
    ...baseItems,
    ...extraMeasureLines(plan, baseItems.map((item) => item.name)).map((item) => ({
      name: item.name,
      unit: item.unit,
      unitPricePence: item.unitPricePence,
      coverageBasis: "",
      coverageAmount: null as string | null,
    })),
  ];
  const materials = sourceItems.map((item) => {
    const savedItem = savedByName.get(item.name.trim().toLowerCase());
    const own =
      item.coverageBasis && item.coverageAmount && isCoverageBasis(item.coverageBasis)
        ? { basis: item.coverageBasis, perUnit: Number(item.coverageAmount) }
        : null;
    const fromLibrary =
      savedItem && isCoverageBasis(savedItem.coverageBasis) && savedItem.coverageAmount
        ? { basis: savedItem.coverageBasis, perUnit: Number(savedItem.coverageAmount) }
        : null;
    const guide = starterCoverage(starter?.id ?? matched?.id ?? "", item.name);
    return {
      name: item.name,
      unit: item.unit,
      unitPricePence: savedItem?.unitPricePence ?? item.unitPricePence,
      coverage: fromLibrary ?? own ?? guide,
    };
  });
  const defaults = measureDefaults(starter?.id ?? matched?.id ?? "");
  const sameJob = saved?.measureTypeKey === typeKey;
  const savedSelection = sameJob && saved ? parseMeasureSelection(saved.measureSelection) : null;
  const initialChoices = normaliseChoices(plan, savedSelection?.choices);
  const initialIncluded = savedSelection?.included ?? null;
  const initialRooms: RoomInput[] = sameJob
    ? saved.rooms.map((room) => ({
        ...room,
        mode: (["room", "elevation", "floor", "direct"].includes(room.mode) ? room.mode : defaults.mode) as MeasureMode,
      }))
    : [];
  const rate = rates.find((item) => item.jobTypeKey === typeKey)?.labourPerM2Pence ?? null;
  const crew = startingCrew({
    defaults: crewRates,
    saved: sameJob ? jobCrew : null,
    legacyDayRatePence: sameJob ? saved?.dayRatePence : null,
    legacyDays: sameJob ? saved?.dayCount : null,
    jobTypeLabourPerM2Pence: rate,
  });
  const accent = user.branding.accentColour;

  return (
    <div className="mx-auto grid max-w-3xl gap-4" style={{ "--job-accent": accent } as CSSProperties}>
      <p>
        <Link href={`/jobs/${job.id}/choose${sectionId ? `?section=${sectionId}` : ""}`} className="font-bold underline" style={{ color: accent }}>
          ← Choose a job
        </Link>
      </p>
      <header>
        <p className="text-sm font-extrabold tracking-wide" style={{ color: accent }}>
          {place === "wall" ? "MEASURE THE WALL" : "MEASURE THE ROOM"}
        </p>
        <h1 className="font-display text-4xl leading-tight">{typeName}</h1>
        <p className="mt-1 text-stone">{job.customerName}. Sizes are in metres. Coverage figures are starting guidance until you change them in Library.</p>
      </header>
      <MeasureForm
        jobId={job.id}
        typeKey={typeKey}
        typeName={typeName}
        accent={accent}
        accentInk={user.branding.accentInk}
        materials={materials}
        wastagePercent={sameJob && saved?.wastagePercent != null ? saved.wastagePercent : wastageDefault}
        labourPerM2Pence={rate}
        initialRooms={initialRooms}
        initialDays={crew.days}
        initialRoles={crew.roles}
        defaults={defaults}
        plan={plan}
        initialChoices={initialChoices}
        initialIncluded={initialIncluded}
        vatRegistered={job.vatRegistered}
        vatRatePercent={job.vatRatePercent}
        place={place}
        sectionId={sectionId}
      />
    </div>
  );
}
