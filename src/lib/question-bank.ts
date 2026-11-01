/**
 * Question bank, phase 1 (DRAFT for review).
 *
 * Built from docs/CURRICULUM_RESEARCH.md: the shared core of the UK, US, Indian (CBSE),
 * IB PYP and UAE MoE curricula (TIMSS grade-4 domains), written for children in Dubai:
 * metric units, AED, local + global contexts, names from many nationalities.
 * Wrong choices are real misconceptions so the "explainWrong" text can teach.
 *
 * Grade ids follow the app's UK "Year" scale (y1-2, y3 ... y7+).
 * Every item is checked by tests/unit/curriculum.test.ts (one correct choice, valid grades, unique ids).
 */

import type { RadarItem } from "./types";

type Draft = Omit<RadarItem, "choices"> & { choices: [string, string, string]; correct: 0 | 1 | 2 };

/** Compact authoring format → RadarItem (choice ids a/b/c). */
function q(d: Draft): RadarItem {
  const ids = ["a", "b", "c"] as const;
  return {
    id: d.id,
    skillId: d.skillId,
    grades: d.grades,
    prompt: d.prompt,
    choices: d.choices.map((label, i) => ({ id: ids[i], label, correct: i === d.correct })),
    explainCorrect: d.explainCorrect,
    explainWrong: d.explainWrong,
  };
}

