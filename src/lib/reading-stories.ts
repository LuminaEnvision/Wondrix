export type ReadingStory = {
  id: string;
  titleKey: "reading.storyPathTitle" | "reading.storyStarsTitle";
  /** Sentences for karaoke highlight + TTS. */
  sentences: string[];
};

/** Short School reading samples (English for now; Arabic stories come later). */
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
  },
];
