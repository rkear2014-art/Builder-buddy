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
import { DIARY_OPEN_STATUSES, MAX_SPAN_DAYS, normaliseBookingKind, shortJobSummary, type DiaryBooking } from "@/lib/diary";
import { postcodeFromAddress } from "@/lib/place";
import type { DeskJob, DeskRoom, JobSummary, MaterialTemplateView, SavedItem, SessionUser } from "@/lib/desk";
import { buildGlance, glanceChips, type GlanceJob, type GlancePage } from "@/lib/glance";
import { formatDocumentNumber, quoteIsExpired } from "@/lib/documents";
import { balancePence, invoiceGlance, invoiceStanding, invoiceTotals, type InvoiceStanding, type PaymentMethod } from "@/lib/invoice";
import { reminderHistoryLabel } from "@/lib/invoice-reminders";
import { chargeVat, parseQuoteChips, quoteMoney, type QuoteChrome } from "@/lib/quote";
import { resolveTermsText } from "@/lib/terms";
import { parseLockedAgreement } from "@/lib/agreement";
import { customerQuoteSections, roomInputFromStored } from "@/lib/quote-breakdown";
import { areasLabelFor, quoteSectionsSubtotal, sectionSubtotalPence, sectionTitle } from "@/lib/quote-sections";
import { trustBadges } from "@/lib/trust";
import { hidesMaterialLines } from "@/lib/customer-price";
import { quantityFromStored } from "@/lib/materials";
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
  vatNumber: true,
  quoteLetter: true,
  quoteChips: true,
  invoiceDueDays: true,
  quoteValidDays: true,
  bankAccountName: true,
  bankSortCode: true,
  bankAccountNumber: true,
  insurer: true,
  coverAmount: true,
  guarantee: true,
  accreditations: true,
  reviewUrl: true,
  totalOnlyDefault: true,
  showQuoteRooms: true,
  terms: true,
  remindersOn: true,
  reminderDay1: true,
  reminderDay2: true,
  reminderDay3: true,
} as const;

const jobInclude = {
  materials: { orderBy: { sortOrder: "asc" as const } },
  rooms: { orderBy: { sortOrder: "asc" as const } },
  sections: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      materials: { orderBy: { sortOrder: "asc" as const } },
      rooms: { orderBy: { sortOrder: "asc" as const } },
      crew: true,
    },
  },
  signOff: true,
  user: { select: { name: true } },
  business: { select: businessBrandingSelect },
};

