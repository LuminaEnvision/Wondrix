import type { SkillId, SkillNode } from "./types";

export const SKILL_GRAPH: SkillNode[] = [
  {
    id: "measure-length",
    title: "Measuring length",
    subject: "math",
    prerequisites: [],
    fromGrade: "y1-2",
  },
  {
    id: "halves-quarters",
    title: "Halves and quarters",
    subject: "math",
    prerequisites: [],
    fromGrade: "y1-2",
  },
  {
    id: "add-within-100",
    title: "Adding within 100",
    subject: "math",
    prerequisites: [],
    fromGrade: "y1-2",
  },
  {
    id: "shapes-angles",
    title: "Shapes and turns",
    subject: "math",
    prerequisites: ["measure-length"],
    fromGrade: "y3",
  },
  {
    id: "multiply-basics",
    title: "Times tables basics",
    subject: "math",
    prerequisites: ["add-within-100"],
    fromGrade: "y4",
  },
  {
    id: "fractions-compare",
    title: "Comparing fractions",
    subject: "math",
    prerequisites: ["halves-quarters"],
    fromGrade: "y5",
  },
  {
    id: "percentages",
    title: "Percentages",
    subject: "math",
    prerequisites: ["fractions-compare"],
    fromGrade: "y6",
  },
  {
    id: "algebra-intro",
    title: "Simple algebra",
    subject: "math",
    prerequisites: ["multiply-basics"],
    fromGrade: "y7+",
  },
  {
    id: "living-things",
    title: "Living things",
    subject: "science",
    prerequisites: [],
    fromGrade: "y1-2",
  },
  {
    id: "materials",
    title: "Materials and matter",
    subject: "science",
    prerequisites: [],
    fromGrade: "y3",
  },
  {
    id: "day-night",
    title: "Day and night",
    subject: "science",
    prerequisites: [],
    fromGrade: "y3",
  },
  {
    id: "habitats",
    title: "Habitats",
    subject: "science",
    prerequisites: ["living-things"],
    fromGrade: "y4",
  },
  {
    id: "forces-motion",
    title: "Forces and motion",
    subject: "science",
    prerequisites: [],
    fromGrade: "y5",
  },
  {
    id: "solar-system",
    title: "Solar system",
    subject: "science",
    prerequisites: ["day-night"],
    fromGrade: "y5",
  },
  {
    id: "cells-micro",
    title: "Cells and microbes",
    subject: "science",
    prerequisites: ["living-things"],
    fromGrade: "y7+",
  },
];

export function getSkill(id: SkillId): SkillNode {
  const skill = SKILL_GRAPH.find((s) => s.id === id);
  if (!skill) throw new Error(`Unknown skill: ${id}`);
  return skill;
}

export function skillsFromParentNote(note: string): SkillId[] {
  const n = note.toLowerCase();
  const hits: SkillId[] = [];
  if (/fraction|half|quarter|pizza/.test(n)) hits.push("halves-quarters", "fractions-compare");
  if (/percent|%/.test(n)) hits.push("percentages");
  if (/measur|ruler|length|cm|meter/.test(n)) hits.push("measure-length");
  if (/add|plus|sum|number/.test(n)) hits.push("add-within-100");
  if (/times|multipl|product/.test(n)) hits.push("multiply-basics");
  if (/algebra|equation|variable|x\s*=/.test(n)) hits.push("algebra-intro");
  if (/shape|angle|turn|robot|path/.test(n)) hits.push("shapes-angles");
  if (/living|animal|plant/.test(n)) hits.push("living-things");
  if (/material|solid|liquid|matter/.test(n)) hits.push("materials");
  if (/force|motion|push|pull|gravity/.test(n)) hits.push("forces-motion");
  if (/moon|sun|night|day|sky|earth|spin|planet|solar/.test(n))
    hits.push("day-night", "solar-system");
  if (/habitat|home|forest|ocean/.test(n)) hits.push("habitats");
  if (/cell|microbe|bacteria|virus/.test(n)) hits.push("cells-micro");
  return hits;
}
