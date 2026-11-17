import { describe, expect, it } from "vitest";
import { gradeFromAge, suggestedAgeFromGrade } from "@/lib/grades";

describe("gradeFromAge / suggestedAgeFromGrade", () => {
  it("maps teen ages away from Year 3", () => {
    expect(gradeFromAge(15).label).toBe("Year 11–13");
    expect(gradeFromAge("11").label).toBe("Year 7");
    expect(gradeFromAge(8).label).toBe("Year 4");
  });

  it("suggests age from year and round-trips sensibly", () => {
    expect(suggestedAgeFromGrade("Year 10")).toBe("14");
    expect(gradeFromAge(suggestedAgeFromGrade("Year 7")).label).toBe("Year 7");
  });
});
