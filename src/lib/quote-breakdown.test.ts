import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { RoomInput } from "./measure";
import { customerQuoteSections, materialQuantityLabel, quoteBreakdownText, quoteRoomLine } from "./quote-breakdown";

function room(overrides: Partial<RoomInput> = {}): RoomInput {
  return {
    name: "Lounge",
    mode: "room",
    lengthM: 5.4,
    widthM: 3.8,
    heightM: 2.4,
    includeWalls: true,
    includeCeiling: true,
    directAreaM2: 0,
    doorCount: 1,
    doorAreaM2: 1.9,
    windowCount: 1,
    windowAreaM2: 1.5,
    externalCorners: 0,
    stopBeadM: 0,
    ...overrides,
  };
}

describe("customer quote rooms and materials", () => {
  it("lists each room with its size and the area left after doors and windows", () => {
    const line = quoteRoomLine(room());
    assert.ok(line);
    assert.equal(line.name, "Lounge");
    assert.equal(line.size, "5.4 m × 3.8 m × 2.4 m");
    assert.match(line.areas, /Walls .+ m² after doors and windows/);
    assert.match(line.areas, /Ceiling .+ m²/);
    assert.equal(line.areas.includes("£"), false);
  });

  it("lists materials as a name and a quantity, never a price", () => {
    assert.equal(materialQuantityLabel({ name: "Multi-finish plaster 25kg", quantity: "6", unit: "bag" }), "Multi-finish plaster 25kg x 6");
    assert.equal(
      materialQuantityLabel({ name: "Plasterboard 2400x1200 12.5mm", quantity: "10.00", unit: "sheet" }),
      "Plasterboard 2400x1200 12.5mm x 10",
    );
    assert.equal(materialQuantityLabel({ name: "beads", quantity: "", unit: "" }), "beads");
    assert.equal(materialQuantityLabel({ name: "Labourer", quantity: "2", unit: "day" }), null);
    const label = materialQuantityLabel({ name: "Angle bead", quantity: "8", unit: "length" });
    assert.equal(label, "Angle bead x 8");
    assert.equal(label?.includes("£"), false);
    assert.equal(label?.toLowerCase().includes("cost"), false);
  });

  it("hides a section the job does not have, and both when the business turns them off", () => {
    const roomsOnly = customerQuoteSections({
      show: true,
      rooms: [room({ name: "Hall", lengthM: 4.2, widthM: 1.6, windowCount: 0 })],
      materials: [],
    });
    assert.equal(roomsOnly.rooms.length, 1);
    assert.deepEqual(roomsOnly.materials, []);

    const materialsOnly = customerQuoteSections({
      show: true,
      rooms: [],
      materials: [{ name: "Multi-finish plaster 25kg", quantity: "6", unit: "bag" }],
    });
    assert.deepEqual(materialsOnly.rooms, []);
    assert.deepEqual(materialsOnly.materials, ["Multi-finish plaster 25kg x 6"]);

    const hidden = customerQuoteSections({
      show: false,
      rooms: [room()],
      materials: [{ name: "Multi-finish plaster 25kg", quantity: "6", unit: "bag" }],
    });
    assert.deepEqual(hidden, { areasLabel: "Rooms", rooms: [], materials: [] });
    assert.equal(quoteBreakdownText(hidden), "");
  });

  it("keeps a whole-job price as the total, without a material list", () => {
    const sections = customerQuoteSections({
      show: true,
      wholeJob: true,
      rooms: [room()],
      materials: [{ name: "Multi-finish plaster 25kg", quantity: "6", unit: "bag" }],
    });
    assert.equal(sections.rooms.length, 1);
    assert.deepEqual(sections.materials, []);
    assert.equal(quoteBreakdownText(sections).includes("Materials"), false);
    assert.equal(quoteBreakdownText(sections).includes("£"), false);
  });

  it("writes the email as rooms and quantities, with the total left to the price", () => {
    const text = quoteBreakdownText(
      customerQuoteSections({
        show: true,
        rooms: [room()],
        materials: [{ name: "Multi-finish plaster 25kg", quantity: "6", unit: "bag" }],
      }),
    );
    assert.match(text, /^Rooms\nLounge\n5\.4 m/);
    assert.match(text, /Materials\nMulti-finish plaster 25kg x 6/);
    assert.equal(text.includes("£"), false);
  });
});
