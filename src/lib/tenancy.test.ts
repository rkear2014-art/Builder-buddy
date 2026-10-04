import "dotenv/config";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getPrisma } from "../server/prisma";
import { recordsForBusiness, tenantWhere } from "./tenancy";
import { businessLogoQuery } from "./branding";

describe("business isolation", () => {
  it("refuses a query that is not scoped to a business", () => {
    assert.throws(() => tenantWhere(""), /not scoped to a business/);
    assert.deepEqual(tenantWhere("biz-a"), { businessId: "biz-a" });
  });

  it("hides jobs, materials, templates and signatures from another business", () => {
    const records = [
      { id: "job-a", businessId: "biz-a" },
      { id: "job-b", businessId: "biz-b" },
      { id: "material-b", businessId: "biz-b" },
      { id: "template-b", businessId: "biz-b" },
      { id: "signature-b", businessId: "biz-b" },
    ];
    assert.deepEqual(
      recordsForBusiness(records, "biz-a").map((record) => record.id),
      ["job-a"],
    );
    assert.deepEqual(recordsForBusiness(records, "biz-b").map((record) => record.id), [
      "job-b",
      "material-b",
      "template-b",
      "signature-b",
    ]);
  });

  it("cannot read another business's rows by id", async (t) => {
    if (!process.env.DATABASE_URL) {
      t.skip("DATABASE_URL is not set");
      return;
    }
    const prisma = getPrisma();
    const token = `isolation${Date.now().toString(36)}xxxxxxxxxxxxxxxxxxxxx`.slice(0, 43);
    let rolledBack = false;
    try {
      await prisma.$transaction(async (tx) => {
        const businessA = await tx.business.create({ data: { name: "Isolation A" } });
        const businessB = await tx.business.create({ data: { name: "Isolation B" } });
        const ownerA = await tx.user.create({
          data: {
            email: `isolation-a-${businessA.id}@example.com`,
            name: "Owner A",
            passwordHash: "not-a-login",
            role: "OWNER",
            businessId: businessA.id,
          },
        });
        const ownerB = await tx.user.create({
          data: {
            email: `isolation-b-${businessB.id}@example.com`,
            name: "Owner B",
            passwordHash: "not-a-login",
            role: "OWNER",
            businessId: businessB.id,
          },
        });
        const job = await tx.job.create({
          data: {
            businessId: businessB.id,
            userId: ownerB.id,
            customerName: "Other Customer",
            address: "1 Other Street, Bristol, BS1 1AA",
            phone: "07700900111",
            trade: "Plumber",
            description: "Private work",
            internalNotes: "Secret note for business B",
            scheduledDate: new Date("2026-10-04T00:00:00.000Z"),
            timeSlot: "morning",
            status: "BOOKED",
            shareToken: token,
            materials: {
              create: [
                {
                  businessId: businessB.id,
                  name: "Secret pipe",
                  quantity: "1",
                  unit: "each",
                  sortOrder: 0,
                },
              ],
            },
          },
        });
        await tx.signOff.create({
          data: {
            businessId: businessB.id,
            jobId: job.id,
            signerName: "Other Customer",
            signatureData: "x",
            signedAt: new Date("2026-10-04T12:00:00.000Z"),
            snapshot: { version: 1 },
          },
        });
        const saved = await tx.savedMaterial.create({
          data: {
            businessId: businessB.id,
            userId: ownerB.id,
            trade: "Plumber",
            name: `Secret washer ${businessB.id}`,
            unit: "each",
          },
        });
        const template = await tx.materialTemplate.create({
          data: {
            businessId: businessB.id,
            userId: ownerB.id,
            name: "Secret template",
            trade: "Plumber",
          },
        });

        assert.equal(await tx.job.findFirst({ where: { id: job.id, ...tenantWhere(businessA.id) } }), null);
        assert.equal(
          await tx.jobMaterial.findFirst({ where: { jobId: job.id, ...tenantWhere(businessA.id) } }),
          null,
        );
        assert.equal(
          await tx.signOff.findFirst({ where: { jobId: job.id, ...tenantWhere(businessA.id) } }),
          null,
        );
        assert.equal(
          await tx.savedMaterial.findFirst({ where: { id: saved.id, ...tenantWhere(businessA.id) } }),
          null,
        );
        assert.equal(
          await tx.materialTemplate.findFirst({ where: { id: template.id, ...tenantWhere(businessA.id) } }),
          null,
        );
        const visibleJobs = await tx.job.findMany({ where: tenantWhere(businessA.id) });
        assert.equal(
          visibleJobs.some((row) => row.id === job.id),
          false,
        );
        assert.ok(ownerA.id);

        await tx.business.update({
          where: { id: businessB.id },
          data: {
            phone: "07000000000",
            logoMime: "image/webp",
            logoBytes: Uint8Array.from([1, 2, 3, 4]),
            logoUpdatedAt: new Date("2026-10-04T12:00:00.000Z"),
          },
        });
        const logoForA = await tx.business.findFirst({
          where: businessLogoQuery(businessA.id),
          select: { logoMime: true, phone: true },
        });
        const logoForB = await tx.business.findFirst({
          where: businessLogoQuery(businessB.id),
          select: { logoMime: true, phone: true, logoBytes: true },
        });
        assert.equal(logoForA?.logoMime ?? null, null);
        assert.equal(logoForA?.phone ?? "", "");
        assert.equal(logoForB?.logoMime, "image/webp");
        assert.equal(logoForB?.phone, "07000000000");
        assert.ok(logoForB?.logoBytes && logoForB.logoBytes.byteLength > 0);
        assert.notEqual(businessLogoQuery(businessA.id).id, businessB.id);

        throw new Error("ROLLBACK");
      });
    } catch (error) {
      if (error instanceof Error && error.message === "ROLLBACK") {
        rolledBack = true;
      } else {
        throw error;
      }
    }
    assert.equal(rolledBack, true);
  });
});
