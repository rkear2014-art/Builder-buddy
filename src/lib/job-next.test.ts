import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { jobNextStep, openJobSection } from "./job-next";

const jobId = "job-1";

describe("job next step", () => {
  it("follows the quote from draft, to send, to waiting", () => {
    assert.equal(jobNextStep({ quoteStage: "DRAFT", status: "ENQUIRY", onDiary: false, signed: false, jobId }).id, "materials");
    assert.equal(jobNextStep({ quoteStage: "QUOTED", status: "ENQUIRY", onDiary: true, signed: false, jobId }).label, "Send the quote");
    assert.equal(jobNextStep({ quoteStage: "SENT", status: "ENQUIRY", onDiary: true, signed: false, jobId }).id, "waiting");
    assert.equal(openJobSection("materials"), "price");
    assert.equal(openJobSection("send"), "quote");
    assert.equal(openJobSection("waiting"), "quote");
  });

  it("books a won job that is not on the diary, then raises an invoice once it is booked", () => {
    assert.equal(
      jobNextStep({ quoteStage: "WON", status: "BOOKED", onDiary: false, signed: true, jobId }).id,
      "book",
    );
    assert.equal(
      jobNextStep({ quoteStage: "WON", status: "ENQUIRY", onDiary: false, signed: true, jobId }).label,
      "Book the job in",
    );
    assert.equal(
      jobNextStep({ quoteStage: "WON", status: "BOOKED", onDiary: true, signed: true, jobId }).label,
      "Raise invoice",
    );
    assert.equal(
      jobNextStep({ quoteStage: "WON", status: "IN_PROGRESS", onDiary: true, signed: true, jobId }).id,
      "invoice",
    );
    assert.equal(jobNextStep({ quoteStage: "WON", status: "COMPLETE", onDiary: true, signed: true, jobId }).id, "done");
    assert.equal(jobNextStep({ quoteStage: "LOST", status: "ENQUIRY", onDiary: false, signed: false, jobId }).id, "lost");
  });
});
