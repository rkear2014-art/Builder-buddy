import { CREW_ROLES, isCrewBasis, priceCrew, type CrewInput } from "@/lib/crew";
import { roomAreas, type MeasureMode } from "@/lib/measure";
import { parsePoundsToPence } from "@/lib/money";
import { tenantWhere } from "@/lib/tenancy";
import { getPrisma } from "@/server/prisma";

const MODES = new Set<MeasureMode>(["room", "elevation", "floor", "direct"]);

export async function writeCrewDefaults(businessId: string, formData: FormData): Promise<boolean> {
  for (const meta of CREW_ROLES) {
    if (!formData.has(`crewRate:${meta.id}`) && !formData.has(`crewBasis:${meta.id}`)) continue;
    const basisRaw = String(formData.get(`crewBasis:${meta.id}`) ?? "");
    const basis = isCrewBasis(basisRaw) ? basisRaw : meta.defaultBasis;
    const parsed = parsePoundsToPence(String(formData.get(`crewRate:${meta.id}`) ?? ""));
    if (!parsed.ok) return false;
    await getPrisma().crewRate.upsert({
      where: { businessId_role: { businessId, role: meta.id } },
      create: { businessId, role: meta.id, basis, ratePence: parsed.pence },
      update: { basis, ratePence: parsed.pence },
    });
  }
  return true;
}

export async function measuredAreaM2(businessId: string, jobId: string, sectionId?: string): Promise<number> {
  const rooms = await getPrisma().roomMeasure.findMany({
    where: { jobId, ...tenantWhere(businessId), ...(sectionId ? { sectionId } : {}) },
  });
  return rooms.reduce((sum, room) => {
    const mode = MODES.has(room.mode as MeasureMode) ? (room.mode as MeasureMode) : "room";
    return (
      sum +
      roomAreas({
        name: room.name,
        mode,
        lengthM: room.lengthM == null ? 0 : Number(room.lengthM),
        widthM: room.widthM == null ? 0 : Number(room.widthM),
        heightM: room.heightM == null ? 0 : Number(room.heightM),
        includeWalls: room.includeWalls,
        includeCeiling: room.includeCeiling,
        directAreaM2: room.directAreaM2 == null ? 0 : Number(room.directAreaM2),
        doorCount: room.doorCount,
        doorAreaM2: Number(room.doorAreaM2),
        windowCount: room.windowCount,
        windowAreaM2: Number(room.windowAreaM2),
        externalCorners: room.externalCorners,
        stopBeadM: room.stopBeadM == null ? 0 : Number(room.stopBeadM),
      }).netM2
    );
  }, 0);
}

export function customerLabourLine(crew: CrewInput, totalM2: number) {
  return priceCrew({ ...crew, totalM2 }).customerLine;
}
