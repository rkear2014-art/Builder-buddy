import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isWellFormedShareToken } from "@/lib/access";
import { isConfigured } from "@/lib/config";
import type { JobStatus } from "@/lib/constants";
import { addDays, isoToUtcDate, londonToday, utcDateToIso } from "@/lib/dates";
import type { DeskJob, JobSummary, MaterialTemplateView, SavedItem, SessionUser } from "@/lib/desk";
import { quantityFromStored } from "@/lib/materials";
import { presentShare, type SharePresentation } from "@/lib/share";
import { SESSION_COOKIE, decryptSession } from "@/lib/session-token";
import { getPrisma } from "@/server/prisma";

const jobInclude = {
  materials: { orderBy: { sortOrder: "asc" as const } },
  signOff: true,
  user: { select: { businessName: true } },
};

type JobWithRelations = NonNullable<Awaited<ReturnType<typeof findJobRow>>>;

async function findJobRow(where: { id: string; userId: string } | { shareToken: string }) {
  return getPrisma().job.findFirst({
    where,
    include: jobInclude,
  });
}

function mapJob(job: JobWithRelations): DeskJob {
  return {
    id: job.id,
    status: job.status,
    shareToken: job.shareToken,
    businessName: job.user.businessName,
    customerName: job.customerName,
    address: job.address,
    phone: job.phone,
    email: job.email,
    trade: job.trade,
    description: job.description,
    internalNotes: job.internalNotes,
    scheduledDate: utcDateToIso(job.scheduledDate),
    timeSlot: job.timeSlot,
    materials: job.materials.map((material) => ({
      id: material.id,
      name: material.name,
      quantity: quantityFromStored(material.quantity.toString()),
      unit: material.unit,
      unitPricePence: material.unitPricePence,
      costPricePence: material.costPricePence,
      bought: material.bought,
    })),
    signOff: job.signOff
      ? {
          signerName: job.signOff.signerName,
          signedAt: job.signOff.signedAt.toISOString(),
          signatureDataUrl: job.signOff.signatureData,
          snapshot: job.signOff.snapshot,
        }
      : null,
  };
}

