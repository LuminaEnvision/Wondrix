export type ReadingStory = {
  id: string;
  titleKey: "reading.storyPathTitle" | "reading.storyStarsTitle";
  /** Sentences for karaoke highlight + TTS. */
  sentences: string[];
  /** Optional Arabic sentences; used when the app language is Arabic. */
  sentencesAr?: string[];
};

/** Short School reading samples. */
export const READING_STORIES: ReadingStory[] = [
  {
    id: "path",
    titleKey: "reading.storyPathTitle",
    sentences: [
      "Wondrix walked along a sunny path.",
      "A leaf spun down and landed on a stone.",
      "Why do leaves change colour?",
      "Wondrix smiled and wrote the question in a little notebook.",
    ],
    sentencesAr: [
      "مشى ووندريكس في ممر مشمس.",
      "دارت ورقة وسقطت على حجر.",
      "لماذا يتغيّر لون أوراق الشجر؟",
      "ابتسم ووندريكس وكتب السؤال في دفتر صغير.",
    ],
  },
  {
    id: "stars",
    titleKey: "reading.storyStarsTitle",
    sentences: [
      "At night the sky looked like a dark blanket.",
      "Tiny lights blinked one by one.",
      "Those lights are stars, very far away.",
      "Wondrix whispered, I will learn more tomorrow.",
    ],
    sentencesAr: [
      "في الليل بدا السماء مثل بطانية داكنة.",
      "أضواء صغيرة وميضت واحدة بعد أخرى.",
      "تلك الأضواء نجوم، بعيدة جداً.",
      "همس ووندريكس: سأتعلّم المزيد غداً.",
    ],
  },
];

export function storySentences(story: ReadingStory, lang: "en" | "ar"): string[] {
  if (lang === "ar" && story.sentencesAr?.length) return story.sentencesAr;
  return story.sentences;
}
