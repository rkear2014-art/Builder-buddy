import "dotenv/config";
import bcrypt from "bcryptjs";
import { lockAgreement } from "../src/lib/agreement";
import { createShareToken } from "../src/lib/access";
import { addDays, isoToUtcDate, londonToday } from "../src/lib/dates";
import { sampleSignatureDataUrl } from "../src/lib/sample-signature";
import { getPrisma } from "../src/server/prisma";

const DEMO_EMAIL = "demo@builderbuddy.co.uk";
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || "Plaster-tea-1";

type Line = {
  name: string;
  quantity: string;
  unit: string;
  unitPricePence: number | null;
  costPricePence: number | null;
  bought?: boolean;
};

const plasterRoom: Line[] = [
  { name: "12.5mm plasterboard", quantity: "4", unit: "sheet", unitPricePence: 850, costPricePence: 620 },
  { name: "Multi-finish plaster", quantity: "3", unit: "bag", unitPricePence: 940, costPricePence: 710 },
  { name: "Scrim tape", quantity: "1", unit: "roll", unitPricePence: 450, costPricePence: 280 },
  { name: "PVA bonding", quantity: "1", unit: "litre", unitPricePence: 600, costPricePence: 420 },
  { name: "Angle bead", quantity: "4", unit: "length", unitPricePence: 215, costPricePence: 140 },
];

const skimQuote: Line[] = [
  { name: "Multi-finish plaster 25kg", quantity: "6", unit: "bag", unitPricePence: 940, costPricePence: 710 },
  { name: "Plasterboard 2400x1200 12.5mm", quantity: "10", unit: "sheet", unitPricePence: 850, costPricePence: 620 },
  { name: "Angle bead", quantity: "8", unit: "length", unitPricePence: 215, costPricePence: 140 },
];

const repairs: Line[] = [
  { name: "Thistle Bonding Coat", quantity: "1", unit: "bag", unitPricePence: 890, costPricePence: 640 },
  { name: "Thistle MultiFinish plaster", quantity: "1", unit: "bag", unitPricePence: 940, costPricePence: 710 },
  { name: "Scrim tape", quantity: "1", unit: "roll", unitPricePence: 450, costPricePence: 280 },
];

const renderPatch: Line[] = [
  { name: "Building sand", quantity: "2", unit: "bag", unitPricePence: 340, costPricePence: 210 },
  { name: "Cement", quantity: "1", unit: "bag", unitPricePence: 680, costPricePence: 490 },
  { name: "Render stop bead", quantity: "2", unit: "length", unitPricePence: 215, costPricePence: 140 },
];

