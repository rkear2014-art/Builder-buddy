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

const consumerUnit: Line[] = [
  { name: "Consumer unit", quantity: "1", unit: "each", unitPricePence: 8500, costPricePence: 6200 },
  { name: "RCBO 32A", quantity: "6", unit: "each", unitPricePence: 1800, costPricePence: 1250 },
  { name: "Meter tails", quantity: "1", unit: "each", unitPricePence: 1400, costPricePence: 800 },
  { name: "Earth sleeving", quantity: "1", unit: "roll", unitPricePence: 350, costPricePence: 180 },
];

const kitchenTap: Line[] = [
  { name: "Kitchen mixer tap", quantity: "1", unit: "each", unitPricePence: 7900, costPricePence: 4800 },
  { name: "Flexible tap connectors", quantity: "2", unit: "each", unitPricePence: 450, costPricePence: 220 },
  { name: "PTFE tape", quantity: "1", unit: "roll", unitPricePence: 120, costPricePence: 45 },
  { name: "Silicone sealant", quantity: "1", unit: "tube", unitPricePence: 550, costPricePence: 310 },
];

const repoint: Line[] = [
  { name: "Mortar", quantity: "4", unit: "bag", unitPricePence: 680, costPricePence: 490 },
  { name: "Building sand", quantity: "2", unit: "bag", unitPricePence: 340, costPricePence: 210 },
  { name: "Facing bricks", quantity: "10", unit: "each", unitPricePence: 110, costPricePence: 72 },
];

