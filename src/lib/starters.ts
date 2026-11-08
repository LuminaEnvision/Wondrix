/**
 * Starter questions for Extra: the opening line and the tap-able ideas on an
 * empty chat. A written list per age band and language, rotated per visit
 * (no model call), so the child never meets the same line twice in a row
 * and a 7-year-old and an 11-year-old see different starters.
 */
import type { Lang } from "./i18n";
import type { AgeBand } from "./types";

type List = Record<Lang, string[]>;

export const STARTERS: Record<AgeBand, List> = {
  young: {
    en: [
      "Why is the sky blue in the day, but black at night?",
      "Where does rain come from?",
      "Why does the Moon change shape?",
      "How do plants drink water?",
      "Why do magnets stick to the fridge?",
      "Why does ice melt in my hand?",
      "Why do we have day and night?",
      "How do fish breathe under water?",
      "Why do cats purr?",
      "How does a rainbow happen?",
      "Why do camels have humps?",
      "What makes thunder so loud?",
      "When did the dinosaurs live?",
      "What did dinosaurs eat?",
    ],
    ar: [
      "لماذا تكون السماء زرقاء في النهار وسوداء في الليل؟",
      "من أين يأتي المطر؟",
      "لماذا يتغيّر شكل القمر؟",
      "كيف تشرب النباتات الماء؟",
      "لماذا يلتصق المغناطيس بالثلاجة؟",
      "لماذا يذوب الثلج في يدي؟",
      "لماذا يوجد ليل ونهار؟",
      "كيف تتنفّس الأسماك تحت الماء؟",
      "لماذا تخرخر القطط؟",
      "كيف يظهر قوس قزح؟",
      "لماذا للجمل سنام؟",
      "لماذا صوت الرعد عالٍ جدًا؟",
      "متى عاشت الديناصورات؟",
      "ماذا كانت تأكل الديناصورات؟",
    ],
  },
  middle: {
    en: [
      "Why are sunsets orange and red?",
      "How does a magnet know which way is north?",
      "Why does the Moon look different every night?",
      "How do plants make their own food?",
      "Why does water turn into steam when it boils?",
      "How does a robot know where to go?",
      "Why do we see lightning before we hear thunder?",
      "How do our muscles make us move?",
      "Why do desert animals stay cool in the heat?",
      "How do planes stay up in the sky?",
      "Why does a ball fall down and not up?",
      "How does a phone screen know where I touch?",
      "When did the last dinosaurs live?",
      "How do we know what dinosaurs looked like?",
    ],
    ar: [
      "لماذا يكون الغروب برتقاليًا وأحمر؟",
      "كيف تعرف البوصلة اتجاه الشمال؟",
      "لماذا يبدو القمر مختلفًا كل ليلة؟",
      "كيف تصنع النباتات غذاءها بنفسها؟",
      "لماذا يتحوّل الماء إلى بخار عندما يغلي؟",
      "كيف يعرف الروبوت إلى أين يذهب؟",
      "لماذا نرى البرق قبل أن نسمع الرعد؟",
      "كيف تجعلنا عضلاتنا نتحرّك؟",
      "كيف تبقى حيوانات الصحراء باردة في الحر؟",
      "كيف تبقى الطائرات في السماء؟",
      "لماذا تسقط الكرة إلى الأسفل وليس إلى الأعلى؟",
      "كيف تعرف شاشة الهاتف أين ألمسها؟",
      "متى عاش آخر ديناصور؟",
      "كيف نعرف شكل الديناصورات؟",
    ],
  },
  teen: {
    en: [
      "Why is the sky blue but space is black?",
      "How do magnets and electricity make motors spin?",
      "What really causes the phases of the Moon?",
      "How does photosynthesis turn light into food?",
      "Why does salt water boil at a higher temperature?",
      "How does a neural network learn?",
      "Why do some materials conduct electricity and others don't?",
      "How do vaccines teach the body to fight germs?",
      "How does GPS know where I am?",
      "Why can't anything go faster than light?",
      "What really wiped out the dinosaurs?",
      "Are birds really dinosaurs?",
    ],
    ar: [
      "لماذا السماء زرقاء بينما الفضاء أسود؟",
      "كيف يجعل المغناطيس والكهرباء المحرّك يدور؟",
      "ما السبب الحقيقي لأطوار القمر؟",
      "كيف يحوّل البناء الضوئي الضوء إلى غذاء؟",
      "لماذا يغلي الماء المالح عند درجة حرارة أعلى؟",
      "كيف تتعلّم الشبكة العصبية؟",
      "لماذا توصل بعض المواد الكهرباء وبعضها لا؟",
      "كيف تعلّم اللقاحات الجسم محاربة الجراثيم؟",
      "كيف يعرف نظام GPS مكاني؟",
      "لماذا لا يمكن لشيء أن يسير أسرع من الضوء؟",
      "ما الذي قضى على الديناصورات فعلًا؟",
      "هل الطيور ديناصورات حقًا؟",
    ],
  },
};

/** `count` starters for this visit; consecutive visits get different ones. */
export function startersForVisit(band: AgeBand, lang: Lang, visit: number, count = 4): string[] {
  const list = STARTERS[band][lang];
  const start = (visit * count) % list.length;
  return Array.from({ length: Math.min(count, list.length) }, (_, i) => list[(start + i) % list.length]);
}

const VISIT_KEY = "wondrix-extra-visits";

/** Counts Extra visits on this device (browser only); 0 if storage is unavailable. */
export function nextExtraVisit(): number {
  try {
    const n = Number(localStorage.getItem(VISIT_KEY) ?? "0") || 0;
    localStorage.setItem(VISIT_KEY, String(n + 1));
    return n;
  } catch {
    return 0;
  }
}
