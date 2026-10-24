/**
 * Content-first replies for Extra chat.
 * Text only. On-the-spot visuals are a later agent capability.
 */

import { safetyCheck } from "./safety";

export type ExtraReply = {
  text: string;
};

export function localExtraReply(
  childText: string,
  topicId?: string | null,
): ExtraReply {
  const gate = safetyCheck(childText);
  if (!gate.ok) {
    return { text: gate.redirect };
  }

  const t = childText.toLowerCase().trim();

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
    };
  }

  if (/moon|phase|crescent|shape/.test(t)) {
    return {
      text: "The Moon doesn't really change shape. Sunlight hits different parts as it goes around Earth, so we see a crescent, a half, or a full circle. Want to know what a new moon is?",
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
    text: `You asked about "${childText.trim()}". I can explore that with you. Try asking it as a why or how question, like "why are wheels round?" and I'll explain step by step.`,
  };
}
