import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { isCoverageBasis, starterCoverage } from "@/lib/coverage";
import { measureDefaults, type MeasureMode, type RoomInput } from "@/lib/measure";
import { findStarterTemplate, isRetiredTemplateName, PLASTERING_STARTER_TEMPLATES } from "@/lib/trade-starters";
import { MeasureForm } from "@/components/measure-form";
import { getBusinessWastage, getJob, getLibrary, listLabourRates, listRoomMeasures, requireUser } from "@/server/dal";

export const dynamic = "force-dynamic";

export default async function MeasurePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ starter?: string; template?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const user = await requireUser();
  const job = await getJob(user.businessId, id);
  if (!job) notFound();
  const [library, rates, wastageDefault, saved] = await Promise.all([
    getLibrary(user.businessId),
    listLabourRates(user.businessId),
    getBusinessWastage(user.businessId),
    listRoomMeasures(user.businessId, job.id),
  ]);
  const starter = query.starter ? findStarterTemplate(query.starter) : null;
  const template = query.template ? library.templates.find((item) => item.id === query.template) : null;
  if (starter?.retired || (template && isRetiredTemplateName(template.name))) notFound();
  if (!starter && !template) notFound();
  if (starter && starter.trade !== job.trade) notFound();
  if (template && template.trade !== job.trade) notFound();

  const typeKey = starter ? starter.id : `template:${template?.id}`;
  const typeName = starter?.name ?? template?.name ?? "";
  const matched = PLASTERING_STARTER_TEMPLATES.find((item) => item.name.toLowerCase() === typeName.toLowerCase());
  const savedByName = new Map(library.savedItems.map((item) => [item.name.trim().toLowerCase(), item]));
  const sourceItems = starter
    ? starter.items.map((item) => ({
        name: item.name,
        unit: item.unit,
        unitPricePence: item.unitPricePence,
        coverageBasis: "",
        coverageAmount: null as string | null,
      }))
    : (template?.items ?? []);
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
  const initialRooms: RoomInput[] = sameJob
    ? saved.rooms.map((room) => ({
        ...room,
        mode: (["room", "elevation", "floor", "direct"].includes(room.mode) ? room.mode : defaults.mode) as MeasureMode,
      }))
    : [];
  const rate = rates.find((item) => item.jobTypeKey === typeKey)?.labourPerM2Pence ?? null;
  const accent = user.branding.accentColour;

  return (
    <div className="mx-auto grid max-w-3xl gap-4" style={{ "--job-accent": accent } as CSSProperties}>
      <p>
        <Link href={`/jobs/${job.id}/choose`} className="font-bold underline" style={{ color: accent }}>
          ← Choose a job
        </Link>
      </p>
      <header>
        <p className="text-sm font-extrabold tracking-wide" style={{ color: accent }}>
          MEASURE THE ROOM
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
        initialDayRate={sameJob && saved?.dayRatePence != null ? (saved.dayRatePence / 100).toFixed(2) : ""}
        initialDayCount={sameJob && saved?.dayCount ? saved.dayCount : ""}
        defaults={defaults}
      />
    </div>
  );
}
