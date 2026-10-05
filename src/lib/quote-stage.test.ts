import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { onDiaryAfterWon, stageAfterQuoteMade, stageAfterSent } from "./quote-stage";

describe("quote stage", () => {
  it("moves a draft to quoted, and leaves sent, won and lost alone", () => {
    assert.equal(stageAfterQuoteMade("DRAFT"), "QUOTED");
    assert.equal(stageAfterQuoteMade("QUOTED"), "QUOTED");
    assert.equal(stageAfterQuoteMade("SENT"), "SENT");
    assert.equal(stageAfterQuoteMade("WON"), "WON");
    assert.equal(stageAfterQuoteMade("LOST"), "LOST");
  });

  it("marks a quote sent without pulling a won or lost job backwards", () => {
    assert.equal(stageAfterSent("DRAFT"), "SENT");
    assert.equal(stageAfterSent("QUOTED"), "SENT");
    assert.equal(stageAfterSent("SENT"), "SENT");
    assert.equal(stageAfterSent("WON"), "WON");
    assert.equal(stageAfterSent("LOST"), "LOST");
  });

  it("takes a won job off the diary unless the work has started or finished", () => {
    assert.equal(onDiaryAfterWon("ENQUIRY", true), false);
    assert.equal(onDiaryAfterWon("BOOKED", true), false);
    assert.equal(onDiaryAfterWon("IN_PROGRESS", true), true);
    assert.equal(onDiaryAfterWon("COMPLETE", false), false);
    assert.equal(onDiaryAfterWon("IN_PROGRESS", false), false);
  });
});
