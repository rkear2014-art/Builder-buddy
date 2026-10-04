import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isWellFormedShareToken } from "@/lib/access";
import {
  customerHeroSrc,
  deskHeroSrc,
  deskSmallLogoSrc,
  letterheadFromRow,
  toBranding,
  type CustomerLetterhead,
} from "@/lib/branding";
import { HERO_VISIT_COOKIE, pickRotatingHero } from "@/lib/heroes";
import { isConfigured } from "@/lib/config";
import type { JobStatus } from "@/lib/constants";
import { addDays, isoToUtcDate, londonHour, londonToday, utcDateToIso, weekDates } from "@/lib/dates";
import type { DeskJob, JobSummary, MaterialTemplateView, SavedItem, SessionUser } from "@/lib/desk";
import { buildGlance, glanceChips, type GlanceJob, type GlancePage } from "@/lib/glance";
import { parseQuoteChips, quoteReference, type QuoteChrome } from "@/lib/quote";
import { materialsTotals, quantityFromStored } from "@/lib/materials";
import { presentShare, type SharePresentation } from "@/lib/share";
import { tenantWhere } from "@/lib/tenancy";
import { SESSION_COOKIE, decryptSession } from "@/lib/session-token";
import { getPrisma } from "@/server/prisma";

const businessBrandingSelect = {
  name: true,
  phone: true,
  email: true,
  address: true,
  website: true,
  tagline: true,
  accent: true,
  logoMime: true,
  logoUpdatedAt: true,
  markMime: true,
  markUpdatedAt: true,
  vatRegistered: true,
  vatRatePercent: true,
  quoteLetter: true,
  quoteChips: true,
} as const;

const jobInclude = {
  materials: { orderBy: { sortOrder: "asc" as const } },
  signOff: true,
  user: { select: { name: true } },
  business: { select: businessBrandingSelect },
};

type JobWithRelations = NonNullable<Awaited<ReturnType<typeof findJobRow>>>;

