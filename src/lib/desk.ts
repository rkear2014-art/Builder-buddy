import type { BusinessBranding } from "./branding";
import type { JobStatus } from "./constants";
import type { BookingKind } from "./diary";
import type { QuoteStage } from "./quote-stage";

export type DeskMaterial = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  unitPricePence: number | null;
  costPricePence: number | null;
  bought: boolean;
};

export type DeskRoom = {
  name: string;
  mode: string;
  lengthM: number;
  widthM: number;
  heightM: number;
  includeWalls: boolean;
  includeCeiling: boolean;
  directAreaM2: number;
  doorCount: number;
  doorAreaM2: number;
  windowCount: number;
  windowAreaM2: number;
  externalCorners: number;
  stopBeadM: number;
};

export type DeskCrew = {
  role: string;
  count: number;
  basis: string;
  ratePence: number | null;
};

/** One piece of work on a quote. A quote always has at least one after it is saved. */
export type DeskSection = {
  id: string;
  sortOrder: number;
  title: string;
  typeKey: string;
  fixedPricePence: number | null;
  dayCount: string | null;
  materials: DeskMaterial[];
  rooms: DeskRoom[];
  crew: DeskCrew[];
};

export type DeskSignOff = {
  signerName: string;
  signedAt: string;
  signatureDataUrl: string;
  snapshot: unknown;
};

export type DeskJob = {
  id: string;
  status: JobStatus;
  shareToken: string;
  businessName: string;
  customerName: string;
  address: string;
  phone: string;
  email: string;
  trade: string;
  description: string;
  internalNotes: string;
  scheduledDate: string;
  timeSlot: string;
  bookingKind: BookingKind;
  spanDays: number;
  onDiary: boolean;
  assignedName: string;
  showLinePrices: boolean;
  depositPence: number | null;
  shareActive: boolean;
  surveyDone: string;
  quoteNumber: number;
  validUntil: string;
  firstViewedAt: string | null;
  lastViewedAt: string | null;
  showPhotos: boolean;
  vatRegistered: boolean;
  vatRatePercent: number;
  omitVat: boolean;
  vatNumber: string;
  quoteStage: QuoteStage;
  totalOnly: boolean;
  fixedPricePence: number | null;
  materials: DeskMaterial[];
  sections: DeskSection[];
  signOff: DeskSignOff | null;
};

export type JobSummary = {
  id: string;
  customerName: string;
  address: string;
  trade: string;
  description: string;
  scheduledDate: string;
  timeSlot: string;
  status: JobStatus;
  boughtCount: number;
  materialCount: number;
  signed: boolean;
};

export type SavedItem = {
  id: string;
  trade: string;
  name: string;
  unit: string;
  unitPricePence: number | null;
  costPricePence: number | null;
  coverageBasis: string;
  coverageAmount: string | null;
};

export type TemplateItem = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  unitPricePence: number | null;
  costPricePence: number | null;
  coverageBasis: string;
  coverageAmount: string | null;
};

export type MaterialTemplateView = {
  id: string;
  name: string;
  trade: string;
  items: TemplateItem[];
};

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  businessId: string;
  businessName: string;
  role: "OWNER" | "MEMBER";
  branding: BusinessBranding;
};
