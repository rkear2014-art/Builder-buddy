import { z } from "zod";
import {
  isEnabledTrade,
  isJobStatus,
  isTimeSlot,
  isTrade,
  singleEnabledTrade,
  type JobStatus,
} from "./constants";
import { isIsoDate } from "./dates";
import { isValidQuantity, normaliseQuantity } from "./materials";
import { parsePoundsToPence } from "./money";
import { combineSiteAddress, normaliseUkPostcode } from "./address";
import { passwordProblem } from "./password";

export type JobInput = {
  customerName: string;
  address: string;
  phone: string;
  email: string;
  trade: string;
  description: string;
  internalNotes: string;
  scheduledDate: string;
  timeSlot: string;
  status: JobStatus;
  showLinePrices: boolean;
  depositPence: number | null;
};

export type MaterialInput = {
  name: string;
  quantity: string;
  unit: string;
  unitPricePence: number | null;
  costPricePence: number | null;
};

export type FormParse<T> = { ok: true; data: T } | { ok: false; error: string };

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

const jobShape = z.object({
  customerName: z.string().min(2, "Enter the customer's name.").max(120),
  address: z.string().min(5, "Enter the address, including the postcode.").max(400),
  phone: z
    .string()
    .min(8, "Enter a phone number.")
    .max(30)
    .regex(/^[0-9+() -]+$/, "Use digits, spaces, and + for the phone number."),
  email: z.string().max(160),
  trade: z.string().min(1, "Choose a trade."),
  description: z.string().min(3, "Describe the work.").max(5000),
  internalNotes: z.string().max(5000),
  scheduledDate: z.string(),
  timeSlot: z.string(),
  status: z.string(),
});