async function findJobRow(where: { id: string; businessId: string } | { shareToken: string }) {
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
    businessName: job.business.name,
    customerName: job.customerName,
    address: job.address,
    phone: job.phone,
    email: job.email,
    trade: job.trade,
    description: job.description,
    internalNotes: job.internalNotes,
    scheduledDate: utcDateToIso(job.scheduledDate),
    timeSlot: job.timeSlot,
    showLinePrices: job.showLinePrices,
    depositPence: job.depositPence,
    vatRegistered: job.business.vatRegistered,
    vatRatePercent: job.business.vatRatePercent,
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
  const user = await getPrisma().user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      businessId: true,
      business: { select: businessBrandingSelect },
    },
  });
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    businessId: user.businessId,
    businessName: user.business.name,
    branding: toBranding(user.business),
  };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function listJobs(
  businessId: string,
  filter: { status?: JobStatus; query?: string },
): Promise<JobSummary[]> {
  const query = filter.query?.trim();
  const jobs = await getPrisma().job.findMany({
    where: {
      ...tenantWhere(businessId),
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

export async function getHome(businessId: string): Promise<{
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
      where: { ...tenantWhere(businessId), scheduledDate: todayDate },
      include: { materials: { select: { bought: true } }, signOff: { select: { id: true } } },
      orderBy: { customerName: "asc" },
    }),
    prisma.job.findMany({
      where: { ...tenantWhere(businessId), scheduledDate: { gt: todayDate, lte: upcomingEnd } },
      include: { materials: { select: { bought: true } }, signOff: { select: { id: true } } },
      orderBy: [{ scheduledDate: "asc" }, { customerName: "asc" }],
    }),
    prisma.job.groupBy({
      by: ["status"],
      where: tenantWhere(businessId),
      _count: { _all: true },
    }),
    prisma.job.findMany({
      where: {
        ...tenantWhere(businessId),
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

const glanceInclude = {
  materials: { select: { quantity: true, unitPricePence: true } },
  signOff: { select: { id: true } },
  user: { select: { name: true } },
} as const;

function monthEndIso(today: string): string {
  const [year, month] = today.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function mapGlanceJob(job: {
  id: string;
  customerName: string;
  address: string;
  trade: string;
  status: JobStatus;
  scheduledDate: Date;
  timeSlot: string;
  createdAt: Date;
  updatedAt: Date;
  user: { name: string };
  signOff: { id: string } | null;
  materials: Array<{ quantity: { toString(): string }; unitPricePence: number | null }>;
}): GlanceJob {
  return {
    id: job.id,
    customerName: job.customerName,
    address: job.address,
    trade: job.trade,
    status: job.status,
    scheduledDate: utcDateToIso(job.scheduledDate),
    timeSlot: job.timeSlot,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    assigneeName: job.user.name,
    signed: Boolean(job.signOff),
    totalPence: materialsTotals(
      job.materials.map((material) => ({
        quantity: quantityFromStored(material.quantity.toString()),
        unitPricePence: material.unitPricePence,
      })),
    ).totalPence,
  };
}

export async function countChase(businessId: string): Promise<number> {
  const today = londonToday();
  const start = isoToUtcDate(addDays(today, -90));
  const todayDate = isoToUtcDate(today);
  return getPrisma().job.count({
    where: {
      ...tenantWhere(businessId),
      signOff: null,
      OR: [
        {
          status: { in: ["BOOKED", "IN_PROGRESS"] },
          scheduledDate: { gte: start, lte: todayDate },
        },
        { status: "ENQUIRY", scheduledDate: { gte: start, lt: todayDate } },
      ],
    },
  });
}

export async function getGlance(
  businessId: string,
  branding: SessionUser["branding"],
): Promise<GlancePage> {
  const today = londonToday();
  const now = new Date();
  const start = addDays(today, -90);
  const week = weekDates(today);
  const end = monthEndIso(today) > week[6] ? monthEndIso(today) : week[6];
  const freshSince = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const prisma = getPrisma();
  const [ranged, fresh, recent, grouped] = await Promise.all([
    prisma.job.findMany({
      where: {
        ...tenantWhere(businessId),
        scheduledDate: { gte: isoToUtcDate(start), lte: isoToUtcDate(end) },
      },
      include: glanceInclude,
    }),
    prisma.job.findMany({
      where: { ...tenantWhere(businessId), createdAt: { gte: freshSince } },
      include: glanceInclude,
    }),
    prisma.job.findMany({
      where: tenantWhere(businessId),
      include: glanceInclude,
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    prisma.job.groupBy({
      by: ["status"],
      where: tenantWhere(businessId),
      _count: { _all: true },
    }),
  ]);
  const byId = new Map<string, (typeof ranged)[number]>();
  for (const job of [...ranged, ...fresh, ...recent]) byId.set(job.id, job);
  const enquiryCount = grouped.find((row) => row.status === "ENQUIRY")?._count._all ?? 0;
  const [photos, previousHeroId] = await Promise.all([
    prisma.heroPhoto.findMany({
      where: tenantWhere(businessId),
      select: { id: true, caption: true, updatedAt: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    cookies().then((jar) => jar.get(HERO_VISIT_COOKIE)?.value ?? null),
  ]);
  const hero = pickRotatingHero(photos, previousHeroId);
  const model = buildGlance({
    today,
    hour: londonHour(now),
    now,
    businessName: branding.name,
    enquiryCount,
    jobs: [...byId.values()].map(mapGlanceJob),
  });
  return {
    ...model,
    businessName: branding.name,
    chips: glanceChips(branding.tagline, branding.address),
    logoSrc: deskSmallLogoSrc(branding),
    heroSrc: hero ? deskHeroSrc(hero.id, hero.updatedAt.toISOString()) : null,
    heroId: hero?.id ?? null,
    heroCaption: hero?.caption.trim() ? hero.caption.trim() : null,
    accentColour: branding.accentColour,
    accentInk: branding.accentInk,
  };
}

export async function listHeroPhotos(businessId: string): Promise<
  Array<{ id: string; caption: string; sourceKey: string; updatedAt: string }>
> {
  const photos = await getPrisma().heroPhoto.findMany({
    where: tenantWhere(businessId),
    select: { id: true, caption: true, sourceKey: true, updatedAt: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return photos.map((photo) => ({
    id: photo.id,
    caption: photo.caption,
    sourceKey: photo.sourceKey,
    updatedAt: photo.updatedAt.toISOString(),
  }));
}

export async function getDiaryJobs(businessId: string, fromIso: string, toIso: string): Promise<JobSummary[]> {
  const jobs = await getPrisma().job.findMany({
    where: {
      ...tenantWhere(businessId),
      scheduledDate: { gte: isoToUtcDate(fromIso), lte: isoToUtcDate(toIso) },
    },
    include: { materials: { select: { bought: true } }, signOff: { select: { id: true } } },
    orderBy: [{ scheduledDate: "asc" }, { customerName: "asc" }],
  });
  return jobs.map(mapSummary);
}

export async function getJob(businessId: string, jobId: string): Promise<DeskJob | null> {
  const job = await findJobRow({ id: jobId, ...tenantWhere(businessId) });
  return job ? mapJob(job) : null;
}

export async function getLibrary(businessId: string): Promise<{
  savedItems: SavedItem[];
  templates: MaterialTemplateView[];
}> {
  const prisma = getPrisma();
  const [savedItems, templates] = await Promise.all([
    prisma.savedMaterial.findMany({
      where: tenantWhere(businessId),
      orderBy: [{ trade: "asc" }, { name: "asc" }],
    }),
    prisma.materialTemplate.findMany({
      where: tenantWhere(businessId),
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

export type ShareView = {
  presentation: SharePresentation;
  letterhead: CustomerLetterhead | null;
  quote: QuoteChrome | null;
};

export const getShareView = cache(async (token: string): Promise<ShareView> => {
  if (!isConfigured() || !isWellFormedShareToken(token)) {
    return { presentation: { kind: "not_found" }, letterhead: null, quote: null };
  }
  const job = await getPrisma().job.findUnique({
    where: { shareToken: token },
    include: jobInclude,
  });
  if (!job) return { presentation: presentShare({ token, record: null, signOff: null }), letterhead: null, quote: null };
  const mapped = mapJob(job);
  const photos = await getPrisma().heroPhoto.findMany({
    where: tenantWhere(job.businessId),
    select: { id: true, caption: true, updatedAt: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    take: 4,
  });
  return {
    presentation: presentShare({
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
        showLinePrices: mapped.showLinePrices,
        depositPence: mapped.depositPence,
        vatRegistered: mapped.vatRegistered,
        vatRatePercent: mapped.vatRatePercent,
        materials: mapped.materials,
      },
      signOff: mapped.signOff
        ? { snapshot: mapped.signOff.snapshot, signatureDataUrl: mapped.signOff.signatureDataUrl }
        : null,
    }),
    letterhead: letterheadFromRow(token, job.business),
    quote: {
      reference: quoteReference(job.id),
      preparedBy: job.user.name.trim() || job.business.name,
      letter: job.business.quoteLetter,
      chips: parseQuoteChips(job.business.quoteChips),
      photos: photos.flatMap((photo) => {
        const src = customerHeroSrc(token, photo.id, photo.updatedAt.toISOString());
        return src ? [{ id: photo.id, caption: photo.caption, src }] : [];
      }),
    },
  };
});

export async function getSharePresentation(token: string): Promise<SharePresentation> {
  return (await getShareView(token)).presentation;
}
