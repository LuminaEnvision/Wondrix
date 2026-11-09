/**
 * Content-first replies for Extra chat (local fallback, no API key needed, or
 * when the live agent times out). English + Arabic (draft, for native review):
 * an Arabic child must never fall back to an English answer.
 * A few answers carry a ready-made scene so the offline demo also shows visuals.
 */

import type { Lang } from "./i18n";
import { safeRedirect, safetyCheck } from "./safety";
import type { Visual } from "./visual";

export type ExtraReply = {
  text: string;
  visual?: Visual;
  /** Short questions the child can tap next. */
  suggestions?: string[];
};

type Text = Record<Lang, string>;

const IDEAS: Record<Lang, string[]> = {
  en: ["Why is the sky blue?", "How do magnets work?", "Where does rain come from?"],
  ar: ["لماذا السماء زرقاء؟", "كيف يعمل المغناطيس؟", "من أين يأتي المطر؟"],
};

/** True for short replies that only make sense as an answer to the previous turn. */
export function isShortReply(text: string): boolean {
  const t = text.toLowerCase().trim().replace(/[.!?؟]+$/, "");
  return (
    /^(yes|yeah|yep|yup|no|nope|ok|okay|sure|maybe|why|how|really|cool|wow|i don'?t know|idk|tell me more|more|go on)$/.test(t) ||
    /^(نعم|أجل|لا|حسنًا|حسنا|طيب|لماذا|كيف|ربما|واو|لا أعرف|أكمل|المزيد)$/.test(t) ||
    t.split(/\s+/).length <= 2
  );
}

/** The child wants to stop (bed, food, bye): agree warmly, no question that keeps them talking. */
export function isGoodbye(text: string): boolean {
  return (
    /\b(bye|goodbye|good ?night|see you|gotta go|have to go|i('m| am) (tired|sleepy|going)|go(ing)? to (bed|sleep)|time (to|for) (bed|sleep|dinner|lunch)|bed ?time|stop now|i want to stop)\b/i.test(text) ||
    /(مع السلامة|إلى اللقاء|الى اللقاء|تصبح على خير|تصبحين على خير|وقت النوم|سأنام|أريد أن أنام|نعسان|نعسانة|تعبان|وداعا|وداعًا|باي)/.test(text)
  );
}

/** One offline answer: English and Arabic keyword patterns, text in both languages. */
type Entry = {
  en: RegExp;
  ar?: RegExp;
  topicId?: string;
  text: Text;
  scene?: { scene: Extract<Visual, { kind: "scene" }>["scene"]; title: Text };
  /** English-only diagram (labels are English). */
  visualEn?: Visual;
};

const ENTRIES: Entry[] = [
  {
    en: /chemist|atom|molecule|element|react/,
    ar: /كيمياء|ذرة|ذرات|جزيء|جزيئات|عنصر/,
    topicId: "chemistry",
    text: {
      en: "Chemistry is about how tiny bits of stuff join and change. Atoms link into molecules, like LEGO bricks making new shapes. Water is two hydrogen atoms and one oxygen. Want to know why soap helps wash grease?",
      ar: "الكيمياء تدرس كيف تتّحد الأجزاء الصغيرة جدًا من الأشياء وتتغيّر. الذرّات ترتبط معًا فتصنع جزيئات، مثل قطع الليغو التي تصنع أشكالًا جديدة. الماء مكوّن من ذرّتين من الهيدروجين وذرّة من الأكسجين. هل تريد أن تعرف لماذا يساعد الصابون على إزالة الدهون؟",
    },
  },
  {
    en: /wheel|wheels|circle|circular|round/,
    ar: /عجلة|عجلات|دائرة|دائري/,
    text: {
      en: "Wheels are round so they can roll. A circle keeps the middle (the axle) the same height above the ground the whole time, so the ride stays smooth. A square wheel would go bump-bump-bump. Want to try imagining a triangle wheel next?",
      ar: "العجلات دائرية حتى تتدحرج. الدائرة تُبقي منتصفها (المحور) على الارتفاع نفسه فوق الأرض طوال الوقت، فتبقى الرحلة ناعمة. أما العجلة المربعة فستقفز طق طق طق. هل تتخيّل معي عجلة على شكل مثلث؟",
    },
    visualEn: {
      kind: "compare",
      title: "Round wheel vs square wheel",
      columns: [
        { label: "Round wheel", points: ["Axle stays the same height", "Rolls smoothly"] },
        { label: "Square wheel", points: ["Axle goes up and down", "Bump, bump, bump"] },
      ],
    },
  },
  {
    en: /(sky|blue).*(night|black|dark|day)|(night|black|dark|day).*(sky|blue)/,
    ar: /(السماء|زرقاء|أزرق).*(الليل|سوداء|مظلمة|النهار)/,
    text: {
      en: "In the day, sunlight hits tiny bits in the air and blue light scatters toward your eyes. At night the Sun is on the other side of Earth, so that blue glow is gone and space looks dark. Want to know what air has to do with it?",
      ar: "في النهار يصطدم ضوء الشمس بأجزاء صغيرة جدًا في الهواء، فيتبعثر الضوء الأزرق نحو عينيك. وفي الليل تكون الشمس في الجهة الأخرى من الأرض، فيختفي هذا اللون الأزرق ويبدو الفضاء مظلمًا. هل تريد أن تعرف ما دور الهواء في ذلك؟",
    },
    scene: { scene: "sky-colours", title: { en: "Why the sky is blue", ar: "لماذا السماء زرقاء" } },
  },
  {
    en: /sky.*blue|blue.*sky|why.*blue|sunset/,
    ar: /السماء|زرقاء|الغروب|غروب/,
    text: {
      en: "Sunlight has many colors. Tiny bits of air scatter blue light more than red, so the sky looks blue to us. Want a tiny experiment you can try with a glass of water?",
      ar: "ضوء الشمس فيه ألوان كثيرة. أجزاء الهواء الصغيرة تبعثر الضوء الأزرق أكثر من الأحمر، لذلك تبدو السماء زرقاء. هل تريد تجربة صغيرة بكأس من الماء؟",
    },
    scene: { scene: "sky-colours", title: { en: "Why the sky is blue", ar: "لماذا السماء زرقاء" } },
  },
  {
    en: /earth|spin|rotat|moving|day and night|day.?night/,
    ar: /الأرض|تدور|دوران|الليل والنهار|ليل ونهار/,
    text: {
      en: "Earth is always spinning, like a top that never stops. That spin is why we get day and night. What do you think would happen if Earth stopped spinning?",
      ar: "الأرض تدور دائمًا، مثل نحلة لا تتوقف. هذا الدوران هو سبب الليل والنهار. ماذا تظن أنه سيحدث لو توقفت الأرض عن الدوران؟",
    },
    scene: { scene: "day-night", title: { en: "Day and night", ar: "الليل والنهار" } },
  },
  {
    en: /\b(ice|melt|melts|melting|boil|boils|steam|solid|liquid|gas|freez\w*)\b/,
    ar: /ثلج|جليد|يذوب|ذوبان|يغلي|غليان|بخار|صلب|سائل|غاز|تجمد/,
    text: {
      en: "Ice, water and steam are the same stuff in three forms. Ice is a solid and keeps its shape. Heat melts it into liquid water, and more heat turns water into steam, a gas. Cooling turns it back again. Want to know why ice floats?",
      ar: "الجليد والماء والبخار شيء واحد في ثلاثة أشكال. الجليد صلب ويحافظ على شكله. الحرارة تذيبه فيصير ماءً سائلًا، وحرارة أكثر تحوّله إلى بخار، أي غاز. والتبريد يعيده كما كان. هل تريد أن تعرف لماذا يطفو الجليد؟",
    },
    scene: { scene: "states-of-matter", title: { en: "Solid, liquid, gas", ar: "صلب وسائل وغاز" } },
  },
  {
    en: /moon|phase|crescent|shape/,
    ar: /القمر|قمر|هلال|بدر|شكل/,
    text: {
      en: "The Moon doesn't really change shape. Sunlight hits different parts as it goes around Earth, so we see a crescent, a half, or a full circle. Want to know what a new moon is?",
      ar: "القمر لا يتغيّر شكله حقًا. ضوء الشمس يضيء أجزاء مختلفة منه وهو يدور حول الأرض، فنراه هلالًا أو نصف دائرة أو دائرة كاملة. هل تريد أن تعرف ما هو القمر الجديد؟",
    },
    scene: { scene: "moon-phases", title: { en: "Moon phases in a month", ar: "أطوار القمر في شهر" } },
  },
  {
    en: /robot|path|grid|arrow|know where/,
    ar: /روبوت|آلي|مسار/,
    topicId: "robots",
    text: {
      en: "A robot follows steps someone wrote. Sensors look, then it chooses a move. On a grid, arrows are those steps toward a goal. Want to invent a tiny path together?",
      ar: "الروبوت يتبع خطوات كتبها شخص ما. أجهزة الاستشعار تنظر حوله، ثم يختار حركته. على شبكة مربعات، الأسهم هي تلك الخطوات نحو الهدف. هل نخترع معًا مسارًا صغيرًا؟",
    },
  },
  {
    en: /plant|root|drink|water|living/,
    ar: /نبات|نباتات|جذور|جذر|تشرب|الماء|ماء|شجرة/,
    topicId: "life",
    text: {
      en: "Roots drink water from the soil and send it up the stem to the leaves. The plant uses water, air, and light to make food. Want to know what leaves do with sunlight?",
      ar: "الجذور تشرب الماء من التربة وترسله عبر الساق إلى الأوراق. والنبات يستخدم الماء والهواء والضوء ليصنع غذاءه. هل تريد أن تعرف ماذا تفعل الأوراق بضوء الشمس؟",
    },
    scene: { scene: "plant-food", title: { en: "How a plant drinks and makes food", ar: "كيف يشرب النبات ويصنع غذاءه" } },
  },
  {
    en: /star|sun|space|planet|galaxy/,
    ar: /نجم|نجوم|الشمس|شمس|الفضاء|كوكب|مجرة/,
    text: {
      en: "Stars are giant balls of hot glowing gas, very far away. Our Sun is the closest star. At night we see other stars as tiny points of light. Want to know why they twinkle?",
      ar: "النجوم كرات عملاقة من غاز ساخن متوهّج، بعيدة جدًا. وشمسنا هي أقرب نجم إلينا. في الليل نرى النجوم الأخرى نقاطًا صغيرة من الضوء. هل تريد أن تعرف لماذا تتلألأ؟",
    },
  },
  {
    en: /rain|cloud|thunder|lightning|weather/,
    ar: /مطر|المطر|سحاب|سحب|غيوم|رعد|برق|طقس/,
    text: {
      en: "Clouds are made of tiny water drops. When drops join and get heavy, they fall as rain. Lightning is a giant spark of electricity in the cloud. Want to know why thunder comes after lightning?",
      ar: "السحب مصنوعة من قطرات ماء صغيرة جدًا. عندما تتجمّع القطرات وتصبح ثقيلة، تسقط مطرًا. والبرق شرارة كهرباء عملاقة داخل السحابة. هل تريد أن تعرف لماذا يأتي الرعد بعد البرق؟",
    },
    scene: { scene: "water-cycle", title: { en: "The water cycle", ar: "دورة الماء" } },
  },
  {
    en: /dinosaur|fossil/,
    ar: /ديناصور|ديناصورات|أحفور|حفريات/,
    text: {
      en: "Dinosaurs lived for a very long time, and the last big ones died out about 66 million years ago, long before people. We learn about them from fossils: bones and footprints turned into rock. Want to know how a fossil forms?",
      ar: "عاشت الديناصورات زمنًا طويلًا جدًا، وانقرض آخر الديناصورات الكبيرة قبل نحو 66 مليون سنة، قبل وجود البشر بكثير. نتعرّف عليها من الأحافير: عظام وآثار أقدام تحوّلت إلى صخر. هل تريد أن تعرف كيف تتكوّن الأحفورة؟",
    },
  },
  {
    en: /magnet|magnetic/,
    ar: /مغناطيس|مغناطيسي|مغناطيسية/,
    text: {
      en: "Magnets pull some metals, like iron, without touching them. Every magnet has a north and south side. Same sides push away; different sides pull together. Want to try a fridge-magnet thought experiment?",
      ar: "المغناطيس يجذب بعض المعادن، مثل الحديد، من دون أن يلمسها. لكل مغناطيس جهة شمالية وجهة جنوبية. الجهتان المتشابهتان تتنافران، والمختلفتان تتجاذبان. هل نجرّب تجربة تخيّلية مع مغناطيس الثلاجة؟",
    },
    scene: { scene: "magnets", title: { en: "How magnets work", ar: "كيف يعمل المغناطيس" } },
  },
  {
    en: /electric|electricity|battery|plug/,
    ar: /كهرباء|كهربائي|بطارية|مصباح/,
    text: {
      en: "Electricity is a flow of tiny charges that can light a bulb or run a toy. A battery pushes that flow around a path called a circuit. Want to know what happens if the path breaks?",
      ar: "الكهرباء تدفّق لشحنات صغيرة جدًا يمكنها أن تضيء مصباحًا أو تشغّل لعبة. البطارية تدفع هذا التدفّق في مسار اسمه الدائرة الكهربائية. هل تريد أن تعرف ماذا يحدث إذا انقطع المسار؟",
    },
  },
];

const T = {
  goodnight: {
    en: "You're right, it's time to rest. Sleep gives your brain and body energy for tomorrow. Good night, sweet dreams!",
    ar: "معك حق، حان وقت الراحة. النوم يعطي دماغك وجسمك طاقة للغد. تصبح على خير، وأحلامًا سعيدة!",
  },
  bye: {
    en: "Okay, see you soon! I'll keep collecting cool questions for next time.",
    ar: "حسنًا، أراك قريبًا! سأجمع أسئلة رائعة للمرة القادمة.",
  },
  name: {
    en: "I'm Wondrix! A little explorer owl who collects big questions in my bag, and yours are my favourite. What are you curious about today?",
    ar: "أنا ووندريكس! بومة مستكشفة صغيرة أجمع الأسئلة الكبيرة في حقيبتي، وأسئلتك هي المفضّلة عندي. ما الذي يثير فضولك اليوم؟",
  },
  stuck: {
    en: "That's okay, even explorers need a map! Pick one of these, or ask anything you wonder about.",
    ar: "لا بأس، حتى المستكشفون يحتاجون إلى خريطة! اختر واحدًا من هذه، أو اسأل عن أي شيء يخطر ببالك.",
  },
  keepGoing: {
    en: "I love that you're keeping our chat going! I need a moment to think right now. Can you tell me a little more, or ask me again in a few seconds?",
    ar: "يعجبني أنك تكمل حديثنا! أحتاج لحظة لأفكّر الآن. هل تخبرني بالمزيد قليلًا، أو تسألني مرة أخرى بعد ثوانٍ؟",
  },
  hello: {
    en: "Hi, I'm Wondrix! Ask me anything you're curious about, or tap an idea.",
    ar: "مرحبًا، أنا ووندريكس! اسألني عن أي شيء يثير فضولك، أو اضغط على فكرة.",
  },
  ready: {
    en: "I'm ready. Tell me the thing you're wondering about in one short question. For example: why are wheels round?",
    ar: "أنا جاهز. أخبرني بما تتساءل عنه في سؤال قصير. مثلًا: لماذا العجلات دائرية؟",
  },
  // Generic fallback (unknown question, or the live agent timed out). It must not
  // echo the question back or promise to "explore" it: the question was not checked
  // by the AI safety layer, so stay neutral and steer to safe curiosity.
  tangled: {
    en: "Oops, my thinking got a bit tangled! Tap one of these ideas, or can you ask me again in a moment?",
    ar: "أوه، تشابكت أفكاري قليلًا! اضغط على إحدى هذه الأفكار، أو هل تسألني مرة أخرى بعد لحظة؟",
  },
} satisfies Record<string, Text>;

export function localExtraReply(
  childText: string,
  topicId?: string | null,
  /** True when there is an earlier conversation in this session. */
  midConversation = false,
  lang: Lang = "en",
): ExtraReply {
  const gate = safetyCheck(childText);
  if (!gate.ok) return { text: safeRedirect(lang) };

  const t = childText.toLowerCase().trim();
  const ideas = IDEAS[lang];

  if (isGoodbye(t)) {
    return { text: /night|bed|sleep|tired|sleepy|النوم|أنام|نعسان|نعسانة|تعبان|تصبح/.test(t) ? T.goodnight[lang] : T.bye[lang] };
  }
  if (
    /\b(your name|who are you|what are you|are you (a )?(robot|real|human|person|alive))\b/.test(t) ||
    /(اسمك|من أنت|ما أنت|هل أنت روبوت)/.test(t)
  ) {
    return { text: T.name[lang], suggestions: ideas };
  }
  if (
    /\b(don'?t know what to (ask|say)|what (should|can|do) i ask|i'?m bored|no idea)\b/.test(t) ||
    /(لا أعرف ماذا أسأل|ماذا أسأل|أشعر بالملل|ملل)/.test(t)
  ) {
    return { text: T.stuck[lang], suggestions: ideas };
  }

  const greeting = /^(hi|hello|hey|hola)\b/.test(t) || /^(مرحبا|مرحبًا|أهلا|أهلًا|السلام عليكم|هاي)/.test(t);
  // Mid-chat short answer while the live agent is unavailable: don't jump to a random
  // topic (it feels like Wondrix forgot); be honest and keep the thread.
  if (midConversation && isShortReply(t) && !greeting) return { text: T.keepGoing[lang] };
  if (!t || greeting) return { text: T.hello[lang], suggestions: ideas };

  for (const e of ENTRIES) {
    const hit = e.en.test(t) || Boolean(e.ar?.test(t)) || (Boolean(e.topicId) && e.topicId === topicId);
    if (!hit) continue;
    const reply: ExtraReply = { text: e.text[lang] };
    if (e.scene) reply.visual = { kind: "scene", title: e.scene.title[lang], scene: e.scene.scene, items: [] };
    else if (e.visualEn && lang === "en") reply.visual = e.visualEn;
    return reply;
  }

  if (/want to know|i want|tell me|explain/.test(t) && t.length < 40) return { text: T.ready[lang] };
  return { text: T.tangled[lang], suggestions: ideas };
}