export function parseJobForm(formData: FormData): FormParse<JobInput> {
  const parsed = jobShape.safeParse({
    customerName: field(formData, "customerName"),
    address: field(formData, "address"),
    phone: field(formData, "phone"),
    email: field(formData, "email"),
    trade: field(formData, "trade") || singleEnabledTrade() || "",
    description: field(formData, "description"),
    internalNotes: field(formData, "internalNotes"),
    scheduledDate: field(formData, "scheduledDate"),
    timeSlot: field(formData, "timeSlot"),
    status: field(formData, "status") || "ENQUIRY",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  const data = parsed.data;
  if (data.email && !z.email().safeParse(data.email).success) {
    return { ok: false, error: "Enter a valid email address, or leave it blank." };
  }
  if (!isTrade(data.trade)) return { ok: false, error: "Choose a trade." };
  if (!isIsoDate(data.scheduledDate)) return { ok: false, error: "Choose a date." };
  if (!isTimeSlot(data.timeSlot)) return { ok: false, error: "Choose a time slot." };
  if (!isJobStatus(data.status)) return { ok: false, error: "Choose a status." };
  const priceFlags = formData.getAll("showLinePrices").map(String);
  const showLinePrices = priceFlags.length === 0 || priceFlags.includes("yes");
  const depositRaw = field(formData, "deposit");
  const deposit = parsePoundsToPence(depositRaw);
  if (!deposit.ok) return { ok: false, error: "Enter the deposit in pounds, or leave it blank." };
  const depositPence = deposit.pence != null && deposit.pence > 0 ? deposit.pence : null;
  return {
    ok: true,
    data: {
      ...data,
      email: data.email.toLowerCase(),
      status: data.status,
      showLinePrices,
      depositPence,
    },
  };
}

export type BookingInput = JobInput & {
  postcode: string;
  addressLine1: string;
  addressLine2: string;
  town: string;
  county: string;
};

export function parseBookingForm(formData: FormData): FormParse<BookingInput> {
  const customerName = field(formData, "customerName");
  const addressLine1 = field(formData, "addressLine1");
  const addressLine2 = field(formData, "addressLine2");
  const town = field(formData, "town");
  const county = field(formData, "county");
  const postcode = normaliseUkPostcode(field(formData, "postcode"));
  const phone = field(formData, "phone");
  const email = field(formData, "email");
  const scheduledDate = field(formData, "scheduledDate");
  const timeSlot = field(formData, "timeSlot");
  const trade = field(formData, "trade") || singleEnabledTrade() || "";
  if (customerName.length < 2 || customerName.length > 120) return { ok: false, error: "Enter the customer's name." };
  if (addressLine1.length < 3 || addressLine1.length > 160) return { ok: false, error: "Enter the house number and street." };
  if (addressLine2.length > 160) return { ok: false, error: "Shorten address line 2." };
  if (town.length > 80 || county.length > 80) return { ok: false, error: "Shorten the town or county." };
  if (!postcode) return { ok: false, error: "Enter a UK postcode, such as BS7 8NS." };
  if (phone.length < 8 || phone.length > 30 || !/^[0-9+() -]+$/.test(phone)) {
    return { ok: false, error: "Enter a phone number." };
  }
  if (email && !z.email().safeParse(email).success) return { ok: false, error: "Enter a valid email address, or leave it blank." };
  if (!isTrade(trade)) return { ok: false, error: "Choose a trade." };
  if (!isIsoDate(scheduledDate)) return { ok: false, error: "Choose a date." };
  if (!isTimeSlot(timeSlot)) return { ok: false, error: "Choose a time slot." };
  const address = combineSiteAddress({ postcode, addressLine1, addressLine2, town, county });
  if (address.length < 5 || address.length > 400) return { ok: false, error: "Enter the address, including the postcode." };
  return {
    ok: true,
    data: {
      customerName,
      address,
      phone,
      email: email.toLowerCase(),
      trade,
      description: "",
      internalNotes: field(formData, "internalNotes").slice(0, 5000),
      scheduledDate,
      timeSlot,
      status: "ENQUIRY",
      showLinePrices: true,
      depositPence: null,
      postcode,
      addressLine1,
      addressLine2,
      town,
      county,
    },
  };
}

export function parseMaterialForm(formData: FormData): FormParse<MaterialInput> {
  const name = field(formData, "itemName") || field(formData, "name");
  const quantity = field(formData, "quantity");
  const unit = field(formData, "unit");
  if (name.length < 2 || name.length > 120) {
    return { ok: false, error: "Enter the material name." };
  }
  if (!isValidQuantity(quantity)) {
    return { ok: false, error: "Enter a quantity greater than zero, with up to 2 decimal places." };
  }
  if (unit.length < 1 || unit.length > 20) {
    return { ok: false, error: "Enter a unit, such as bag, sheet, or each." };
  }
  const price = parsePoundsToPence(field(formData, "unitPrice"));
  if (!price.ok) return price;
  const cost = parsePoundsToPence(field(formData, "costPrice"));
  if (!cost.ok) {
    return { ok: false, error: "Enter your cost in pounds, such as 12.50, or leave it blank." };
  }
  return {
    ok: true,
    data: {
      name,
      quantity: normaliseQuantity(quantity),
      unit,
      unitPricePence: price.pence,
      costPricePence: cost.pence,
    },
  };
}

export function parseLibraryItemForm(
  formData: FormData,
): FormParse<MaterialInput & { trade: string }> {
  const trade = field(formData, "trade") || singleEnabledTrade() || "";
  if (!isEnabledTrade(trade)) return { ok: false, error: "Choose a trade." };
  const material = parseMaterialForm(formData);
  if (!material.ok) return material;
  return { ok: true, data: { ...material.data, trade } };
}

export function parseTemplateForm(formData: FormData): FormParse<{ name: string; trade: string }> {
  const name = field(formData, "name");
  const trade = field(formData, "trade") || singleEnabledTrade() || "";
  if (name.length < 2 || name.length > 80) {
    return { ok: false, error: "Give the template a name." };
  }
  if (!isEnabledTrade(trade)) return { ok: false, error: "Choose a trade." };
  return { ok: true, data: { name, trade } };
}

export type AccountInput = {
  businessName: string;
  name: string;
  email: string;
  password: string;
  setupToken: string;
};

export function parseAccountForm(formData: FormData): FormParse<AccountInput> {
  const businessName = field(formData, "businessName");
  const name = field(formData, "name");
  const email = field(formData, "email").toLowerCase();
  const password = typeof formData.get("password") === "string" ? String(formData.get("password")) : "";
  const confirm = typeof formData.get("confirmPassword") === "string" ? String(formData.get("confirmPassword")) : "";
  const setupToken = typeof formData.get("setupToken") === "string" ? String(formData.get("setupToken")) : "";
  if (businessName.length < 2 || businessName.length > 80) {
    return { ok: false, error: "Enter your business name." };
  }
  if (name.length < 2 || name.length > 80) {
    return { ok: false, error: "Enter your name." };
  }
  if (!z.email().safeParse(email).success) {
    return { ok: false, error: "Enter a valid email address." };
  }
  const passwordError = passwordProblem(password, email);
  if (passwordError) return { ok: false, error: passwordError };
  if (password !== confirm) {
    return { ok: false, error: "Type the same password in both boxes." };
  }
  return { ok: true, data: { businessName, name, email, password, setupToken } };
}

export function parseSignerName(value: string): FormParse<{ signerName: string }> {
  const signerName = value.trim();
  if (signerName.length < 2 || signerName.length > 80) {
    return { ok: false, error: "Enter the name of the person signing." };
  }
  return { ok: true, data: { signerName } };
}
