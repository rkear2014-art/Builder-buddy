import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createShareToken } from "./access";
import { AK_PLASTERING_PREFILL } from "./ak-plastering";
import {
  businessLogoQuery,
  canEditBusiness,
  customerLogoSrc,
  parseBusinessProfile,
  websiteHref,
} from "./branding";

function profileForm(values: Record<string, string>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) form.set(key, value);
  return form;
}

describe("business profile", () => {
  it("keeps contact details optional and stores a normal website", () => {
    const parsed = parseBusinessProfile(profileForm({ name: "Hart & Co" }));
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.data.phone, "");
    assert.equal(parsed.data.email, "");
    assert.equal(parsed.data.address, "");
    assert.equal(parsed.data.website, "");
    assert.equal(parsed.data.tagline, "");

    assert.equal(websiteHref("plastererinredditch.co.uk"), "https://plastererinredditch.co.uk");
    assert.equal(websiteHref("javascript:alert(1)"), null);
    assert.equal(websiteHref("data:text/html,hi"), null);
    assert.equal(websiteHref(""), null);
  });

  it("accepts the optional AK Plastering prefill without making it a default", () => {
    const parsed = parseBusinessProfile(profileForm(AK_PLASTERING_PREFILL));
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.data.name, "AK Plastering");
    assert.equal(parsed.data.phone, "07512 873562");
    assert.equal(parsed.data.address, "38 Birchfield Rd, Redditch, Worcestershire B97 4LD");
    assert.equal(parsed.data.tagline, "Qualitative Wall Finishing");
    assert.equal(parsed.data.website, "https://www.plastererinredditch.co.uk");
    assert.equal(parsed.data.email, "");

    const blank = parseBusinessProfile(profileForm({ name: "Hart & Co", phone: "", website: "" }));
    assert.equal(blank.ok && blank.data.name, "Hart & Co");
    assert.equal(blank.ok && blank.data.phone, "");
  });

  it("refuses a bad phone, email, or website", () => {
    assert.equal(
      parseBusinessProfile(profileForm({ name: "Hart & Co", phone: "call me" })).ok,
      false,
    );
    assert.equal(
      parseBusinessProfile(profileForm({ name: "Hart & Co", email: "not-an-email" })).ok,
      false,
    );
    assert.equal(
      parseBusinessProfile(profileForm({ name: "Hart & Co", website: "javascript:alert(1)" })).ok,
      false,
    );
  });

  it("lets only the owner edit, and only that business's logo is addressed", () => {
    assert.equal(canEditBusiness("OWNER"), true);
    assert.equal(canEditBusiness("MEMBER"), false);
    assert.deepEqual(businessLogoQuery("biz-a"), { id: "biz-a" });
    assert.throws(() => businessLogoQuery(""), /not scoped to a business/);

    const token = createShareToken();
    assert.equal(customerLogoSrc(token, false, null), null);
    assert.equal(customerLogoSrc("short", true, null), null);
    assert.equal(customerLogoSrc(token, true, "2026-10-04T12:00:00.000Z"), `/sign/${token}/logo?v=2026-10-04T12%3A00%3A00.000Z`);
  });
});