async function main() {
  if (!process.env.DATABASE_URL || !process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    throw new Error("Set DATABASE_URL and AUTH_SECRET (32+ characters) before seeding.");
  }

  const prisma = getPrisma();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  const business = existing
    ? await prisma.business.update({ where: { id: existing.businessId }, data: { name: "Hart & Co" } })
    : await prisma.business.create({ data: { name: "Hart & Co" } });
  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: { name: "Sam Hart", passwordHash, role: "OWNER" },
      })
    : await prisma.user.create({
        data: {
          email: DEMO_EMAIL,
          name: "Sam Hart",
          passwordHash,
          role: "OWNER",
          businessId: business.id,
        },
      });
  const businessId = business.id;
  await prisma.setupLock.upsert({
    where: { id: 1 },
    update: { claimed: true, claimedAt: new Date() },
    create: { id: 1, claimed: true, claimedAt: new Date() },
  });

  await prisma.job.deleteMany({ where: { businessId } });
  await prisma.materialTemplate.deleteMany({ where: { businessId } });
  await prisma.savedMaterial.deleteMany({ where: { businessId } });

  await prisma.savedMaterial.createMany({
    data: [
      { businessId, userId: user.id, trade: "Plasterer", name: "Thistle MultiFinish plaster", unit: "bag", unitPricePence: 940, costPricePence: 710 },
      { businessId, userId: user.id, trade: "Plasterer", name: "Scrim tape", unit: "roll", unitPricePence: 450, costPricePence: 280 },
      { businessId, userId: user.id, trade: "Plasterer", name: "PVA bonding agent", unit: "litre", unitPricePence: 600, costPricePence: 420 },
      { businessId, userId: user.id, trade: "Plasterer", name: "Thistle Hardwall plaster", unit: "bag", unitPricePence: 980, costPricePence: 740 },
    ],
  });

  const templates = [
    { name: "Skim a room", trade: "Plasterer", items: plasterRoom },
    { name: "Plaster repairs", trade: "Plasterer", items: repairs },
  ];
  for (const template of templates) {
    await prisma.materialTemplate.create({
      data: {
        businessId,
        userId: user.id,
        name: template.name,
        trade: template.trade,
        items: {
          create: template.items.map((item, index) => ({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            unitPricePence: item.unitPricePence,
            costPricePence: item.costPricePence,
            sortOrder: index,
          })),
        },
      },
    });
  }

  const today = londonToday();
  let nextSeedQuote = 1;
  const signature = sampleSignatureDataUrl();

  const patel = await prisma.job.create({
    data: {
      businessId,
      userId: user.id,
      customerName: "Anita Patel",
      address: "14 Larkspur Road, Bishopston, Bristol, BS7 8NS",
      phone: "07700 900123",
      email: "anita.patel@example.com",
      trade: "Plasterer",
      description: "Skim the lounge and hall after the ceiling leak. Make good the corner bead by the doorway.",
      internalNotes: "Side gate is stiff. The dog is friendly, but shut them in the kitchen.",
      scheduledDate: isoToUtcDate(addDays(today, 1)),
      timeSlot: "morning",
      status: "BOOKED",
      quoteStage: "WON",
      shareToken: createShareToken(),
      quoteNumber: nextSeedQuote++,
      validUntil: isoToUtcDate(addDays(today, 30)),
      materials: {
        create: plasterRoom.map((item, index) => ({
          ...item,
          businessId,
          bought: index < 2,
          sortOrder: index,
        })),
      },
    },
  });

  const chidi = await prisma.job.create({
    data: {
      businessId,
      userId: user.id,
      customerName: "Chidi Okonkwo",
      address: "8 Cable Street, Bedminster, Bristol, BS3 4QH",
      phone: "07700 900124",
      email: "chidi.okonkwo@example.com",
      trade: "Plasterer",
      description: "Skim the lounge, hall and dining room. Board the lounge ceiling and bead the external corners.",
      showLinePrices: false,
      internalNotes: "Wants the price before he commits. Call after 6pm.",
      scheduledDate: isoToUtcDate(addDays(today, 5)),
      timeSlot: "afternoon",
      status: "ENQUIRY",
      quoteStage: "QUOTED",
      shareToken: createShareToken(),
      quoteNumber: nextSeedQuote++,
      validUntil: isoToUtcDate(addDays(today, 30)),
      materials: {
        create: skimQuote.map((item, index) => ({ ...item, businessId, bought: false, sortOrder: index })),
      },
    },
  });
  await prisma.roomMeasure.createMany({
    data: [
      {
        businessId,
        jobId: chidi.id,
        name: "Lounge",
        mode: "room",
        lengthM: 5.4,
        widthM: 3.8,
        heightM: 2.4,
        includeWalls: true,
        includeCeiling: true,
        doorCount: 1,
        windowCount: 1,
        sortOrder: 0,
      },
      {
        businessId,
        jobId: chidi.id,
        name: "Hall",
        mode: "room",
        lengthM: 4.2,
        widthM: 1.6,
        heightM: 2.4,
        includeWalls: true,
        includeCeiling: true,
        doorCount: 2,
        windowCount: 0,
        sortOrder: 1,
      },
      {
        businessId,
        jobId: chidi.id,
        name: "Dining room",
        mode: "room",
        lengthM: 3.6,
        widthM: 3.2,
        heightM: 2.4,
        includeWalls: true,
        includeCeiling: true,
        doorCount: 1,
        windowCount: 1,
        sortOrder: 2,
      },
    ],
  });

  const brooksDescription = "Skim the kitchen walls and make good the window board.";
  const brooks = await prisma.job.create({
    data: {
      businessId,
      userId: user.id,
      customerName: "Helen Brooks",
      address: "22 Harbour Lane, Clevedon, BS21 7QA",
      phone: "07700 900222",
      email: "helen.brooks@example.com",
      trade: "Plasterer",
      description: brooksDescription,
      internalNotes: "Stopcock is under the sink, on the left.",
      scheduledDate: isoToUtcDate(today),
      timeSlot: "afternoon",
      status: "IN_PROGRESS",
      quoteStage: "WON",
      shareToken: createShareToken(),
      quoteNumber: nextSeedQuote++,
      validUntil: isoToUtcDate(addDays(today, 30)),
      materials: {
        create: plasterRoom.map((item, index) => ({ ...item, businessId, bought: true, sortOrder: index })),
      },
    },
    include: { materials: { orderBy: { sortOrder: "asc" } } },
  });
  const brooksLocked = lockAgreement(
    {
      businessName: "Hart & Co",
      customerName: brooks.customerName,
      address: brooks.address,
      phone: brooks.phone,
      email: brooks.email,
      trade: brooks.trade,
      description: brooks.description,
      internalNotes: brooks.internalNotes,
      scheduledDate: today,
      timeSlot: brooks.timeSlot,
      materials: brooks.materials.map((material) => ({
        name: material.name,
        quantity: material.quantity.toString(),
        unit: material.unit,
        unitPricePence: material.unitPricePence,
        costPricePence: material.costPricePence,
      })),
    },
    { signerName: "Helen Brooks", signedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
  );
  await prisma.signOff.create({
    data: {
      businessId,
      jobId: brooks.id,
      signerName: brooksLocked.signerName,
      signedAt: new Date(brooksLocked.signedAt),
      signatureData: signature,
      snapshot: brooksLocked,
    },
  });

  const singhOriginal = "Cut out the damaged plaster on the rear wall and skim the patches flush.";
  const singh = await prisma.job.create({
    data: {
      businessId,
      userId: user.id,
      customerName: "Dave Singh",
      address: "5 Quarry Cottages, Totterdown, Bristol, BS4 2JY",
      phone: "07700 900333",
      email: "dave.singh@example.com",
      trade: "Plasterer",
      description: `${singhOriginal} Also make good the corner bead by the doorway.`,
      internalNotes: "He agreed the gate pier after signing. Do not change his signed copy.",
      scheduledDate: isoToUtcDate(addDays(today, -5)),
      timeSlot: "all-day",
      status: "COMPLETE",
      quoteStage: "WON",
      shareToken: createShareToken(),
      quoteNumber: nextSeedQuote++,
      validUntil: isoToUtcDate(addDays(today, 30)),
      materials: {
        create: repairs.map((item, index) => ({ ...item, businessId, bought: true, sortOrder: index })),
      },
    },
    include: { materials: { orderBy: { sortOrder: "asc" } } },
  });
  const singhLocked = lockAgreement(
    {
      businessName: "Hart & Co",
      customerName: singh.customerName,
      address: singh.address,
      phone: singh.phone,
      email: singh.email,
      trade: singh.trade,
      description: singhOriginal,
      scheduledDate: addDays(today, -5),
      timeSlot: singh.timeSlot,
      materials: singh.materials.map((material) => ({
        name: material.name,
        quantity: material.quantity.toString(),
        unit: material.unit,
        unitPricePence: material.unitPricePence,
        costPricePence: material.costPricePence,
      })),
    },
    { signerName: "Dave Singh", signedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString() },
  );
  await prisma.signOff.create({
    data: {
      businessId,
      jobId: singh.id,
      signerName: singhLocked.signerName,
      signedAt: new Date(singhLocked.signedAt),
      signatureData: signature,
      snapshot: singhLocked,
    },
  });

  await prisma.job.create({
    data: {
      businessId,
      userId: user.id,
      customerName: "Priya Shah",
      address: "19 Elm Grove, Redland, Bristol, BS6 6AJ",
      phone: "07700 900444",
      email: "",
      trade: "Plasterer",
      description: "Skim the hallway and stairs. The finish is still to be agreed on the day.",
      internalNotes: "No email on file. Text the phone number before the visit.",
      scheduledDate: isoToUtcDate(addDays(today, 3)),
      timeSlot: "all-day",
      status: "BOOKED",
      quoteStage: "WON",
      shareToken: createShareToken(),
      quoteNumber: nextSeedQuote++,
      validUntil: isoToUtcDate(addDays(today, 30)),
    },
  });

  await prisma.job.create({
    data: {
      businessId,
      userId: user.id,
      customerName: "Tom Ellis",
      address: "3 Hillside Terrace, Nailsea, BS48 2AU",
      phone: "07700 900555",
      email: "tom.ellis@example.com",
      trade: "Plasterer",
      description: "Render a patch on the front wall and check the neighbouring finish.",
      internalNotes: "The front is reached from the side gate.",
      scheduledDate: isoToUtcDate(addDays(today, 8)),
      timeSlot: "early",
      status: "ENQUIRY",
      quoteStage: "QUOTED",
      shareToken: createShareToken(),
      quoteNumber: nextSeedQuote++,
      validUntil: isoToUtcDate(addDays(today, 30)),
      materials: {
        create: renderPatch.map((item, index) => ({ ...item, businessId, bought: false, sortOrder: index })),
      },
    },
  });

  await prisma.business.update({
    where: { id: businessId },
    data: { nextQuoteNumber: nextSeedQuote },
  });

  console.log(`Seeded ${DEMO_EMAIL}. Sample jobs include ${patel.customerName} and two signed agreements.`);
  console.log("Seed resets this demo user's jobs, templates, and saved items.");
}

main()
  .then(async () => {
    await getPrisma().$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await getPrisma().$disconnect().catch(() => undefined);
    process.exit(1);
  });