async function main() {
  if (!process.env.DATABASE_URL || !process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    throw new Error("Set DATABASE_URL and AUTH_SECRET (32+ characters) before seeding.");
  }

  const prisma = getPrisma();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { name: "Sam Hart", businessName: "Hart & Co", passwordHash },
    create: {
      email: DEMO_EMAIL,
      name: "Sam Hart",
      businessName: "Hart & Co",
      passwordHash,
    },
  });

  await prisma.job.deleteMany({ where: { userId: user.id } });
  await prisma.materialTemplate.deleteMany({ where: { userId: user.id } });
  await prisma.savedMaterial.deleteMany({ where: { userId: user.id } });

  await prisma.savedMaterial.createMany({
    data: [
      { userId: user.id, trade: "Plasterer", name: "Multi-finish plaster", unit: "bag", unitPricePence: 940, costPricePence: 710 },
      { userId: user.id, trade: "Plasterer", name: "Scrim tape", unit: "roll", unitPricePence: 450, costPricePence: 280 },
      { userId: user.id, trade: "Electrician", name: "RCBO 32A", unit: "each", unitPricePence: 1800, costPricePence: 1250 },
      { userId: user.id, trade: "Plumber", name: "PTFE tape", unit: "roll", unitPricePence: 120, costPricePence: 45 },
      { userId: user.id, trade: "Builder", name: "Mortar", unit: "bag", unitPricePence: 680, costPricePence: 490 },
      { userId: user.id, trade: "Decorator", name: "Contract matt emulsion", unit: "litre", unitPricePence: 750, costPricePence: 490 },
      { userId: user.id, trade: "Roofer", name: "Natural slate", unit: "each", unitPricePence: 280, costPricePence: 160 },
    ],
  });

  const templates = [
    { name: "Skim a room", trade: "Plasterer", items: plasterRoom },
    { name: "Consumer unit swap", trade: "Electrician", items: consumerUnit },
    { name: "Kitchen tap", trade: "Plumber", items: kitchenTap },
    { name: "Repoint a small wall", trade: "Builder", items: repoint },
  ];
  for (const template of templates) {
    await prisma.materialTemplate.create({
      data: {
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
  const signature = sampleSignatureDataUrl();

  const patel = await prisma.job.create({
    data: {
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
      shareToken: createShareToken(),
      materials: {
        create: plasterRoom.map((item, index) => ({
          ...item,
          bought: index < 2,
          sortOrder: index,
        })),
      },
    },
  });

  await prisma.job.create({
    data: {
      userId: user.id,
      customerName: "Chidi Okonkwo",
      address: "8 Cable Street, Bedminster, Bristol, BS3 4QH",
      phone: "07700 900124",
      email: "chidi.okonkwo@example.com",
      trade: "Electrician",
      description: "Quote to swap the old fuse board for a metal consumer unit and label the circuits.",
      internalNotes: "Wants the price before he commits. Call after 6pm.",
      scheduledDate: isoToUtcDate(addDays(today, 5)),
      timeSlot: "afternoon",
      status: "ENQUIRY",
      shareToken: createShareToken(),
      materials: {
        create: consumerUnit.map((item, index) => ({ ...item, bought: false, sortOrder: index })),
      },
    },
  });

  const brooksDescription = "Replace the kitchen mixer tap and reseal the sink.";
  const brooks = await prisma.job.create({
    data: {
      userId: user.id,
      customerName: "Helen Brooks",
      address: "22 Harbour Lane, Clevedon, BS21 7QA",
      phone: "07700 900222",
      email: "helen.brooks@example.com",
      trade: "Plumber",
      description: brooksDescription,
      internalNotes: "Stopcock is under the sink, on the left.",
      scheduledDate: isoToUtcDate(today),
      timeSlot: "afternoon",
      status: "IN_PROGRESS",
      shareToken: createShareToken(),
      materials: {
        create: kitchenTap.map((item, index) => ({ ...item, bought: true, sortOrder: index })),
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
      jobId: brooks.id,
      signerName: brooksLocked.signerName,
      signedAt: new Date(brooksLocked.signedAt),
      signatureData: signature,
      snapshot: brooksLocked,
    },
  });

  const singhOriginal = "Repoint the rear garden wall and replace three spalled bricks.";
  const singh = await prisma.job.create({
    data: {
      userId: user.id,
      customerName: "Dave Singh",
      address: "5 Quarry Cottages, Totterdown, Bristol, BS4 2JY",
      phone: "07700 900333",
      email: "dave.singh@example.com",
      trade: "Builder",
      description: `${singhOriginal} Also straighten the gate pier.`,
      internalNotes: "He agreed the gate pier after signing. Do not change his signed copy.",
      scheduledDate: isoToUtcDate(addDays(today, -5)),
      timeSlot: "all-day",
      status: "COMPLETE",
      shareToken: createShareToken(),
      materials: {
        create: repoint.map((item, index) => ({ ...item, bought: true, sortOrder: index })),
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
      jobId: singh.id,
      signerName: singhLocked.signerName,
      signedAt: new Date(singhLocked.signedAt),
      signatureData: signature,
      snapshot: singhLocked,
    },
  });

  await prisma.job.create({
    data: {
      userId: user.id,
      customerName: "Priya Shah",
      address: "19 Elm Grove, Redland, Bristol, BS6 6AJ",
      phone: "07700 900444",
      email: "",
      trade: "Decorator",
      description: "Paint the hallway and stairs. Colour still to be chosen on the day.",
      internalNotes: "No email on file. Text the phone number with photos of the colour cards.",
      scheduledDate: isoToUtcDate(addDays(today, 3)),
      timeSlot: "all-day",
      status: "BOOKED",
      shareToken: createShareToken(),
    },
  });

  await prisma.job.create({
    data: {
      userId: user.id,
      customerName: "Tom Ellis",
      address: "3 Hillside Terrace, Nailsea, BS48 2AU",
      phone: "07700 900555",
      email: "tom.ellis@example.com",
      trade: "Roofer",
      description: "Replace one slipped slate on the front slope and check the neighbouring courses.",
      internalNotes: "Loft access is a pull-down ladder in the landing cupboard.",
      scheduledDate: isoToUtcDate(addDays(today, 8)),
      timeSlot: "early",
      status: "ENQUIRY",
      shareToken: createShareToken(),
      materials: {
        create: [
          {
            name: "Natural slate",
            quantity: "3",
            unit: "each",
            unitPricePence: 280,
            costPricePence: 160,
            bought: false,
            sortOrder: 0,
          },
        ],
      },
    },
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
