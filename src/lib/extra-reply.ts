/**
 * Content-first replies for Extra chat (local fallback, no API key needed).
 * A few answers carry a hand-made visual spec so the offline demo also shows
 * diagrams; with a key, the live agent draws visuals on the spot.
 */

import { safetyCheck } from "./safety";
import type { Visual } from "./visual";

export type ExtraReply = {
  text: string;
  visual?: Visual;
};

/** True for short replies that only make sense as an answer to the previous turn. */
export function isShortReply(text: string): boolean {
  const t = text.toLowerCase().trim().replace(/[.!?]+$/, "");
  return /^(yes|yeah|yep|yup|no|nope|ok|okay|sure|maybe|why|how|really|cool|wow|i don'?t know|idk|tell me more|more|go on)$/.test(t) || t.split(/\s+/).length <= 2;
}

export function localExtraReply(
  childText: string,
  topicId?: string | null,
  /** True when there is an earlier conversation in this session. */
  midConversation = false,
): ExtraReply {
  const gate = safetyCheck(childText);
  if (!gate.ok) {
    return { text: gate.redirect };
  }

  const t = childText.toLowerCase().trim();

  // Mid-chat short answer while the live agent is unavailable: don't jump to a random
  // topic (it feels like Wondrix forgot); be honest and keep the thread.
  if (midConversation && isShortReply(t) && !/^(hi|hello|hey|hola)\b/.test(t)) {
    return {
      text: "I love that you're keeping our chat going! I need a moment to think right now. Can you tell me a little more, or ask me again in a few seconds?",
    };
  }

  if (!t || /^(hi|hello|hey|hola)\b/.test(t)) {
    return {
      text: "Hi. Ask me anything you're curious about. For example: why are wheels round, or why is the sky blue?",
    };
  }

  if (/chemist|atom|molecule|element|react/.test(t) || topicId === "chemistry") {
    return {
      text: "Chemistry is about how tiny bits of stuff join and change. Atoms link into molecules, like LEGO bricks making new shapes. Water is two hydrogen atoms and one oxygen. Want to know why soap helps wash grease?",
    };
  }

  if (/wheel|wheels|circle|circular|round/.test(t)) {
    return {
      text: "Wheels are round so they can roll. A circle keeps the middle (the axle) the same height above the ground the whole time, so the ride stays smooth. A square wheel would go bump-bump-bump. Want to try imagining a triangle wheel next?",
      visual: {
        kind: "compare",
        title: "Round wheel vs square wheel",
        columns: [
          { label: "Round wheel", points: ["Axle stays the same height", "Rolls smoothly"] },
          { label: "Square wheel", points: ["Axle goes up and down", "Bump, bump, bump"] },
        ],
      },
    };
  }

  if (/sky|blue/.test(t) && /night|black|dark|day/.test(t)) {
    return {
      text: "In the day, sunlight hits tiny bits in the air and blue light scatters toward your eyes. At night the Sun is on the other side of Earth, so that blue glow is gone and space looks dark. Want to know what air has to do with it?",
    };
  }

  if (/sky.*blue|blue.*sky|why.*blue/.test(t)) {
    return {
      text: "Sunlight has many colors. Tiny bits of air scatter blue light more than red, so the sky looks blue to us. Want a tiny experiment you can try with a glass of water?",
    };
  }

  if (/earth|spin|rotat|moving|day and night|day.?night/.test(t)) {
    return {
      text: "Earth is always spinning, like a top that never stops. That spin is why we get day and night. What do you think would happen if Earth stopped spinning?",
      visual: { kind: "scene", title: "Day and night", scene: "day-night", items: [] },
    };
  }

  if (/\b(ice|melt|melts|melting|boil|boils|steam|solid|liquid|gas|freez\w*)\b/.test(t)) {
    return {
      text: "Ice, water and steam are the same stuff in three forms. Ice is a solid and keeps its shape. Heat melts it into liquid water, and more heat turns water into steam, a gas. Cooling turns it back again. Want to know why ice floats?",
      visual: { kind: "scene", title: "Solid, liquid, gas", scene: "states-of-matter", items: [] },
    };
  }

  if (/moon|phase|crescent|shape/.test(t)) {
    return {
      text: "The Moon doesn't really change shape. Sunlight hits different parts as it goes around Earth, so we see a crescent, a half, or a full circle. Want to know what a new moon is?",
      visual: { kind: "scene", title: "Moon phases in a month", scene: "moon-phases", items: [] },
    };
  }

  if (/robot|path|grid|arrow|know where/.test(t) || topicId === "robots") {
    return {
      text: "A robot follows steps someone wrote. Sensors look, then it chooses a move. On a grid, arrows are those steps toward a goal. Want to invent a tiny path together?",
    };
  }

  if (/plant|root|drink|water|living/.test(t) || topicId === "life") {
    return {
      text: "Roots drink water from the soil and send it up the stem to the leaves. The plant uses water, air, and light to make food. Want to know what leaves do with sunlight?",
      visual: { kind: "scene", title: "How a plant drinks and makes food", scene: "plant-food", items: [] },
    };
  }

  if (/star|sun|space|planet|galaxy/.test(t)) {
    return {
      text: "Stars are giant balls of hot glowing gas, very far away. Our Sun is the closest star. At night we see other stars as tiny points of light. Want to know why they twinkle?",
    };
  }

  if (/rain|cloud|thunder|lightning|weather/.test(t)) {
    return {
      text: "Clouds are made of tiny water drops. When drops join and get heavy, they fall as rain. Lightning is a giant spark of electricity in the cloud. Want to know why thunder comes after lightning?",
      visual: { kind: "scene", title: "The water cycle", scene: "water-cycle", items: [] },
    };
  }

  if (/dinosaur|fossil/.test(t)) {
    return {
      text: "Dinosaurs lived long before people. We learn about them from fossils: bones and footprints turned into rock. Want to know how a fossil forms?",
    };
  }

  if (/magnet|magnetic/.test(t)) {
    return {
      text: "Magnets pull some metals, like iron, without touching them. Every magnet has a north and south side. Same sides push away; different sides pull together. Want to try a fridge-magnet thought experiment?",
    };
  }

  if (/electric|electricity|battery|plug/.test(t)) {
    return {
      text: "Electricity is a flow of tiny charges that can light a bulb or run a toy. A battery pushes that flow around a path called a circuit. Want to know what happens if the path breaks?",
    };
  }

  if (/want to know|i want|tell me|explain/.test(t) && t.length < 40) {
    return {
      text: "I'm ready. Tell me the thing you're wondering about in one short question. For example: why are wheels round?",
    };
  }

  return {
    // Generic fallback (unknown question, or the live agent timed out). It must not
    // echo the question back or promise to "explore" it: the question was not checked
    // by the AI safety layer, so stay neutral and steer to safe curiosity.
    text: "I couldn't think that one through just now. Try asking again in a moment, or ask me a why or how question about stars, robots, plants, or how something works. What are you curious about?",
  };
}
