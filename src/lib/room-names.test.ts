import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseRoomInputs } from "./measure";
import { quoteBreakdownText, quoteRoomLine } from "./quote-breakdown";
import type { RoomInput } from "./measure";
import {
  ROOM_NAME_OPTIONS,
  ROOM_NAME_OTHER,
  applyRoomNamePick,
  isPresetRoomName,
  roomPickerOptions,
  roomPickerValue,
} from "./room-names";

function room(name: string): RoomInput {
  return {
    name,
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
  };
}

describe("room name picker", () => {
  it("lists the common rooms and a way to type your own", () => {
    assert.deepEqual(ROOM_NAME_OPTIONS, [
      "Lounge",
      "Living room",
      "Kitchen",
      "Dining room",
      "Kitchen diner",
      "Hall",
      "Landing",
      "Stairs",
      "Bedroom 1",
      "Bedroom 2",
      "Bedroom 3",
      "Bedroom 4",
      "Bathroom",
      "En-suite",
      "Toilet / WC",
      "Utility",
      "Conservatory",
      "Study / Office",
      "Garage",
      "Porch",
      "Extension",
      "Loft",
      "Ceiling only",
    ]);
    assert.equal(roomPickerOptions("Lounge").at(-1), ROOM_NAME_OTHER);
    assert.equal(isPresetRoomName("Kitchen diner"), true);
    assert.equal(isPresetRoomName("Snug"), false);
  });

  it("keeps a saved name that is not on the list", () => {
    assert.equal(roomPickerOptions("Snug")[0], "Snug");
    assert.equal(roomPickerValue("Snug"), "Snug");
    assert.equal(roomPickerOptions("Snug").filter((option) => option === "Snug").length, 1);
  });

  it("picks a common room, and Other opens a text box without wiping a custom name", () => {
    assert.deepEqual(applyRoomNamePick("Lounge", "Kitchen"), { name: "Kitchen", typing: false });
    assert.deepEqual(applyRoomNamePick("Lounge", ROOM_NAME_OTHER), { name: "", typing: true });
    assert.deepEqual(applyRoomNamePick("Snug", ROOM_NAME_OTHER), { name: "Snug", typing: true });
    assert.equal(roomPickerValue("Kitchen"), "Kitchen");
  });

  it("saves a renamed room and shows it on the customer quote", () => {
    const saved = parseRoomInputs([room("Kitchen diner"), room("Playroom")]);
    assert.ok(saved);
    assert.equal(saved[0]?.name, "Kitchen diner");
    assert.equal(saved[1]?.name, "Playroom");
    assert.equal(quoteRoomLine(saved[0])?.name, "Kitchen diner");
    assert.equal(quoteRoomLine(saved[1])?.name, "Playroom");
    const text = quoteBreakdownText({
      rooms: saved.flatMap((item) => {
        const line = quoteRoomLine(item);
        return line ? [line] : [];
      }),
      materials: [],
    });
    assert.match(text, /Kitchen diner/);
    assert.match(text, /Playroom/);
  });
});
