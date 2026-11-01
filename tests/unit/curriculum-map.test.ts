import { describe, expect, it } from "vitest";
import { asCurriculum, CURRICULA, curriculumPromptLine, gradeName, gradeNameWithAge } from "@/lib/curriculum";
import { GRADE_OPTIONS } from "@/lib/grades";

describe("curriculum grade names", () => {
  it("UK Year N maps to US / IB / UAE Grade N-1 and Indian Class N-1", () => {
    expect(gradeName("Year 4", "uk")).toBe("Year 4");
    expect(gradeName("Year 4", "us")).toBe("Grade 3");
    expect(gradeName("Year 4", "ib")).toBe("Grade 3");
    expect(gradeName("Year 4", "uae")).toBe("Grade 3");
    expect(gradeName("Year 4", "indian")).toBe("Class 3");
    expect(gradeName("Year 7+", "us")).toBe("Grade 6+");
    expect(gradeName("Year 1–2", "indian")).toBe("UKG–Class 1");
  });

  it("every curriculum names every grade, with an age", () => {
    for (const c of CURRICULA) {
      for (const g of GRADE_OPTIONS) {
        expect(gradeName(g.id, c.id), `${c.id} ${g.id}`).toBeTruthy();
        expect(gradeNameWithAge(g.id, c.id)).toMatch(/\(age \d/);
      }
    }
  });

  it("unknown or missing curriculum falls back to UK (old saved profiles keep working)", () => {
    expect(asCurriculum(undefined)).toBe("uk");
    expect(asCurriculum("mars")).toBe("uk");
    expect(gradeName("Year 5", undefined)).toBe("Year 5");
  });

  it("AI prompt line uses the family's grade name and spelling", () => {
    const us = curriculumPromptLine({ gradeLabel: "Year 4", curriculum: "us" });
    expect(us).toContain('"Grade 3"');
    expect(us).toContain("same level as UK Year 4");
    expect(us).toContain("American English");
    const uk = curriculumPromptLine({ gradeLabel: "Year 4", curriculum: "uk" });
    expect(uk).toContain('"Year 4"');
    expect(uk).not.toContain("same level as");
    expect(uk).toContain("British English");
  });
});
