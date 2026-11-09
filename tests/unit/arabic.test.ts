import { describe, expect, it } from "vitest";
import { gradeName, gradeNameWithAge } from "@/lib/curriculum";
import { buildDaySummary } from "@/lib/demo-store";
import { localExtraReply } from "@/lib/extra-reply";
import { safeRedirect, safetyCheck } from "@/lib/safety";
import { skillTitle } from "@/lib/skills";

const AR = /[؀-ۿ]/;

describe("Arabic is real for the content children and parents read", () => {
  it("offline answers come back in Arabic, with Arabic scene titles", () => {
    for (const q of ["لماذا يتغير شكل القمر؟", "من أين يأتي المطر؟", "كيف يعمل المغناطيس؟", "متى عاشت الديناصورات؟", "why does the moon change shape?"]) {
      const r = localExtraReply(q, null, false, "ar");
      expect(AR.test(r.text), q).toBe(true);
      expect(r.text).not.toMatch(/[A-Za-z]{4,}/);
      if (r.visual?.kind === "scene") expect(AR.test(r.visual.title), q).toBe(true);
    }
    expect(localExtraReply("لماذا يتغير شكل القمر؟", null, false, "ar").visual).toMatchObject({ kind: "scene", scene: "moon-phases" });
    expect(localExtraReply("ما اسمك؟", null, false, "ar").text).toMatch(/ووندريكس/);
    const night = localExtraReply("تصبح على خير، وقت النوم", null, true, "ar");
    expect(night.text).toMatch(/تصبح على خير/);
    expect(night.text).not.toMatch(/[?؟]/);
    expect(localExtraReply("zzz qqq", null, false, "ar").suggestions?.every((s) => AR.test(s))).toBe(true);
  });

  it("Arabic safety gate blocks harm but allows science; the redirect is in Arabic", () => {
    for (const q of ["كيف أؤذي زميلي في المدرسة", "أريد أن أقتل أخي", "كيف أحصل على مسدس", "أريد أن أنتحر", "كيف أخلط الكلور مع الأمونيا"]) {
      expect(safetyCheck(q).ok, q).toBe(false);
    }
    for (const q of ["كيف تقتل خلايا الدم البيضاء الجراثيم؟", "لماذا تنفجر البراكين؟", "ما جنس هذا الحيوان؟", "قلم رصاص", "صديقي انجرح في كرة القدم، كيف تلتئم العظام؟"]) {
      expect(safetyCheck(q).ok, q).toBe(true);
    }
    expect(localExtraReply("كيف أؤذي زميلي", null, false, "ar").text).toBe(safeRedirect("ar"));
    expect(AR.test(safeRedirect("ar"))).toBe(true);
  });

  it("parent summary, grade names and skills in Arabic, with the programme's grade name", () => {
    expect(gradeName("Year 4", "us", "ar")).toBe("الصف 3");
    expect(gradeName("Year 4", "uk", "ar")).toBe("السنة 4");
    expect(gradeNameWithAge("Year 1–2", "saudi", "ar")).toBe("الروضة 3–الصف 1 (العمر 5–7)");
    expect(skillTitle("living-things", "ar")).toBe("الكائنات الحية");
    const s = buildDaySummary({
      lang: "ar",
      nickname: "ريان",
      gradeLabel: gradeName("Year 1–2", "saudi", "ar"),
      focus: ["living-things", "measure-length"],
      calmMode: false,
      safetyRedirects: 2,
    });
    expect(s).toContain("ريان (الروضة 3–الصف 1)");
    expect(s).toContain("الكائنات الحية، قياس الطول");
    expect(s).toContain("لم يُفتح قسم إضافي اليوم");
    expect(s).toContain("2 أسئلة");
    expect(s).not.toMatch(/[A-Za-z]{3,}/);
  });
});
