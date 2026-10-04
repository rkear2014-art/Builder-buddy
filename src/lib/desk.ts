import type { JobStatus } from "./constants";

export type DeskMaterial = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  unitPricePence: number | null;
  costPricePence: number | null;
  bought: boolean;
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
  materials: DeskMaterial[];
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
};

export type TemplateItem = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  unitPricePence: number | null;
  costPricePence: number | null;
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
};
