/**
 * Wonder topic seeds by age band + language. Same topic card, different first
 * question as the child grows; re-taps rotate so the seed does not feel stuck.
 */
import type { Lang } from "./i18n";
import type { AgeBand } from "./types";

export type TopicId = "physics" | "robots" | "sky" | "life" | "chemistry";

type SeedList = Record<Lang, string[]>;

const SEEDS: Record<TopicId, Record<AgeBand, SeedList>> = {
  physics: {
    young: {
      en: [
        "Why is the Earth moving?",
        "Why does a ball fall down and not up?",
        "Why do magnets stick to the fridge?",
        "What makes a swing go higher?",
      ],
      ar: [
        "لماذا تتحرك الأرض؟",
        "لماذا تسقط الكرة إلى الأسفل وليس إلى الأعلى؟",
        "لماذا يلتصق المغناطيس بالثلاجة؟",
        "ما الذي يجعل الأرجوحة أعلى؟",
      ],
    },
    middle: {
      en: [
        "Why does a ball fall down and not up?",
        "How does friction slow things down?",
        "Why do we feel heavier in some rides?",
        "How does a lever make lifting easier?",
      ],
      ar: [
        "لماذا تسقط الكرة إلى الأسفل وليس إلى الأعلى؟",
        "كيف يبطّئ الاحتكاك الأشياء؟",
        "لماذا نشعر بأننا أثقل في بعض الألعاب؟",
        "كيف تجعل الرافعة الرفع أسهل؟",
      ],
    },
    teen: {
      en: [
        "Why can't anything go faster than light?",
        "How do magnets and electricity make motors spin?",
        "What is the difference between mass and weight?",
        "How does energy change forms without disappearing?",
      ],
      ar: [
        "لماذا لا يمكن لشيء أن يسير أسرع من الضوء؟",
        "كيف يجعل المغناطيس والكهرباء المحرّك يدور؟",
        "ما الفرق بين الكتلة والوزن؟",
        "كيف تتغيّر أشكال الطاقة دون أن تختفي؟",
      ],
    },
  },
  robots: {
    young: {
      en: [
        "How does a robot know where to go?",
        "Can a robot see like we do?",
        "Why do some toys move by themselves?",
        "How does a remote control work?",
      ],
      ar: [
        "كيف يعرف الروبوت إلى أين يذهب؟",
        "هل يستطيع الروبوت أن يرى مثلنا؟",
        "لماذا تتحرّك بعض الألعاب وحدها؟",
        "كيف يعمل جهاز التحكم؟",
      ],
    },
    middle: {
      en: [
        "How does a robot decide what to do next?",
        "How does a phone screen know where I touch?",
        "What sensors help a robot not bump into walls?",
        "How do robots follow a line on the floor?",
      ],
      ar: [
        "كيف يقرّر الروبوت ماذا يفعل بعد ذلك؟",
        "كيف تعرف شاشة الهاتف أين ألمسها؟",
        "ما المستشعرات التي تساعد الروبوت على عدم الاصطدام؟",
        "كيف يتبع الروبوت خطًا على الأرض؟",
      ],
    },
    teen: {
      en: [
        "How does a neural network learn?",
        "How do robots use sensors and code together?",
        "What is the difference between a rule and machine learning?",
        "How does GPS help a robot or phone know where it is?",
      ],
      ar: [
        "كيف تتعلّم الشبكة العصبية؟",
        "كيف يستخدم الروبوت المستشعرات والبرمجة معًا؟",
        "ما الفرق بين القاعدة والتعلّم الآلي؟",
        "كيف يساعد نظام GPS الروبوت أو الهاتف على معرفة المكان؟",
      ],
    },
  },
  sky: {
    young: {
      en: [
        "Why does the Moon change shape?",
        "Why is the sky blue in the day?",
        "Where do stars go in the daytime?",
        "Why do we have day and night?",
      ],
      ar: [
        "لماذا يتغيّر شكل القمر؟",
        "لماذا تكون السماء زرقاء في النهار؟",
        "إلى أين تذهب النجوم في النهار؟",
        "لماذا يوجد ليل ونهار؟",
      ],
    },
    middle: {
      en: [
        "Why are sunsets orange and red?",
        "Why does the Moon look different every night?",
        "How do planets stay in orbit?",
        "Why do we see lightning before we hear thunder?",
      ],
      ar: [
        "لماذا يكون الغروب برتقاليًا وأحمر؟",
        "لماذا يبدو القمر مختلفًا كل ليلة؟",
        "كيف تبقى الكواكب في مدارها؟",
        "لماذا نرى البرق قبل أن نسمع الرعد؟",
      ],
    },
    teen: {
      en: [
        "Why is the sky blue but space is black?",
        "What really causes the phases of the Moon?",
        "How does light travel from the Sun to Earth?",
        "Why do seasons change as Earth orbits?",
      ],
      ar: [
        "لماذا السماء زرقاء بينما الفضاء أسود؟",
        "ما السبب الحقيقي لأطوار القمر؟",
        "كيف ينتقل الضوء من الشمس إلى الأرض؟",
        "لماذا تتغيّر الفصول أثناء دوران الأرض؟",
      ],
    },
  },
  life: {
    young: {
      en: [
        "How do plants drink water?",
        "Why do cats purr?",
        "How do fish breathe under water?",
        "Why do camels have humps?",
      ],
      ar: [
        "كيف تشرب النباتات الماء؟",
        "لماذا تخرخر القطط؟",
        "كيف تتنفّس الأسماك تحت الماء؟",
        "لماذا للجمل سنام؟",
      ],
    },
    middle: {
      en: [
        "How do plants make their own food?",
        "Why do desert animals stay cool in the heat?",
        "How do our muscles make us move?",
        "Why do leaves change colour?",
      ],
      ar: [
        "كيف تصنع النباتات غذاءها بنفسها؟",
        "كيف تبقى حيوانات الصحراء باردة في الحر؟",
        "كيف تجعلنا عضلاتنا نتحرّك؟",
        "لماذا يتغيّر لون الأوراق؟",
      ],
    },
    teen: {
      en: [
        "How does photosynthesis turn light into food?",
        "How do vaccines teach the body to fight germs?",
        "What makes a habitat work for living things?",
        "How do cells work together in a body?",
      ],
      ar: [
        "كيف يحوّل البناء الضوئي الضوء إلى غذاء؟",
        "كيف تعلّم اللقاحات الجسم محاربة الجراثيم؟",
        "ما الذي يجعل الموطن مناسبًا للكائنات الحية؟",
        "كيف تعمل الخلايا معًا في الجسم؟",
      ],
    },
  },
  chemistry: {
    young: {
      en: [
        "What is a molecule?",
        "Why does ice melt in my hand?",
        "Why does water turn into steam?",
        "What makes bubbles pop?",
      ],
      ar: [
        "ما هو الجزيء؟",
        "لماذا يذوب الثلج في يدي؟",
        "لماذا يتحوّل الماء إلى بخار؟",
        "ما الذي يجعل الفقاعات تنفجر؟",
      ],
    },
    middle: {
      en: [
        "Why does water turn into steam when it boils?",
        "Why does salt dissolve in water?",
        "What happens when vinegar meets baking soda?",
        "Why do some metals rust?",
      ],
      ar: [
        "لماذا يتحوّل الماء إلى بخار عندما يغلي؟",
        "لماذا يذوب الملح في الماء؟",
        "ماذا يحدث عندما يلتقي الخل بصودا الخبز؟",
        "لماذا يصدأ بعض المعادن؟",
      ],
    },
    teen: {
      en: [
        "Why does salt water boil at a higher temperature?",
        "Why do some materials conduct electricity and others don't?",
        "What is a chemical reaction vs a physical change?",
        "How do atoms rearrange when something burns?",
      ],
      ar: [
        "لماذا يغلي الماء المالح عند درجة حرارة أعلى؟",
        "لماذا توصل بعض المواد الكهرباء وبعضها لا؟",
        "ما الفرق بين التفاعل الكيميائي والتغيّر الفيزيائي؟",
        "كيف تُعاد ترتيب الذرات عندما يحترق شيء؟",
      ],
    },
  },
};

/** One seed for this topic tap; rotates with visit so re-taps feel fresh. */
export function topicSeedFor(
  topicId: TopicId,
  band: AgeBand,
  lang: Lang,
  visit: number,
): string {
  const list = SEEDS[topicId][band][lang];
  return list[visit % list.length] ?? list[0];
}
