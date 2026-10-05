import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { areasLabelFor, invoiceLinesForSections, publicSectionLines, quoteSectionsSubtotal, sectionSubtotalPence } from "./quote-sections";
import { quoteMoney } from "./vat";

describe("jobs on one quote", () => {
  it("keeps a single job as its materials, and adds a second job into the total", () => {
    const skim = {
      title: "Skim lounge and hall",
      typeKey: "plaster-skim",
      fixedPricePence: null,
      materials: [
        { name: "Multi-finish plaster", quantity: "8", unit: "bag", unitPricePence: 940 },
        { name: "Labour", quantity: "3", unit: "day", unitPricePence: 52000 },
      ],
    };
    const render = {
      title: "Exterior rendering to wall",
      typeKey: "plaster-render",
      typeName: "Rendering",
      fixedPricePence: null,
      materials: [{ name: "Labour", quantity: "2", unit: "day", unitPricePence: 18000 }],
    };
    assert.equal(sectionSubtotalPence(skim), 163520);
    assert.equal(sectionSubtotalPence(render), 36000);
    assert.equal(quoteSectionsSubtotal({ sections: [skim] }), 163520);
    const both = quoteSectionsSubtotal({ sections: [skim, render] });
    assert.equal(both, 199520);
    const money = quoteMoney({ subtotalPence: both, vatRegistered: true, vatRatePercent: 20, depositPence: null });
    assert.equal(money.vatPence, 39904);
    assert.equal(money.totalPence, 239424);
    const shown = publicSectionLines({ sections: [skim, render] });
    assert.deepEqual(
      shown.lines.map((line) => line.name),
      ["Skim lounge and hall", "Exterior rendering to wall"],
    );
    assert.equal(shown.totalPence, 199520);
  });

  it("lets one job have its own price, and an overall price replace the sum", () => {
    const sections = [
      {
        title: "Skim lounge",
        typeKey: "plaster-skim",
        fixedPricePence: 80000,
        materials: [{ name: "Labour", quantity: "1", unit: "day", unitPricePence: 20000 }],
      },
      {
        title: "Rendering",
        typeKey: "plaster-render",
        typeName: "Rendering",
        materials: [{ name: "Cement", quantity: "4", unit: "bag", unitPricePence: 814 }],
      },
    ];
    assert.equal(quoteSectionsSubtotal({ sections }), 80000 + 3256);
    assert.equal(quoteSectionsSubtotal({ sections, fixedPricePence: 150000 }), 150000);
    const invoice = invoiceLinesForSections({ trade: "Plasterer", sections, fixedPricePence: 150000 });
    assert.equal(invoice.length, 1);
    assert.equal(invoice[0]?.unitPricePence, 150000);
    assert.match(invoice[0]?.name ?? "", /Skim lounge/);
    assert.match(invoice[0]?.name ?? "", /Rendering/);
  });

  it("puts every job on the invoice, and leaves a single material list alone", () => {
    const one = invoiceLinesForSections({
      trade: "Plasterer",
      sections: [
        {
          title: "Skim",
          typeKey: "plaster-skim",
          materials: [
            { name: "Scrim tape", quantity: "1", unit: "roll", unitPricePence: 490 },
            { name: "Labourer", quantity: "1", unit: "day", unitPricePence: 12000 },
          ],
        },
      ],
    });
    assert.deepEqual(
      one.map((line) => line.name),
      ["Scrim tape"],
    );
    const many = invoiceLinesForSections({
      trade: "Plasterer",
      sections: [
        { title: "Skim lounge and hall", typeKey: "plaster-skim", materials: [{ name: "Labour", quantity: "1", unit: "day", unitPricePence: 40000 }] },
        { title: "Rendering", typeKey: "plaster-render", typeName: "Rendering", fixedPricePence: 90000, materials: [] },
      ],
    });
    assert.equal(many[0]?.unitPricePence, 40000);
    assert.equal(many[1]?.name, "Rendering");
    assert.equal(many[1]?.unitPricePence, 90000);
  });

  it("calls rendering walls and indoor plastering rooms", () => {
    assert.equal(areasLabelFor("plaster-render", "Rendering"), "Walls");
    assert.equal(areasLabelFor("template:abc", "Rendering"), "Walls");
    assert.equal(areasLabelFor("plaster-skim", "Skim a room"), "Rooms");
    assert.equal(areasLabelFor("plaster-stud-wall", "Stud wall partitioning"), "Rooms");
    assert.equal(areasLabelFor("plaster-screed", "Screeding"), "Rooms");
  });
});