function storedNumber(value: { toString(): string } | number | null | undefined, fallback: number): number {
  if (value == null) return fallback;
  const parsed = Number(typeof value === "number" ? value : value.toString());
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapStoredRoom(room: {
  name: string;
  mode: string;
  lengthM: { toString(): string } | null;
  widthM: { toString(): string } | null;
  heightM: { toString(): string } | null;
  includeWalls: boolean;
  includeCeiling: boolean;
  directAreaM2: { toString(): string } | null;
  doorCount: number;
  doorAreaM2: { toString(): string };
  windowCount: number;
  windowAreaM2: { toString(): string };
  externalCorners: number;
  stopBeadM: { toString(): string } | null;
}): DeskRoom {
  return {
    name: room.name,
    mode: room.mode,
    lengthM: storedNumber(room.lengthM, 0),
    widthM: storedNumber(room.widthM, 0),
    heightM: storedNumber(room.heightM, 2.4),
    includeWalls: room.includeWalls,
    includeCeiling: room.includeCeiling,
    directAreaM2: storedNumber(room.directAreaM2, 0),
    doorCount: room.doorCount,
    doorAreaM2: storedNumber(room.doorAreaM2, 1.9),
    windowCount: room.windowCount,
    windowAreaM2: storedNumber(room.windowAreaM2, 1.5),
    externalCorners: room.externalCorners,
    stopBeadM: storedNumber(room.stopBeadM, 0),
  };
}

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
    bookingKind: normaliseBookingKind(job.bookingKind),
    spanDays: job.spanDays >= 1 ? job.spanDays : 1,
    onDiary: job.onDiary,
    assignedName: job.assignedName,
    showLinePrices: job.showLinePrices,
    depositPence: job.depositPence,
    shareActive: job.shareActive,
    surveyDone: job.surveyDone,
    quoteNumber: job.quoteNumber,
    validUntil: utcDateToIso(job.validUntil),
    firstViewedAt: job.firstViewedAt?.toISOString() ?? null,
    lastViewedAt: job.lastViewedAt?.toISOString() ?? null,
    showPhotos: job.showPhotos,
    vatRegistered: chargeVat({ vatRegistered: job.business.vatRegistered, omitVat: job.omitVat }),
    vatRatePercent: job.business.vatRatePercent,
    omitVat: job.omitVat,
    vatNumber: job.business.vatNumber,
    quoteStage: job.quoteStage,
    totalOnly: job.totalOnly,
    fixedPricePence: job.fixedPricePence,
    materials: job.materials.map((material) => ({
      id: material.id,
      name: material.name,
      quantity: quantityFromStored(material.quantity.toString()),
      unit: material.unit,
      unitPricePence: material.unitPricePence,
      costPricePence: material.costPricePence,
      bought: material.bought,
    })),
    sections: job.sections.map((section) => ({
      id: section.id,
      sortOrder: section.sortOrder,
      title: section.title,
      typeKey: section.typeKey,
      fixedPricePence: section.fixedPricePence,
      dayCount: section.dayCount == null ? null : section.dayCount.toString(),
      materials: section.materials.map((material) => ({
        id: material.id,
        name: material.name,
        quantity: quantityFromStored(material.quantity.toString()),
        unit: material.unit,
        unitPricePence: material.unitPricePence,
        costPricePence: material.costPricePence,
        bought: material.bought,
      })),
      rooms: section.rooms.map(mapStoredRoom),
      crew: section.crew.map((member) => ({
        role: member.role,
        count: member.count,
        basis: member.basis,
        ratePence: member.ratePence,
      })),
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
      where: { ...tenantWhere(businessId), onDiary: true, scheduledDate: todayDate },
      include: { materials: { select: { bought: true } }, signOff: { select: { id: true } } },
      orderBy: { customerName: "asc" },
    }),
    prisma.job.findMany({
      where: { ...tenantWhere(businessId), onDiary: true, scheduledDate: { gt: todayDate, lte: upcomingEnd } },
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
        onDiary: true,
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
  materials: { select: { name: true, quantity: true, unit: true, unitPricePence: true } },
  sections: {
    select: {
      title: true,
      typeKey: true,
      fixedPricePence: true,
      materials: { select: { name: true, quantity: true, unit: true, unitPricePence: true } },
    },
  },
  signOff: { select: { id: true } },
  user: { select: { name: true } },
} as const;

function monthEndIso(today: string): string {
  const [year, month] = today.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function mapGlanceJob(
  job: {
    id: string;
    customerName: string;
    address: string;
    trade: string;
    status: JobStatus;
    scheduledDate: Date;
    timeSlot: string;
    createdAt: Date;
    updatedAt: Date;
    omitVat: boolean;
    quoteStage: GlanceJob["quoteStage"];
    fixedPricePence: number | null;
    user: { name: string };
    signOff: { id: string } | null;
    materials: Array<{ name: string; quantity: { toString(): string }; unit: string; unitPricePence: number | null }>;
    sections: Array<{
      title: string;
      typeKey: string;
      fixedPricePence: number | null;
      materials: Array<{ name: string; quantity: { toString(): string }; unit: string; unitPricePence: number | null }>;
    }>;
  },
  vat: { vatRegistered: boolean; vatRatePercent: number },
): GlanceJob {
  const pricedSections =
    job.sections.length > 0
      ? job.sections.map((section) => ({
          title: section.title,
          typeKey: section.typeKey,
          fixedPricePence: section.fixedPricePence,
          materials: section.materials.map((material) => ({
            name: material.name,
            quantity: quantityFromStored(material.quantity.toString()),
            unit: material.unit,
            unitPricePence: material.unitPricePence,
          })),
        }))
      : [
          {
            title: "",
            typeKey: "",
            fixedPricePence: null,
            materials: job.materials.map((material) => ({
              name: material.name,
              quantity: quantityFromStored(material.quantity.toString()),
              unit: material.unit,
              unitPricePence: material.unitPricePence,
            })),
          },
        ];
  const subtotalPence = quoteSectionsSubtotal({
    sections: pricedSections,
    fixedPricePence: job.fixedPricePence,
  });
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
    quoteStage: job.quoteStage ?? undefined,
    totalPence: quoteMoney({
      subtotalPence,
      vatRegistered: chargeVat({ vatRegistered: vat.vatRegistered, omitVat: job.omitVat }),
      vatRatePercent: vat.vatRatePercent,
      depositPence: null,
    }).totalPence,
  };
}

export async function countChase(businessId: string): Promise<number> {
  const today = londonToday();
  const start = isoToUtcDate(addDays(today, -90));
  const todayDate = isoToUtcDate(today);
  return getPrisma().job.count({
    where: {
      ...tenantWhere(businessId),
      onDiary: true,
      quoteStage: { not: "LOST" },
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
  const [ranged, fresh, recent, grouped, readyRows, owner] = await Promise.all([
    prisma.job.findMany({
      where: {
        ...tenantWhere(businessId),
        onDiary: true,
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
    prisma.job.findMany({
      where: {
        ...tenantWhere(businessId),
        quoteStage: "WON",
        onDiary: false,
        status: { not: "COMPLETE" },
      },
      select: {
        id: true,
        customerName: true,
        address: true,
        signOff: { select: { id: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
    prisma.user.findFirst({
      where: { businessId, role: "OWNER" },
      select: { name: true },
      orderBy: { createdAt: "asc" },
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
  const invoiceRows = await prisma.invoice.findMany({
    where: tenantWhere(businessId),
    include: {
      lines: { select: { quantity: true, unitPricePence: true } },
      payments: { select: { amountPence: true, paidOn: true } },
      job: { select: { customerName: true } },
    },
  });
  const glanceInvoices = invoiceGlance({
    today,
    invoices: invoiceRows.map((invoice) => {
      const totals = invoiceTotals({
        lines: invoice.lines.map((line) => ({ quantity: line.quantity.toString(), unitPricePence: line.unitPricePence })),
        vatRegistered: invoice.vatRegistered,
        vatRatePercent: invoice.vatRatePercent,
        depositPence: invoice.depositPence,
      });
      const paidPence = invoice.payments.reduce((sum, payment) => sum + payment.amountPence, 0);
      return {
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        dueDate: utcDateToIso(invoice.dueDate),
        customerName: invoice.job.customerName,
        duePence: totals.duePence,
        paidPence,
        payments: invoice.payments.map((payment) => ({
          amountPence: payment.amountPence,
          paidOn: utcDateToIso(payment.paidOn),
        })),
      };
    }),
  });
  const model = buildGlance({
    today,
    hour: londonHour(now),
    now,
    businessName: branding.name,
    ownerName: owner?.name ?? "",
    enquiryCount,
    jobs: [...byId.values()].filter((job) => job.onDiary).map((job) => mapGlanceJob(job, branding)),
    invoices: glanceInvoices,
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
    readyToBook: readyRows.map((job) => ({
      id: job.id,
      customerName: job.customerName,
      address: job.address,
      signed: Boolean(job.signOff),
    })),
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
      onDiary: true,
      scheduledDate: { gte: isoToUtcDate(fromIso), lte: isoToUtcDate(toIso) },
    },
    include: { materials: { select: { bought: true } }, signOff: { select: { id: true } } },
    orderBy: [{ scheduledDate: "asc" }, { customerName: "asc" }],
  });
  return jobs.map(mapSummary);
}

const diaryBookingSelect = {
  id: true,
  customerName: true,
  address: true,
  postcode: true,
  description: true,
  status: true,
  scheduledDate: true,
  bookingKind: true,
  spanDays: true,
  onDiary: true,
  assignedName: true,
  quoteStage: true,
  user: { select: { name: true } },
} as const;

function toDiaryBooking(job: {
  id: string;
  customerName: string;
  address: string;
  postcode: string;
  description: string;
  status: JobStatus;
  scheduledDate: Date;
  bookingKind: string;
  spanDays: number;
  onDiary: boolean;
  assignedName: string;
  quoteStage: string;
  user: { name: string };
}): DiaryBooking {
  const spanDays = job.spanDays >= 1 && job.spanDays <= MAX_SPAN_DAYS ? job.spanDays : 1;
  const bookingKind = normaliseBookingKind(job.bookingKind);
  return {
    id: job.id,
    customerName: job.customerName,
    postcode: job.postcode.trim() || postcodeFromAddress(job.address),
    summary: shortJobSummary(job.description, bookingKind),
    status: job.status,
    assignedName: job.assignedName.trim() || job.user.name,
    bookingKind,
    spanDays,
    startDate: utcDateToIso(job.scheduledDate),
    onDiary: job.onDiary,
    quoteStage: job.quoteStage,
  };
}

export async function listDiaryBoard(businessId: string, fromIso: string, toIso: string): Promise<DiaryBooking[]> {
  const jobs = await getPrisma().job.findMany({
    where: {
      ...tenantWhere(businessId),
      OR: [
        {
          onDiary: true,
          quoteStage: { not: "LOST" },
          scheduledDate: { gte: isoToUtcDate(fromIso), lte: isoToUtcDate(toIso) },
        },
        { onDiary: false, quoteStage: { not: "LOST" }, status: { in: [...DIARY_OPEN_STATUSES] } },
      ],
    },
    select: diaryBookingSelect,
    orderBy: [{ customerName: "asc" }],
  });
  return jobs.map(toDiaryBooking);
}

/** Enquiry, booked and live jobs that can be put on a tapped day. */
export async function listPlaceableJobs(businessId: string): Promise<DiaryBooking[]> {
  const jobs = await getPrisma().job.findMany({
    where: {
      ...tenantWhere(businessId),
      quoteStage: { not: "LOST" },
      status: { in: [...DIARY_OPEN_STATUSES] },
    },
    select: diaryBookingSelect,
    orderBy: [{ onDiary: "asc" }, { customerName: "asc" }],
  });
  return jobs.map(toDiaryBooking);
}

export async function listCataloguePhotos(
  businessId: string,
): Promise<Array<{ catalogueKey: string; updatedAt: string }>> {
  const photos = await getPrisma().cataloguePhoto.findMany({
    where: tenantWhere(businessId),
    select: { catalogueKey: true, updatedAt: true },
  });
  return photos.map((photo) => ({
    catalogueKey: photo.catalogueKey,
    updatedAt: photo.updatedAt.toISOString(),
  }));
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
      coverageBasis: item.coverageBasis,
      coverageAmount: item.coverageAmount == null ? null : item.coverageAmount.toString(),
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
        coverageBasis: item.coverageBasis,
        coverageAmount: item.coverageAmount == null ? null : item.coverageAmount.toString(),
      })),
    })),
  };
}

export type ShareJobPhoto = {
  id: string;
  stage: "BEFORE" | "DURING" | "AFTER";
  src: string;
};

export type ShareView = {
  presentation: SharePresentation;
  letterhead: CustomerLetterhead | null;
  quote: QuoteChrome | null;
  photos: ShareJobPhoto[];
};

export const getShareView = cache(async (token: string): Promise<ShareView> => {
  if (!isConfigured() || !isWellFormedShareToken(token)) {
    return { presentation: { kind: "not_found" }, letterhead: null, quote: null, photos: [] };
  }
  const job = await getPrisma().job.findUnique({
    where: { shareToken: token },
    include: jobInclude,
  });
  if (!job || !job.shareActive) {
    return { presentation: presentShare({ token, record: null, signOff: null }), letterhead: null, quote: null, photos: [] };
  }
  const mapped = mapJob(job);
  const cookieStore = await cookies();
  const session = await decryptSession(cookieStore.get(SESSION_COOKIE)?.value, process.env.AUTH_SECRET);
  const viewer = session?.userId
    ? await getPrisma().user.findUnique({ where: { id: session.userId }, select: { businessId: true } })
    : null;
  if (!viewer || viewer.businessId !== job.businessId) {
    const now = new Date();
    await getPrisma().job.update({
      where: { id: job.id },
      data: { firstViewedAt: job.firstViewedAt ?? now, lastViewedAt: now },
    });
    mapped.firstViewedAt = (job.firstViewedAt ?? now).toISOString();
    mapped.lastViewedAt = now.toISOString();
  }
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
        totalOnly: mapped.totalOnly,
        fixedPricePence: mapped.fixedPricePence,
        vatRegistered: mapped.vatRegistered,
        vatRatePercent: mapped.vatRatePercent,
        materials: mapped.materials,
        sections: mapped.sections.map((section) => ({
          title: section.title,
          typeKey: section.typeKey,
          fixedPricePence: section.fixedPricePence,
          materials: section.materials.map((line) => ({
            name: line.name,
            quantity: line.quantity,
            unit: line.unit,
            unitPricePence: line.unitPricePence,
          })),
        })),
      },
      signOff: mapped.signOff
        ? { snapshot: mapped.signOff.snapshot, signatureDataUrl: mapped.signOff.signatureDataUrl }
        : null,
    }),
    letterhead: letterheadFromRow(token, job.business),
    quote: {
      reference: formatDocumentNumber("Q", job.quoteNumber),
      preparedBy: job.user.name.trim() || job.business.name,
      letter: job.business.quoteLetter,
      validUntil: mapped.validUntil,
      expired: quoteIsExpired(mapped.validUntil, londonToday(), Boolean(job.signOff)),
      chips: [
        ...trustBadges(job.business),
        ...parseQuoteChips(job.business.quoteChips),
      ].slice(0, 8),
      photos: photos.flatMap((photo) => {
        const src = customerHeroSrc(token, photo.id, photo.updatedAt.toISOString());
        return src ? [{ id: photo.id, caption: photo.caption, src }] : [];
      }),
      ...quoteScopeForCustomer(mapped, job.business.showQuoteRooms !== false),
      terms:
        job.signOff?.termsText.trim() ||
        parseLockedAgreement(job.signOff?.snapshot)?.termsText?.trim() ||
        resolveTermsText(job.business.terms, job.business),
    },
    photos: [],
  };
});

export async function getSharePresentation(token: string): Promise<SharePresentation> {
  return (await getShareView(token)).presentation;
}

export type DeskPhoto = {
  id: string;
  stage: "BEFORE" | "DURING" | "AFTER";
  createdAt: string;
};

export type InvoiceLineView = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  unitPricePence: number | null;
};

export type InvoicePaymentView = {
  id: string;
  amountPence: number;
  paidOn: string;
  method: PaymentMethod;
};

export type InvoiceDetail = {
  id: string;
  jobId: string;
  number: number;
  reference: string;
  shareToken: string;
  standing: InvoiceStanding;
  issueDate: string;
  dueDate: string;
  customerName: string;
  address: string;
  phone: string;
  email: string;
  lines: InvoiceLineView[];
  payments: InvoicePaymentView[];
  subtotalPence: number;
  vatPence: number | null;
  vatRatePercent: number;
  totalPence: number;
  depositPence: number | null;
  duePence: number;
  paidPence: number;
  balancePence: number;
  vatOn: boolean;
  totalOnly: boolean;
  description: string;
  bankAccountName: string;
  bankSortCode: string;
  bankAccountNumber: string;
  businessName: string;
  remindersPaused: boolean;
  reminders: Array<{ step: number; channel: string; sentAt: string; label: string }>;
};

const invoiceInclude = {
  lines: { orderBy: { sortOrder: "asc" as const } },
  payments: { orderBy: { paidOn: "asc" as const } },
  reminders: { orderBy: { step: "asc" as const } },
  job: { select: { customerName: true, address: true, phone: true, email: true, quoteNumber: true, description: true } },
  business: { select: businessBrandingSelect },
};

function mapInvoice(invoice: {
  id: string;
  jobId: string;
  number: number;
  shareToken: string;
  status: "DRAFT" | "SENT" | "PART_PAID" | "PAID";
  issueDate: Date;
  dueDate: Date;
  depositPence: number | null;
  vatRegistered: boolean;
  vatRatePercent: number;
  totalOnly: boolean;
  remindersPaused: boolean;
  lines: Array<{ id: string; name: string; quantity: { toString(): string }; unit: string; unitPricePence: number | null }>;
  payments: Array<{ id: string; amountPence: number; paidOn: Date; method: PaymentMethod }>;
  reminders: Array<{ step: number; channel: string; sentAt: Date }>;
  job: { customerName: string; address: string; phone: string; email: string; description: string };
  business: { name: string; bankAccountName?: string; bankSortCode?: string; bankAccountNumber?: string };
}): InvoiceDetail {
  const lines = invoice.lines.map((line) => ({
    id: line.id,
    name: line.name,
    quantity: quantityFromStored(line.quantity.toString()),
    unit: line.unit,
    unitPricePence: line.unitPricePence,
  }));
  const totals = invoiceTotals({
    lines,
    vatRegistered: invoice.vatRegistered,
    vatRatePercent: invoice.vatRatePercent,
    depositPence: invoice.depositPence,
  });
  const paidPence = invoice.payments.reduce((sum, payment) => sum + payment.amountPence, 0);
  const dueDate = utcDateToIso(invoice.dueDate);
  return {
    id: invoice.id,
    jobId: invoice.jobId,
    number: invoice.number,
    reference: formatDocumentNumber("INV", invoice.number),
    shareToken: invoice.shareToken,
    standing: invoiceStanding({
      status: invoice.status,
      dueDate,
      today: londonToday(),
      paidPence,
      totalDuePence: totals.duePence,
    }),
    issueDate: utcDateToIso(invoice.issueDate),
    dueDate,
    customerName: invoice.job.customerName,
    address: invoice.job.address,
    phone: invoice.job.phone,
    email: invoice.job.email,
    lines,
    payments: invoice.payments.map((payment) => ({
      id: payment.id,
      amountPence: payment.amountPence,
      paidOn: utcDateToIso(payment.paidOn),
      method: payment.method,
    })),
    subtotalPence: totals.subtotalPence,
    vatPence: totals.vatPence,
    vatRatePercent: invoice.vatRatePercent,
    totalPence: totals.totalPence,
    depositPence: totals.depositPence,
    duePence: totals.duePence,
    paidPence,
    balancePence: balancePence(totals.duePence, paidPence),
    vatOn: invoice.vatRegistered,
    totalOnly: invoice.totalOnly,
    description: invoice.job.description,
    bankAccountName: invoice.business.bankAccountName ?? "",
    bankSortCode: invoice.business.bankSortCode ?? "",
    bankAccountNumber: invoice.business.bankAccountNumber ?? "",
    businessName: invoice.business.name,
    remindersPaused: invoice.remindersPaused,
    reminders: invoice.reminders.map((reminder) => ({
      step: reminder.step,
      channel: reminder.channel,
      sentAt: reminder.sentAt.toISOString(),
      label: reminderHistoryLabel(reminder.step, reminder.sentAt),
    })),
  };
}

export async function listQuotes(businessId: string): Promise<
  Array<{
    id: string;
    customerName: string;
    quoteNumber: number;
    reference: string;
    validUntil: string;
    expired: boolean;
    signed: boolean;
    firstViewedAt: string | null;
    lastViewedAt: string | null;
    status: JobStatus;
  }>
> {
  const jobs = await getPrisma().job.findMany({
    where: tenantWhere(businessId),
    select: {
      id: true,
      customerName: true,
      quoteNumber: true,
      validUntil: true,
      firstViewedAt: true,
      lastViewedAt: true,
      status: true,
      signOff: { select: { id: true } },
    },
    orderBy: { quoteNumber: "desc" },
  });
  const today = londonToday();
  return jobs.map((job) => ({
    id: job.id,
    customerName: job.customerName,
    quoteNumber: job.quoteNumber,
    reference: formatDocumentNumber("Q", job.quoteNumber),
    validUntil: utcDateToIso(job.validUntil),
    expired: quoteIsExpired(utcDateToIso(job.validUntil), today, Boolean(job.signOff)),
    signed: Boolean(job.signOff),
    firstViewedAt: job.firstViewedAt?.toISOString() ?? null,
    lastViewedAt: job.lastViewedAt?.toISOString() ?? null,
    status: job.status,
  }));
}

export async function listInvoices(businessId: string): Promise<InvoiceDetail[]> {
  const invoices = await getPrisma().invoice.findMany({
    where: tenantWhere(businessId),
    include: invoiceInclude,
    orderBy: { number: "desc" },
  });
  return invoices.map(mapInvoice);
}

export async function listLabourRates(businessId: string): Promise<Array<{ jobTypeKey: string; labourPerM2Pence: number | null }>> {
  const rates = await getPrisma().labourRate.findMany({
    where: tenantWhere(businessId),
    select: { jobTypeKey: true, labourPerM2Pence: true },
  });
  return rates;
}

export async function listCrewRates(businessId: string): Promise<Array<{ role: string; basis: string; ratePence: number | null }>> {
  return getPrisma().crewRate.findMany({
    where: tenantWhere(businessId),
    select: { role: true, basis: true, ratePence: true },
    orderBy: { role: "asc" },
  });
}

export async function listJobCrew(
  businessId: string,
  jobId: string,
  sectionId?: string,
): Promise<Array<{ role: string; count: number; basis: string; ratePence: number | null }>> {
  return getPrisma().jobCrew.findMany({
    where: { jobId, ...tenantWhere(businessId), ...(sectionId ? { sectionId } : {}) },
    select: { role: true, count: true, basis: true, ratePence: true },
  });
}

function quoteScopeForCustomer(
  job: DeskJob,
  show: boolean,
): Pick<QuoteChrome, "rooms" | "materials" | "areasLabel" | "jobs"> {
  const wholeJob = hidesMaterialLines({ totalOnly: job.totalOnly, fixedPricePence: job.fixedPricePence });
  const blocks = job.sections.map((section) => {
    const areasLabel = areasLabelFor(section.typeKey, section.title);
    const scope = customerQuoteSections({
      show,
      wholeJob,
      areasLabel,
      rooms: section.rooms.map((room) => roomInputFromStored(room)),
      materials: section.materials.map((line) => ({
        name: line.name,
        quantity: line.quantity,
        unit: line.unit,
      })),
    });
    return {
      title: sectionTitle(section.title),
      areasLabel,
      rooms: scope.rooms,
      materials: scope.materials,
      subtotalPence: wholeJob
        ? null
        : sectionSubtotalPence({
            fixedPricePence: section.fixedPricePence,
            materials: section.materials,
          }),
    };
  });
  if (blocks.length > 1) {
    return { jobs: blocks, rooms: [], materials: [], areasLabel: "Rooms" };
  }
  const only = blocks[0];
  if (only) {
    return { areasLabel: only.areasLabel, rooms: only.rooms, materials: only.materials };
  }
  return customerQuoteSections({
    show,
    wholeJob,
    rooms: [],
    materials: job.materials.map((line) => ({
      name: line.name,
      quantity: line.quantity,
      unit: line.unit,
    })),
  });
}

export async function getBusinessWastage(businessId: string): Promise<number> {
  const business = await getPrisma().business.findFirst({
    where: { id: businessId },
    select: { wastagePercent: true },
  });
  return business?.wastagePercent ?? 10;
}

export async function listRoomMeasures(businessId: string, jobId: string, sectionId?: string) {
  const job = await getPrisma().job.findFirst({
    where: { id: jobId, ...tenantWhere(businessId) },
    select: {
      wastagePercent: true,
      measureTypeKey: true,
      measureTypeName: true,
      dayRatePence: true,
      dayCount: true,
      measureSelection: true,
      sections: {
        orderBy: { sortOrder: "asc" },
        include: { rooms: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
  if (!job) return null;
  const section = sectionId ? (job.sections.find((item) => item.id === sectionId) ?? null) : (job.sections[0] ?? null);
  if (sectionId && !section) return null;
  return {
    sectionId: section?.id ?? "",
    wastagePercent: job.wastagePercent,
    measureTypeKey: section ? section.typeKey : job.measureTypeKey,
    measureTypeName: section ? section.title : job.measureTypeName,
    dayRatePence: job.dayRatePence,
    dayCount: section
      ? section.dayCount == null
        ? null
        : section.dayCount.toString()
      : job.dayCount == null
        ? null
        : job.dayCount.toString(),
    measureSelection: section ? section.measureSelection : job.measureSelection,
    rooms: (section?.rooms ?? []).map(mapStoredRoom),
  };
}

export async function listJobInvoices(businessId: string, jobId: string): Promise<InvoiceDetail[]> {
  const invoices = await getPrisma().invoice.findMany({
    where: { jobId, ...tenantWhere(businessId) },
    include: invoiceInclude,
    orderBy: { number: "desc" },
  });
  return invoices.map(mapInvoice);
}

export async function getInvoice(businessId: string, invoiceId: string): Promise<InvoiceDetail | null> {
  const invoice = await getPrisma().invoice.findFirst({
    where: { id: invoiceId, ...tenantWhere(businessId) },
    include: invoiceInclude,
  });
  return invoice ? mapInvoice(invoice) : null;
}

export async function getPublicInvoice(token: string): Promise<{
  invoice: InvoiceDetail;
  letterhead: CustomerLetterhead;
  badges: string[];
} | null> {
  if (!isConfigured() || !isWellFormedShareToken(token)) return null;
  const invoice = await getPrisma().invoice.findUnique({
    where: { shareToken: token },
    include: invoiceInclude,
  });
  if (!invoice) return null;
  const branding = toBranding(invoice.business);
  return {
    invoice: mapInvoice(invoice),
    letterhead: {
      branding,
      logoSrc: branding.hasLogo ? `/invoice/${token}/logo` : null,
    },
    badges: [...trustBadges(invoice.business), ...parseQuoteChips(invoice.business.quoteChips)].slice(0, 8),
  };
}

export async function listJobPhotos(businessId: string, jobId: string): Promise<DeskPhoto[]> {
  const photos = await getPrisma().jobPhoto.findMany({
    where: { jobId, ...tenantWhere(businessId) },
    select: { id: true, stage: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return photos.map((photo) => ({
    id: photo.id,
    stage: photo.stage,
    createdAt: photo.createdAt.toISOString(),
  }));
}
