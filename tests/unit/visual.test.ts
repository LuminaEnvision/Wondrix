import { describe, expect, it } from "vitest";
import { parseVisual, visualText, VISUAL_PROMPT } from "@/lib/visual";

describe("parseVisual", () => {
  it("accepts a valid steps spec and drops empty notes", () => {
    const v = parseVisual({
      kind: "steps",
      title: "How a plant drinks",
      items: [{ label: "Roots soak", note: "" }, { label: "Stem carries", note: "Up tiny tubes" }],
    });
    expect(v).toEqual({
      kind: "steps",
      title: "How a plant drinks",
      items: [{ label: "Roots soak" }, { label: "Stem carries", note: "Up tiny tubes" }],
    });
  });

  it("enforces minimum item counts per kind", () => {
    expect(parseVisual({ kind: "steps", title: "t", items: [{ label: "only one" }] })).toBeNull();
    expect(parseVisual({ kind: "cycle", title: "t", items: [{ label: "a" }, { label: "b" }] })).toBeNull();
    expect(parseVisual({ kind: "compare", title: "t", columns: [{ label: "A", points: ["x"] }] })).toBeNull();
    expect(parseVisual({ kind: "scale", title: "t", items: [{ label: "A", value: 1 }] })).toBeNull();
    expect(parseVisual({ kind: "web", title: "t", center: "X", items: [{ label: "a" }, { label: "b" }] })).toBeNull();
  });

  it("caps item counts", () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ label: `L${i}` }));
    const cycle = parseVisual({ kind: "cycle", title: "t", items });
    expect(cycle?.kind === "cycle" && cycle.items).toHaveLength(6);
    const steps = parseVisual({ kind: "steps", title: "t", items });
    expect(steps?.kind === "steps" && steps.items).toHaveLength(5);
  });

  it("rejects unknown kinds and garbage", () => {
    expect(parseVisual(null)).toBeNull();
    expect(parseVisual("svg")).toBeNull();
    expect(parseVisual({ kind: "svg", markup: "<svg/>" })).toBeNull();
    expect(parseVisual({ kind: "pie", items: [] })).toBeNull();
  });

  it("strips markup characters and em dashes from labels", () => {
    const v = parseVisual({
      kind: "web",
      title: "<b>Robot</b> — parts",
      center: "<script>x</script>",
      items: [{ label: "**Sensors**" }, { label: "`Motors`" }, { label: "Battery" }],
    });
    expect(v).not.toBeNull();
    const text = JSON.stringify(v);
    expect(text).not.toMatch(/[<>`*—]/);
  });

  it("truncates long labels", () => {
    const v = parseVisual({
      kind: "cycle",
      title: "t",
      items: [{ label: "x".repeat(200) }, { label: "b" }, { label: "c" }],
    });
    expect(v?.kind === "cycle" && v.items[0].label.length).toBeLessThanOrEqual(32);
  });

  it("scale: keeps finite non-negative numbers, needs one positive value", () => {
    const v = parseVisual({
      kind: "scale",
      title: "Sizes",
      unit: "km",
      items: [
        { label: "Earth", value: 12742 },
        { label: "Bad", value: "abc" },
        { label: "Neg", value: -5 },
        { label: "Sun", value: "1392700" },
      ],
    });
    expect(v).toEqual({
      kind: "scale",
      title: "Sizes",
      unit: "km",
      items: [
        { label: "Earth", value: 12742 },
        { label: "Sun", value: 1392700 },
      ],
    });
    expect(parseVisual({ kind: "scale", title: "t", items: [{ label: "a", value: 0 }, { label: "b", value: 0 }] })).toBeNull();
  });

  it("compare: drops columns without points", () => {
    const v = parseVisual({
      kind: "compare",
      title: "t",
      columns: [
        { label: "Solid", points: ["Keeps shape"] },
        { label: "Empty", points: [] },
        { label: "Gas", points: ["Fills space", 42] },
      ],
    });
    expect(v?.kind === "compare" && v.columns.map((c) => c.label)).toEqual(["Solid", "Gas"]);
  });
});

describe("visualText", () => {
  it("lists every word in the diagram for screen readers and safety checks", () => {
    const text = visualText({
      kind: "steps",
      title: "Rain",
      items: [{ label: "Water warms", note: "Sun heats seas" }, { label: "Clouds form" }],
    });
    expect(text).toContain("Rain");
    expect(text).toContain("1. Water warms: Sun heats seas");
    expect(text).toContain("2. Clouds form");
  });
});

describe("VISUAL_PROMPT", () => {
  it("documents every kind the parser accepts", () => {
    for (const kind of ["steps", "cycle", "compare", "scale", "web"]) {
      expect(VISUAL_PROMPT).toContain(`"kind":"${kind}"`);
    }
  });
});