export const QUESTION_BANK: RadarItem[] = [
  /* ---------------- Measuring length ---------------- */
  q({
    id: "q-measure-1", skillId: "measure-length", grades: ["y1-2", "y3"],
    prompt: "Which unit is best for measuring how long your pencil is?",
    choices: ["Centimetres (cm)", "Kilometres (km)", "Kilograms (kg)"], correct: 0,
    explainCorrect: "A pencil is short, so we measure it in centimetres.",
    explainWrong: "Kilometres are for long trips, and kilograms measure weight. A pencil is measured in centimetres.",
  }),
  q({
    id: "q-measure-2", skillId: "measure-length", grades: ["y3", "y4"],
    prompt: "A crayon starts at 0 and ends at 8 on a ruler. How long is it?",
    choices: ["7 cm", "8 cm", "9 cm"], correct: 1,
    explainCorrect: "From 0 to 8 is 8 centimetres.",
    explainWrong: "Count the spaces from 0, not the lines. From 0 to 8 is 8 cm.",
  }),
  q({
    id: "q-measure-3", skillId: "measure-length", grades: ["y3", "y4"],
    prompt: "How many centimetres are in 1 metre?",
    choices: ["10", "100", "1,000"], correct: 1,
    explainCorrect: "1 metre is 100 centimetres.",
    explainWrong: "1,000 is how many metres are in a kilometre. 1 metre = 100 cm.",
  }),
  q({
    id: "q-measure-4", skillId: "measure-length", grades: ["y4", "y5"],
    prompt: "Maya's ribbon is 1 m 20 cm long. How many centimetres is that?",
    choices: ["102 cm", "120 cm", "1,020 cm"], correct: 1,
    explainCorrect: "1 m is 100 cm, plus 20 cm makes 120 cm.",
    explainWrong: "1 metre is 100 cm, so 1 m 20 cm is 100 + 20 = 120 cm.",
  }),
  q({
    id: "q-measure-5", skillId: "measure-length", grades: ["y4", "y5"],
    prompt: "Omar walks 2 km to the park. Leo walks 1,500 m. Who walks further?",
    choices: ["Omar", "Leo", "They walk the same"], correct: 0,
    explainCorrect: "2 km is 2,000 m, which is more than 1,500 m.",
    explainWrong: "Change both to metres first: 2 km = 2,000 m, and that is more than 1,500 m.",
  }),

  /* ---------------- Halves and quarters ---------------- */
  q({
    id: "q-halves-1", skillId: "halves-quarters", grades: ["y1-2", "y3"],
    prompt: "Aisha cuts a sandwich into 2 equal pieces. Each piece is…",
    choices: ["One half", "One quarter", "One third"], correct: 0,
    explainCorrect: "2 equal parts means each part is one half.",
    explainWrong: "A quarter is 1 of 4 equal parts. 2 equal parts are halves.",
  }),
  q({
    id: "q-halves-2", skillId: "halves-quarters", grades: ["y1-2", "y3"],
    prompt: "What is half of 12 dates?",
    choices: ["6", "4", "24"], correct: 0,
    explainCorrect: "Share 12 into 2 equal groups: 6 and 6.",
    explainWrong: "Half means 2 equal groups. 12 shared by 2 is 6. 24 is double, not half.",
  }),
  q({
    id: "q-halves-3", skillId: "halves-quarters", grades: ["y3", "y4"],
    prompt: "What is one quarter of 20?",
    choices: ["4", "5", "10"], correct: 1,
    explainCorrect: "Share 20 into 4 equal groups: each has 5.",
    explainWrong: "A quarter means 4 equal groups. 20 ÷ 4 = 5. 10 would be a half.",
  }),
  q({
    id: "q-halves-4", skillId: "halves-quarters", grades: ["y3", "y4"],
    prompt: "A cake is cut into 4 equal slices. Priya eats 1 slice. What did she eat?",
    choices: ["One half of the cake", "One quarter of the cake", "Four cakes"], correct: 1,
    explainCorrect: "1 out of 4 equal slices is one quarter.",
    explainWrong: "One half would be 2 of the 4 slices. 1 slice out of 4 is one quarter.",
  }),
  q({
    id: "q-halves-5", skillId: "halves-quarters", grades: ["y3", "y4"],
    prompt: "Two quarters are the same as…",
    choices: ["One whole", "One half", "One third"], correct: 1,
    explainCorrect: "2 quarters fill half of the shape, so 2/4 = 1/2.",
    explainWrong: "A whole needs 4 quarters. 2 quarters make one half.",
  }),

  /* ---------------- Adding within 100 ---------------- */
  q({
    id: "q-add-1", skillId: "add-within-100", grades: ["y1-2", "y3"],
    prompt: "What is 23 + 45?",
    choices: ["58", "68", "78"], correct: 1,
    explainCorrect: "Tens: 20 + 40 = 60. Ones: 3 + 5 = 8. Together 68.",
    explainWrong: "Add the tens (20 + 40 = 60), then the ones (3 + 5 = 8): 68.",
  }),
  q({
    id: "q-add-2", skillId: "add-within-100", grades: ["y1-2", "y3"],
    prompt: "Leo has 37 stickers and gets 8 more. How many does he have now?",
    choices: ["44", "45", "54"], correct: 1,
    explainCorrect: "37 + 3 = 40, then 5 more is 45.",
    explainWrong: "Make a ten first: 37 + 3 = 40, then add the other 5 to get 45.",
  }),
  q({
    id: "q-add-3", skillId: "add-within-100", grades: ["y1-2", "y3"],
    prompt: "What is 60 + 30?",
    choices: ["90", "80", "900"], correct: 0,
    explainCorrect: "6 tens and 3 tens make 9 tens, which is 90.",
    explainWrong: "Count in tens: 6 tens + 3 tens = 9 tens = 90.",
  }),
  q({
    id: "q-add-4", skillId: "add-within-100", grades: ["y3"],
    prompt: "What is 46 + 27?",
    choices: ["63", "73", "613"], correct: 1,
    explainCorrect: "6 + 7 = 13, so carry 1 ten: 40 + 20 + 10 = 70, plus 3 is 73.",
    explainWrong: "6 + 7 = 13 is 1 ten and 3 ones. Remember to carry the ten: 73.",
  }),
  q({
    id: "q-add-5", skillId: "add-within-100", grades: ["y1-2", "y3"],
    prompt: "Which pair of numbers adds up to 100?",
    choices: ["40 and 50", "45 and 55", "35 and 75"], correct: 1,
    explainCorrect: "45 + 55 = 100.",
    explainWrong: "40 + 50 is 90 and 35 + 75 is 110. 45 + 55 makes exactly 100.",
  }),

  /* ---------------- Shapes and turns ---------------- */
  q({
    id: "q-shapes-1", skillId: "shapes-angles", grades: ["y3", "y4"],
    prompt: "How many sides does a hexagon have?",
    choices: ["5", "6", "8"], correct: 1,
    explainCorrect: "A hexagon has 6 sides, like a honeycomb cell.",
    explainWrong: "5 sides is a pentagon and 8 is an octagon. A hexagon has 6.",
  }),
  q({
    id: "q-shapes-2", skillId: "shapes-angles", grades: ["y3", "y4"],
    prompt: "A right angle is a quarter turn. How many right angles make a full turn?",
    choices: ["2", "3", "4"], correct: 2,
    explainCorrect: "4 quarter turns make a whole turn.",
    explainWrong: "2 quarter turns is only a half turn. A full turn is 4 right angles.",
  }),
  q({
    id: "q-shapes-3", skillId: "shapes-angles", grades: ["y3", "y4"],
    prompt: "Which shape has 4 equal sides and 4 right angles?",
    choices: ["A square", "A rectangle", "A triangle"], correct: 0,
    explainCorrect: "A square has 4 equal sides and 4 right angles.",
    explainWrong: "A rectangle has right angles, but its sides are not all equal. A square has both.",
  }),
  q({
    id: "q-shapes-4", skillId: "shapes-angles", grades: ["y4", "y5"],
    prompt: "Which kind of angle is bigger than a right angle?",
    choices: ["An acute angle", "An obtuse angle", "A right angle"], correct: 1,
    explainCorrect: "An obtuse angle is more than 90° but less than 180°.",
    explainWrong: "An acute angle is smaller than a right angle. Obtuse angles are the bigger ones.",
  }),
  q({
    id: "q-shapes-5", skillId: "shapes-angles", grades: ["y5", "y6"],
    prompt: "The angles on a straight line add up to…",
    choices: ["90°", "180°", "360°"], correct: 1,
    explainCorrect: "A straight line is a half turn, which is 180°.",
    explainWrong: "90° is a quarter turn and 360° a full turn. A straight line is a half turn: 180°.",
  }),

  /* ---------------- Times tables ---------------- */
  q({
    id: "q-mult-1", skillId: "multiply-basics", grades: ["y4"],
    prompt: "What is 7 × 8?",
    choices: ["54", "56", "64"], correct: 1,
    explainCorrect: "7 × 8 = 56. A trick: 5, 6, 7, 8 → 56 = 7 × 8.",
    explainWrong: "64 is 8 × 8 and 54 is 6 × 9. 7 × 8 is 56.",
  }),
  q({
    id: "q-mult-2", skillId: "multiply-basics", grades: ["y4"],
    prompt: "There are 6 boxes with 4 dates in each box. How many dates are there?",
    choices: ["10", "20", "24"], correct: 2,
    explainCorrect: "6 groups of 4 is 6 × 4 = 24.",
    explainWrong: "10 comes from adding 6 + 4. Equal groups mean multiply: 6 × 4 = 24.",
  }),
  q({
    id: "q-mult-3", skillId: "multiply-basics", grades: ["y4", "y5"],
    prompt: "What is 9 × 6?",
    choices: ["45", "54", "56"], correct: 1,
    explainCorrect: "9 × 6 = 54. Check: the digits 5 + 4 make 9.",
    explainWrong: "45 is 9 × 5. One more group of 9 gives 54.",
  }),
  q({
    id: "q-mult-4", skillId: "multiply-basics", grades: ["y4"],
    prompt: "Which is the same as 3 × 5?",
    choices: ["5 × 3", "3 + 5", "35"], correct: 0,
    explainCorrect: "You can swap the numbers when you multiply: 3 × 5 = 5 × 3 = 15.",
    explainWrong: "3 + 5 is 8, not 15. Multiplying in any order gives the same answer: 5 × 3.",
  }),
  q({
    id: "q-mult-5", skillId: "multiply-basics", grades: ["y4", "y5"],
    prompt: "24 dates are shared equally between 4 friends. How many does each friend get?",
    choices: ["4", "6", "20"], correct: 1,
    explainCorrect: "24 ÷ 4 = 6, because 4 × 6 = 24.",
    explainWrong: "Sharing equally is dividing. Think: 4 × ? = 24. The answer is 6.",
  }),

  /* ---------------- Comparing fractions ---------------- */
  q({
    id: "q-frac-cmp-1", skillId: "fractions-compare", grades: ["y5"],
    prompt: "Which is bigger: 1/2 or 1/4?",
    choices: ["1/2", "1/4", "They are equal"], correct: 0,
    explainCorrect: "Cutting into fewer pieces makes bigger pieces, so 1/2 is bigger.",
    explainWrong: "A bigger bottom number means more, smaller pieces. 1/4 is smaller than 1/2.",
  }),
  q({
    id: "q-frac-cmp-2", skillId: "fractions-compare", grades: ["y5", "y6"],
    prompt: "Which fraction is equal to 1/2?",
    choices: ["2/3", "2/4", "1/4"], correct: 1,
    explainCorrect: "2/4 is 2 out of 4 equal parts, which is half.",
    explainWrong: "Double the top and the bottom of 1/2 and you get 2/4. That is an equal fraction.",
  }),
  q({
    id: "q-frac-cmp-3", skillId: "fractions-compare", grades: ["y5", "y6"],
    prompt: "Which is the smallest: 1/3, 1/5 or 1/8?",
    choices: ["1/3", "1/5", "1/8"], correct: 2,
    explainCorrect: "With the same top number, more pieces means smaller pieces: 1/8 is smallest.",
    explainWrong: "8 is the biggest number, but 1/8 is the smallest piece because the whole is cut into more parts.",
  }),
  q({
    id: "q-frac-cmp-4", skillId: "fractions-compare", grades: ["y5"],
    prompt: "Compare 3/4 and 2/4.",
    choices: ["3/4 is bigger", "2/4 is bigger", "They are equal"], correct: 0,
    explainCorrect: "Same size pieces (quarters), and 3 pieces is more than 2.",
    explainWrong: "When the bottom numbers match, compare the top numbers: 3 quarters is more than 2.",
  }),
  q({
    id: "q-frac-cmp-5", skillId: "fractions-compare", grades: ["y6", "y7+"],
    prompt: "Which is bigger: 2/3 or 3/5?",
    choices: ["2/3", "3/5", "They are equal"], correct: 0,
    explainCorrect: "Change both to fifteenths: 2/3 = 10/15 and 3/5 = 9/15. 2/3 is bigger.",
    explainWrong: "Use a common denominator: 2/3 = 10/15 and 3/5 = 9/15, so 2/3 is bigger.",
  }),

  /* ---------------- Percentages ---------------- */
  q({
    id: "q-pct-1", skillId: "percentages", grades: ["y6"],
    prompt: "What is 50% of 40?",
    choices: ["10", "20", "50"], correct: 1,
    explainCorrect: "50% means half. Half of 40 is 20.",
    explainWrong: "50% is one half, so 50% of 40 is 40 ÷ 2 = 20.",
  }),
  q({
    id: "q-pct-2", skillId: "percentages", grades: ["y6"],
    prompt: "25% is the same as which fraction?",
    choices: ["1/4", "1/25", "2/5"], correct: 0,
    explainCorrect: "25 out of 100 is one quarter.",
    explainWrong: "Per cent means out of 100. 25/100 simplifies to 1/4.",
  }),
  q({
    id: "q-pct-3", skillId: "percentages", grades: ["y6", "y7+"],
    prompt: "A toy costs 80 AED. The shop takes 10% off. How much money is taken off?",
    choices: ["8 AED", "10 AED", "72 AED"], correct: 0,
    explainCorrect: "10% is one tenth. 80 ÷ 10 = 8 AED off.",
    explainWrong: "10% means one tenth of 80, which is 8 AED. 72 AED is the new price, not the discount.",
  }),
  q({
    id: "q-pct-4", skillId: "percentages", grades: ["y6"],
    prompt: "If you eat 100% of a pizza, how much did you eat?",
    choices: ["Half of it", "All of it", "None of it"], correct: 1,
    explainCorrect: "100% means the whole thing.",
    explainWrong: "50% would be half. 100% means all of it.",
  }),
  q({
    id: "q-pct-5", skillId: "percentages", grades: ["y7+"],
    prompt: "In a class of 20 children, 5 wear glasses. What percentage is that?",
    choices: ["5%", "20%", "25%"], correct: 2,
    explainCorrect: "5 out of 20 is 1/4, which is 25%.",
    explainWrong: "Turn it into a fraction first: 5/20 = 1/4 = 25 out of 100 = 25%.",
  }),

  /* ---------------- Simple algebra ---------------- */
  q({
    id: "q-alg-1", skillId: "algebra-intro", grades: ["y7+"],
    prompt: "If n + 7 = 15, what is n?",
    choices: ["7", "8", "22"], correct: 1,
    explainCorrect: "Take 7 away from both sides: n = 15 − 7 = 8.",
    explainWrong: "22 comes from adding. To find n, undo the + 7: 15 − 7 = 8.",
  }),
  q({
    id: "q-alg-2", skillId: "algebra-intro", grades: ["y7+"],
    prompt: "What is 3n when n = 4?",
    choices: ["7", "12", "34"], correct: 1,
    explainCorrect: "3n means 3 × n, so 3 × 4 = 12.",
    explainWrong: "3n does not mean writing 3 next to 4. It means 3 × n = 12.",
  }),
  q({
    id: "q-alg-3", skillId: "algebra-intro", grades: ["y7+"],
    prompt: "Which expression means \"double a number, then add 5\"?",
    choices: ["2n + 5", "2(n + 5)", "n + 25"], correct: 0,
    explainCorrect: "Double n is 2n, then add 5: 2n + 5.",
    explainWrong: "2(n + 5) adds 5 first and then doubles. Double first: 2n + 5.",
  }),
  q({
    id: "q-alg-4", skillId: "algebra-intro", grades: ["y7+"],
    prompt: "What comes next: 3, 7, 11, 15, …?",
    choices: ["18", "19", "20"], correct: 1,
    explainCorrect: "The pattern adds 4 each time: 15 + 4 = 19.",
    explainWrong: "Look at the gaps: each step adds 4, so the next number is 19.",
  }),
  q({
    id: "q-alg-5", skillId: "algebra-intro", grades: ["y7+"],
    prompt: "If 2x = 18, what is x?",
    choices: ["9", "16", "36"], correct: 0,
    explainCorrect: "Divide both sides by 2: x = 9.",
    explainWrong: "2x means 2 × x. Undo it by dividing: 18 ÷ 2 = 9.",
  }),

  /* ---------------- Living things ---------------- */
  q({
    id: "q-living-1", skillId: "living-things", grades: ["y1-2", "y3"],
    prompt: "Which of these do plants need to grow well?",
    choices: ["Water and light", "Only darkness", "Nothing at all"], correct: 0,
    explainCorrect: "Plants need water, light and air to grow.",
    explainWrong: "Plants use light to make their food, and they need water too.",
  }),
  q({
    id: "q-living-2", skillId: "living-things", grades: ["y1-2", "y3"],
    prompt: "Which one is NOT a living thing?",
    choices: ["A camel", "A palm tree", "A stone"], correct: 2,
    explainCorrect: "A stone does not grow, eat or have babies.",
    explainWrong: "Camels and palm trees grow and need water. A stone does not, so it is not living.",
  }),
  q({
    id: "q-living-3", skillId: "living-things", grades: ["y3", "y4"],
    prompt: "Which part of a plant takes in water from the soil?",
    choices: ["The roots", "The flowers", "The leaves"], correct: 0,
    explainCorrect: "Roots soak up water from the soil, and the stem carries it up.",
    explainWrong: "Leaves make food and flowers make seeds. Water comes in through the roots.",
  }),
  q({
    id: "q-living-4", skillId: "living-things", grades: ["y3", "y4"],
    prompt: "What does a seed need to start growing?",
    choices: ["Water, warmth and air", "Only bright light", "Salty water"], correct: 0,
    explainCorrect: "A seed needs water, warmth and air to start growing.",
    explainWrong: "Many seeds start growing in the dark soil. They need water, warmth and air.",
  }),
  q({
    id: "q-living-5", skillId: "living-things", grades: ["y3", "y4"],
    prompt: "Which animal is a mammal?",
    choices: ["A falcon", "A camel", "A lizard"], correct: 1,
    explainCorrect: "Camels have fur and feed their babies milk, so they are mammals.",
    explainWrong: "Falcons are birds and lizards are reptiles. Camels feed their babies milk: mammals.",
  }),

  /* ---------------- Materials and matter ---------------- */
  q({
    id: "q-materials-1", skillId: "materials", grades: ["y3", "y4"],
    prompt: "Which material is best for a window?",
    choices: ["Glass", "Wood", "Metal"], correct: 0,
    explainCorrect: "Glass is transparent, so light can pass through.",
    explainWrong: "Wood and metal block light. A window needs a see-through material like glass.",
  }),
  q({
    id: "q-materials-2", skillId: "materials", grades: ["y3", "y4"],
    prompt: "Which of these will a magnet pull?",
    choices: ["An iron nail", "A plastic spoon", "A wooden ruler"], correct: 0,
    explainCorrect: "Magnets attract iron, so the iron nail is pulled.",
    explainWrong: "Magnets do not pull plastic or wood. They attract some metals, like iron.",
  }),
  q({
    id: "q-materials-3", skillId: "materials", grades: ["y4", "y5"],
    prompt: "Ice melting into water is a change from…",
    choices: ["Solid to liquid", "Liquid to gas", "Gas to solid"], correct: 0,
    explainCorrect: "Ice is a solid and water is a liquid, so melting is solid to liquid.",
    explainWrong: "Liquid to gas is evaporating. Melting ice goes from solid to liquid.",
  }),
  q({
    id: "q-materials-4", skillId: "materials", grades: ["y4", "y5"],
    prompt: "At about what temperature does water boil?",
    choices: ["10 °C", "50 °C", "100 °C"], correct: 2,
    explainCorrect: "Water boils at about 100 °C at sea level.",
    explainWrong: "A hot Dubai day can reach 50 °C, but water boils at about 100 °C.",
  }),
  q({
    id: "q-materials-5", skillId: "materials", grades: ["y5", "y6"],
    prompt: "When sugar dissolves in water, what happens to the sugar?",
    choices: ["It disappears forever", "It is still there, in tiny bits", "It turns into salt"], correct: 1,
    explainCorrect: "The sugar breaks into tiny bits you cannot see. The water tastes sweet.",
    explainWrong: "Dissolved sugar has not vanished. Taste the water: it is sweet, so the sugar is still there.",
  }),

  /* ---------------- Day and night ---------------- */
  q({
    id: "q-day-1", skillId: "day-night", grades: ["y3", "y4"],
    prompt: "Why do we have day and night?",
    choices: ["The Earth spins", "The Sun goes out at night", "The Moon covers the Sun"], correct: 0,
    explainCorrect: "The Earth spins. Our side faces the Sun in the day and faces away at night.",
    explainWrong: "The Sun keeps shining all the time. Night comes when our side of the Earth turns away.",
  }),
  q({
    id: "q-day-2", skillId: "day-night", grades: ["y3", "y4"],
    prompt: "How long does the Earth take to spin around once?",
    choices: ["About 24 hours", "About one week", "About one year"], correct: 0,
    explainCorrect: "One full spin takes about 24 hours: one day and one night.",
    explainWrong: "One year is how long the Earth takes to go around the Sun. One spin is about 24 hours.",
  }),
  q({
    id: "q-day-3", skillId: "day-night", grades: ["y3", "y4"],
    prompt: "In Dubai, where does the Sun rise in the morning?",
    choices: ["In the east", "In the west", "In the north"], correct: 0,
    explainCorrect: "The Sun rises in the east and sets in the west, because of the way the Earth spins.",
    explainWrong: "The Sun sets in the west. In the morning it rises in the east.",
  }),
  q({
    id: "q-day-4", skillId: "day-night", grades: ["y3", "y4"],
    prompt: "Why are shadows long early in the morning?",
    choices: ["The Sun is low in the sky", "The Sun is closer to us", "Things grow at night"], correct: 0,
    explainCorrect: "When the Sun is low, light comes from the side and shadows stretch out.",
    explainWrong: "The Sun is not closer in the morning. It is low in the sky, so shadows are long.",
  }),
  q({
    id: "q-day-5", skillId: "day-night", grades: ["y4", "y5"],
    prompt: "When it is daytime in Dubai, where is it night time?",
    choices: ["Places on the other side of the Earth", "Every other country", "Nowhere"], correct: 0,
    explainCorrect: "The side of the Earth facing away from the Sun has night.",
    explainWrong: "Half of the Earth faces the Sun at any time. The far side is in night time.",
  }),

  /* ---------------- Habitats ---------------- */
  q({
    id: "q-habitats-1", skillId: "habitats", grades: ["y4"],
    prompt: "Which animal is best suited to living in a desert?",
    choices: ["A camel", "A polar bear", "A penguin"], correct: 0,
    explainCorrect: "Camels can go a long time without water and have wide feet for sand.",
    explainWrong: "Polar bears and penguins are built for the cold. Camels are made for desert life.",
  }),
  q({
    id: "q-habitats-2", skillId: "habitats", grades: ["y4", "y5"],
    prompt: "Mangroves on the UAE coast grow in…",
    choices: ["Salty seawater", "Snow", "Dry sand dunes"], correct: 0,
    explainCorrect: "Mangrove trees are special: they can live in salty water along the coast.",
    explainWrong: "Mangroves grow along the coast in salty water, not in dunes or snow.",
  }),
  q({
    id: "q-habitats-3", skillId: "habitats", grades: ["y4", "y5"],
    prompt: "In a food chain, which one is a producer that makes its own food?",
    choices: ["Grass", "A gazelle", "A falcon"], correct: 0,
    explainCorrect: "Plants like grass make their own food using sunlight.",
    explainWrong: "Animals eat other living things for food. Plants are the producers.",
  }),
  q({
    id: "q-habitats-4", skillId: "habitats", grades: ["y4", "y5"],
    prompt: "Why do many desert animals come out at night?",
    choices: ["It is cooler", "The Moon gives them food", "They cannot see in the day"], correct: 0,
    explainCorrect: "Desert days are very hot, so many animals are active in the cool night.",
    explainWrong: "The main reason is the heat. Night is cooler, so they save water and energy.",
  }),
  q({
    id: "q-habitats-5", skillId: "habitats", grades: ["y5", "y6"],
    prompt: "What could happen if all the small fish in a sea area disappeared?",
    choices: ["Animals that eat them would have less food", "Nothing would change", "The sea would turn fresh"], correct: 0,
    explainCorrect: "Living things depend on each other. Losing one food source affects the whole food chain.",
    explainWrong: "In a habitat everything is linked. Animals that eat the fish would go hungry.",
  }),

  /* ---------------- Forces and motion ---------------- */
  q({
    id: "q-forces-1", skillId: "forces-motion", grades: ["y5"],
    prompt: "Which force pulls things down towards the Earth?",
    choices: ["Gravity", "Friction", "Magnetism"], correct: 0,
    explainCorrect: "Gravity pulls everything towards the Earth. That is why things fall.",
    explainWrong: "Friction slows things down when they rub. The pull towards Earth is gravity.",
  }),
  q({
    id: "q-forces-2", skillId: "forces-motion", grades: ["y5", "y6"],
    prompt: "Why is a box harder to slide on carpet than on a smooth floor?",
    choices: ["There is more friction", "There is less gravity", "The box gets lighter"], correct: 0,
    explainCorrect: "Rough carpet rubs more against the box, so there is more friction.",
    explainWrong: "Gravity is the same on both floors. Carpet is rougher, so friction is bigger.",
  }),
  q({
    id: "q-forces-3", skillId: "forces-motion", grades: ["y5", "y6"],
    prompt: "A parachute falls slowly because of…",
    choices: ["Air resistance", "Magnetism", "Having no weight"], correct: 0,
    explainCorrect: "The big parachute pushes against lots of air, which slows it down.",
    explainWrong: "The parachute still has weight. Air resistance pushes up on it and slows the fall.",
  }),
  q({
    id: "q-forces-4", skillId: "forces-motion", grades: ["y5", "y6"],
    prompt: "Where is it easiest to push a heavy door open?",
    choices: ["Far from the hinges", "Right next to the hinges", "It is the same everywhere"], correct: 0,
    explainCorrect: "Pushing far from the hinges gives you more turning effect, like a lever.",
    explainWrong: "Try it: pushing near the hinges is hard. Far from the hinges your push turns the door more easily.",
  }),
  q({
    id: "q-forces-5", skillId: "forces-motion", grades: ["y6", "y7+"],
    prompt: "A ball rolling on grass slows down and stops. Why?",
    choices: ["Friction slows it down", "Gravity pushes it backwards", "Balls get tired"], correct: 0,
    explainCorrect: "Friction between the ball and the grass works against the motion.",
    explainWrong: "Gravity pulls down, not backwards. Friction with the grass slows the ball.",
  }),

  /* ---------------- Solar system ---------------- */
  q({
    id: "q-solar-1", skillId: "solar-system", grades: ["y5"],
    prompt: "Which one of these is a star?",
    choices: ["The Sun", "The Moon", "Mars"], correct: 0,
    explainCorrect: "The Sun is a star: a huge ball of hot gas that makes its own light.",
    explainWrong: "The Moon and Mars do not make their own light. The Sun is our closest star.",
  }),
  q({
    id: "q-solar-2", skillId: "solar-system", grades: ["y5", "y6"],
    prompt: "How long does the Earth take to go around the Sun once?",
    choices: ["About one day", "About one month", "About one year"], correct: 2,
    explainCorrect: "One trip around the Sun takes about 365 days: one year.",
    explainWrong: "One day is one spin of the Earth. Going around the Sun takes a whole year.",
  }),
  q({
    id: "q-solar-3", skillId: "solar-system", grades: ["y5", "y6"],
    prompt: "Which planet is closest to the Sun?",
    choices: ["Mercury", "Venus", "Mars"], correct: 0,
    explainCorrect: "Mercury is the closest planet to the Sun.",
    explainWrong: "Venus is second and Mars is fourth. Mercury is closest.",
  }),
  q({
    id: "q-solar-4", skillId: "solar-system", grades: ["y5", "y6"],
    prompt: "Why does the Moon shine at night?",
    choices: ["It reflects light from the Sun", "It makes its own light", "It is on fire"], correct: 0,
    explainCorrect: "The Moon has no light of its own. It reflects sunlight, like a mirror.",
    explainWrong: "The Moon is a rocky ball, not a fire. We see it because sunlight bounces off it.",
  }),
  q({
    id: "q-solar-5", skillId: "solar-system", grades: ["y6", "y7+"],
    prompt: "The UAE's Hope Probe was sent to study which planet?",
    choices: ["Mars", "Venus", "Jupiter"], correct: 0,
    explainCorrect: "The Emirates Mars Mission's Hope Probe studies the weather and air of Mars.",
    explainWrong: "Hope went to Mars, the red planet, to study its atmosphere.",
  }),

  /* ---------------- Cells and microbes ---------------- */
  q({
    id: "q-cells-1", skillId: "cells-micro", grades: ["y7+"],
    prompt: "What are all living things made of?",
    choices: ["Cells", "Plastic", "Sand"], correct: 0,
    explainCorrect: "Every living thing is made of one or more cells.",
    explainWrong: "Cells are the building blocks of life. Every plant and animal is made of them.",
  }),
  q({
    id: "q-cells-2", skillId: "cells-micro", grades: ["y7+"],
    prompt: "Which part is found in plant cells but NOT in animal cells?",
    choices: ["Cell wall", "Nucleus", "Cell membrane"], correct: 0,
    explainCorrect: "Plant cells have a stiff cell wall. Animal cells do not.",
    explainWrong: "Both plant and animal cells have a nucleus and a membrane. Only plants have a cell wall.",
  }),
  q({
    id: "q-cells-3", skillId: "cells-micro", grades: ["y7+"],
    prompt: "Which tool do scientists use to see cells?",
    choices: ["A microscope", "A telescope", "A thermometer"], correct: 0,
    explainCorrect: "A microscope makes tiny things like cells look big.",
    explainWrong: "A telescope is for faraway things like stars. A microscope is for tiny things.",
  }),
  q({
    id: "q-cells-4", skillId: "cells-micro", grades: ["y7+"],
    prompt: "Why do we wash our hands with soap?",
    choices: ["To remove harmful microbes", "To make our hands grow", "To add more cells"], correct: 0,
    explainCorrect: "Soap helps wash away germs (harmful microbes) so we stay healthy.",
    explainWrong: "Hand washing is about germs. Soap lifts microbes off the skin.",
  }),
  q({
    id: "q-cells-5", skillId: "cells-micro", grades: ["y7+"],
    prompt: "Which tiny living thing helps bread dough rise?",
    choices: ["Yeast", "Salt", "Sand"], correct: 0,
    explainCorrect: "Yeast is a microbe. It makes gas bubbles that make dough rise.",
    explainWrong: "Salt and sand are not alive. Yeast is a living microbe that makes bread rise.",
  }),
];
