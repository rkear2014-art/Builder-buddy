import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addDays, monthMatrix, weekDates } from "./dates";

describe("diary dates", () => {
  it("starts the week on Monday, including when the day is Sunday", () => {
    assert.deepEqual(weekDates("2026-10-04"), [
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
    assert.equal(weekDates("2026-10-05")[0], "2026-10-05");
    assert.equal(addDays("2026-10-04", 1), "2026-10-05");
  });

  it("builds an October grid that contains the first and last of the month", () => {
    const weeks = monthMatrix("2026-10-04");
    const days = weeks.flat();
    assert.equal(days[0], "2026-09-28");
    assert.equal(days.includes("2026-10-01"), true);
    assert.equal(days.includes("2026-10-31"), true);
    assert.equal(days.includes("2026-11-01"), true);
    assert.equal(days.filter((day) => day.startsWith("2026-10-")).length, 31);
  });
});