function mapSummary(job: {
  id: string;
  customerName: string;
  address: string;
  trade: string;
  description: string;
  scheduledDate: Date;
  timeSlot: string;
  status: JobStatus;
  materials: Array<{ bought: boolean }>;
  signOff: { id: string } | null;
}): JobSummary {
  return {
    id: job.id,
    customerName: job.customerName,
    address: job.address,
    trade: job.trade,
    description: job.description,
    scheduledDate: utcDateToIso(job.scheduledDate),
    timeSlot: job.timeSlot,
    status: job.status,
    boughtCount: job.materials.filter((material) => material.bought).length,
    materialCount: job.materials.length,
    signed: Boolean(job.signOff),
  };
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  if (!isConfigured()) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await decryptSession(token, process.env.AUTH_SECRET);
  if (!session) return null;
  return getPrisma().user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, businessName: true },
  });
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function listJobs(
  userId: string,
  filter: { status?: JobStatus; query?: string },
): Promise<JobSummary[]> {
  const query = filter.query?.trim();
  const jobs = await getPrisma().job.findMany({
    where: {
      userId,
      status: filter.status,
      ...(query
        ? {
            OR: [
              { customerName: { contains: query, mode: "insensitive" } },
              { address: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
              { trade: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      materials: { select: { bought: true } },
      signOff: { select: { id: true } },
    },
    orderBy: [{ scheduledDate: "asc" }, { customerName: "asc" }],
  });
  return jobs.map(mapSummary);
}

export async function getHome(userId: string): Promise<{
  today: string;
  todayJobs: JobSummary[];
  upcoming: JobSummary[];
  counts: Record<JobStatus, number>;
  awaitingSignature: JobSummary[];
}> {
  const today = londonToday();
  const todayDate = isoToUtcDate(today);
  const upcomingEnd = isoToUtcDate(addDays(today, 7));
  const prisma = getPrisma();
  const [todayJobs, upcoming, grouped, awaitingSignature] = await Promise.all([
    prisma.job.findMany({
      where: { userId, scheduledDate: todayDate },
      include: { materials: { select: { bought: true } }, signOff: { select: { id: true } } },
      orderBy: { customerName: "asc" },
    }),
    prisma.job.findMany({
      where: { userId, scheduledDate: { gt: todayDate, lte: upcomingEnd } },
      include: { materials: { select: { bought: true } }, signOff: { select: { id: true } } },
      orderBy: [{ scheduledDate: "asc" }, { customerName: "asc" }],
    }),
    prisma.job.groupBy({
      by: ["status"],
      where: { userId },
      _count: { _all: true },
    }),
    prisma.job.findMany({
      where: {
        userId,
        signOff: null,
        status: { in: ["BOOKED", "IN_PROGRESS"] },
        scheduledDate: { gte: todayDate },
      },
      include: { materials: { select: { bought: true } }, signOff: { select: { id: true } } },
      orderBy: { scheduledDate: "asc" },
      take: 6,
    }),
  ]);
  const counts: Record<JobStatus, number> = {
    ENQUIRY: 0,
    BOOKED: 0,
    IN_PROGRESS: 0,
    COMPLETE: 0,
  };
  for (const row of grouped) {
    counts[row.status] = row._count._all;
  }
  return {
    today,
    todayJobs: todayJobs.map(mapSummary),
    upcoming: upcoming.map(mapSummary),
    counts,
    awaitingSignature: awaitingSignature.map(mapSummary),
  };
}

export async function getDiaryJobs(userId: string, fromIso: string, toIso: string): Promise<JobSummary[]> {
  const jobs = await getPrisma().job.findMany({
    where: {
      userId,
      scheduledDate: { gte: isoToUtcDate(fromIso), lte: isoToUtcDate(toIso) },
    },
    include: { materials: { select: { bought: true } }, signOff: { select: { id: true } } },
    orderBy: [{ scheduledDate: "asc" }, { customerName: "asc" }],
  });
  return jobs.map(mapSummary);
}

export async function getJob(userId: string, jobId: string): Promise<DeskJob | null> {
  const job = await findJobRow({ id: jobId, userId });
  return job ? mapJob(job) : null;
}

export async function getLibrary(userId: string): Promise<{
  savedItems: SavedItem[];
  templates: MaterialTemplateView[];
}> {
  const prisma = getPrisma();
  const [savedItems, templates] = await Promise.all([
    prisma.savedMaterial.findMany({
      where: { userId },
      orderBy: [{ trade: "asc" }, { name: "asc" }],
    }),
    prisma.materialTemplate.findMany({
      where: { userId },
      include: { items: { orderBy: { sortOrder: "asc" } } },
      orderBy: [{ trade: "asc" }, { name: "asc" }],
    }),
  ]);
  return {
    savedItems: savedItems.map((item) => ({
      id: item.id,
      trade: item.trade,
      name: item.name,
      unit: item.unit,
      unitPricePence: item.unitPricePence,
      costPricePence: item.costPricePence,
    })),
    templates: templates.map((template) => ({
      id: template.id,
      name: template.name,
      trade: template.trade,
      items: template.items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: quantityFromStored(item.quantity.toString()),
        unit: item.unit,
        unitPricePence: item.unitPricePence,
        costPricePence: item.costPricePence,
      })),
    })),
  };
}

export async function getSharePresentation(token: string): Promise<SharePresentation> {
  if (!isConfigured() || !isWellFormedShareToken(token)) return { kind: "not_found" };
  const job = await getPrisma().job.findUnique({
    where: { shareToken: token },
    include: jobInclude,
  });
  if (!job) return presentShare({ token, record: null, signOff: null });
  const mapped = mapJob(job);
  return presentShare({
    token,
    record: {
      shareToken: mapped.shareToken,
      businessName: mapped.businessName,
      customerName: mapped.customerName,
      address: mapped.address,
      phone: mapped.phone,
      email: mapped.email,
      trade: mapped.trade,
      description: mapped.description,
      internalNotes: mapped.internalNotes,
      scheduledDate: mapped.scheduledDate,
      timeSlot: mapped.timeSlot,
      materials: mapped.materials,
    },
    signOff: mapped.signOff
      ? { snapshot: mapped.signOff.snapshot, signatureDataUrl: mapped.signOff.signatureDataUrl }
      : null,
  });
}
