import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { roomAreas } from "./measure";
import {
  PHOTO_MEASURE_FIXTURE,
  addQuantity,
  externalCornersFromBead,
  materialsForPhotoRoom,
  parsePhotoEstimate,
  parsePhotoEstimateJson,
  photoAreas,
  revealsLengthM,
  roomFromPhotoMeasure,
} from "./photo-measure";

describe("photo measure parsing", () => {
  it("accepts the fixture and rejects a reply that is not the schema", () => {
    assert.deepEqual(parsePhotoEstimate(PHOTO_MEASURE_FIXTURE), PHOTO_MEASURE_FIXTURE);
    assert.equal(parsePhotoEstimateJson(JSON.stringify(PHOTO_MEASURE_FIXTURE))?.name, "Lounge");
    assert.equal(parsePhotoEstimate({ place: "room", lengthM: 4 }), null);
    assert.equal(parsePhotoEstimate({ ...PHOTO_MEASURE_FIXTURE, confidence: "certain" }), null);
    assert.equal(parsePhotoEstimateJson("not json"), null);
  });
});

describe("photo measure areas and materials", () => {
  const openings = [
    { kind: "door" as const, widthM: 0.8, heightM: 2 },
    { kind: "window" as const, widthM: 1.2, heightM: 1.5 },
  ];

  it("works out net plaster after the openings, without counting reveal beads twice", () => {
    const room = roomFromPhotoMeasure({
      typeKey: "plaster-skim",
      place: "room",
      name: "Lounge",
      lengthM: 5,
      widthM: 4,
      heightM: 2.4,
      openings,
      stopBeadM: 0,
      angleBeadM: 9.6,
    });
    const areas = roomAreas(room);
    assert.equal(areas.wallM2, 39.8);
    assert.equal(areas.ceilingM2, 20);
    assert.equal(areas.netM2, 59.8);
    assert.equal(areas.deductionsM2, 3.4);
    assert.equal(areas.corners, 4);
    assert.equal(room.externalCorners, 0);
    assert.equal(externalCornersFromBead(9.6, 2), 0);
    assert.equal(revealsLengthM(openings), 10.2);
    assert.deepEqual(photoAreas(room), { wallAreaM2: 39.8, ceilingAreaM2: 20, netPlasterM2: 59.8 });
  });

  it("turns a skim into multi-finish bags, PVA and scrim from the coverage rules", () => {
    const room = roomFromPhotoMeasure({
      typeKey: "plaster-skim",
      place: "room",
      name: "Lounge",
      lengthM: 5,
      widthM: 4,
      heightM: 2.4,
      openings,
      stopBeadM: 0,
      angleBeadM: 9.6,
    });
    const lines = materialsForPhotoRoom({ typeKey: "plaster-skim", room, wastagePercent: 10 });
    const quantity = (name: string) => lines.find((line) => line.name === name)?.quantity;
    assert.equal(quantity("Thistle MultiFinish plaster"), "7");
    assert.equal(quantity("PVA bonding agent"), "2");
    assert.equal(quantity("Scrim tape"), "1");
    assert.equal(quantity("Galvanised angle bead"), "5");
    assert.equal(lines.find((line) => line.name === "Thistle MultiFinish plaster")?.unit, "bag");
  });

  it("counts plasterboard sheets for dry lining from the wall area only", () => {
    const room = roomFromPhotoMeasure({
      typeKey: "plaster-dry-lining",
      place: "room",
      name: "Lounge",
      lengthM: 5,
      widthM: 4,
      heightM: 2.4,
      openings,
      stopBeadM: 0,
      angleBeadM: 0,
    });
    assert.equal(room.includeCeiling, false);
    assert.equal(roomAreas(room).netM2, 39.8);
    const lines = materialsForPhotoRoom({ typeKey: "plaster-dry-lining", room, wastagePercent: 10 });
    const quantity = (name: string) => lines.find((line) => line.name === name)?.quantity;
    assert.equal(quantity("12.5mm plasterboard 2400 x 1200"), "16");
    assert.equal(quantity("Dabbing adhesive"), "9");
    assert.equal(quantity("Scrim tape"), "1");
    assert.equal(quantity("Thistle MultiFinish plaster"), undefined);
  });

  it("measures a rendered wall as length times height", () => {
    const room = roomFromPhotoMeasure({
      typeKey: "plaster-render",
      place: "wall",
      name: "Front elevation",
      lengthM: 8,
      widthM: 4,
      heightM: 3,
      openings: [{ kind: "window", widthM: 1.5, heightM: 1 }],
      stopBeadM: 2.4,
      angleBeadM: 4.8,
    });
    assert.equal(room.mode, "elevation");
    assert.equal(room.widthM, 0);
    assert.equal(roomAreas(room).netM2, 22.5);
    const sand = materialsForPhotoRoom({ typeKey: "plaster-render", room, wastagePercent: 10 }).find(
      (line) => line.name === "Building sand",
    );
    assert.equal(sand?.quantity, "25");
  });

  it("uses the typed stop-bead metres, not the room perimeter", () => {
    const room = roomFromPhotoMeasure({
      typeKey: "plaster-general",
      place: "room",
      name: "Lounge",
      lengthM: 5,
      widthM: 4,
      heightM: 2.4,
      openings: [],
      stopBeadM: 4.8,
      angleBeadM: 0,
    });
    const stop = materialsForPhotoRoom({ typeKey: "plaster-general", room, wastagePercent: 10 }).find(
      (line) => line.name === "Stop bead",
    );
    assert.equal(stop?.quantity, "3");
  });

  it("adds a new quantity onto materials already on the job", () => {
    assert.equal(addQuantity("3", "2"), "5");
    assert.equal(addQuantity("1.5", "1.25"), "2.75");
  });
});
