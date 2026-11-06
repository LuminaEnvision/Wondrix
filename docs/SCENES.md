# Extra scenes: ready-made animated cartoons

**Why:** a child who can barely read should still *see* the idea: the sun shines, water rises, clouds form, rain falls.
For the most common topics, Wondrix shows a hand-drawn animated scene instead of a diagram. Each scene has **4 numbered parts**. When **Show me** plays, the part being said lights up and moves while the others fade, and the numbers match the labels under the picture.

**How it is chosen:** the agent picks the scene when the answer is mainly about that topic, and writes the 4 labels in the child's words and language. If it gives the wrong number of labels, the default labels below are used (English or Arabic). Any topic without a scene still gets the picture-icon diagram. Offline answers use the same scenes.

**No diagram is better than a useless one.** Outside scenes, a diagram is only shown if every item has a real picture, there are at least two different pictures, and the words stay short (`isUsefulVisual` in `src/lib/visual.ts`). The agent is also told not to draw for definitions or abstract ideas ("What is a molecule?"). Live re-check: "What is a molecule?" now shows no diagram.

**Live check (Z.ai, Nov 2026):** "Why does it rain?" picked water-cycle, "Why is there day and night?" picked day-night, "Why does ice melt?" picked states-of-matter. "How do magnets work?" has no scene yet, so it got an icon diagram (correct).

Code: `src/lib/scenes.ts` (list, labels, prompt), `src/components/ExtraScene.tsx` (drawings), the `wxs-` CSS in `src/app/globals.css` (motion, which stops when the device asks for reduced motion).

---

## Full list (15)

| # | Scene | Status | Parts (default labels) |
|---|---|---|---|
| 1 | Water cycle | ✅ done | 1 The Sun warms the sea · 2 Water rises as vapour · 3 Vapour cools into clouds · 4 Rain falls back down |
| 2 | Day and night | ✅ done | 1 The Sun lights one side of Earth · 2 That side has day · 3 The other side has night · 4 Earth spins once a day |
| 3 | Moon phases | ✅ done | 1 New moon · 2 Half moon (growing) · 3 Full moon · 4 Half moon (shrinking) |
| 4 | How a plant makes food | ✅ done | 1 Roots drink water · 2 The stem carries it up · 3 Leaves catch sunlight · 4 Leaves make food and oxygen |
| 5 | Solid, liquid, gas | ✅ done | 1 Ice is a solid · 2 Heat melts it into liquid water · 3 More heat makes it a gas (steam) · 4 Cooling turns it back |
| 6 | Why the sky is blue (and sunsets orange) | ✅ done (Extra's opening question) | 1 Sunlight has all the colours · 2 Air scatters blue light the most · 3 So the sky looks blue · 4 At sunset, orange and red reach us |
| 7 | Magnets | ✅ done (live check had fallen back to icons) | 1 Magnets pull iron and steel · 2 Every magnet has two poles, N and S · 3 Same poles push apart · 4 Different poles pull together |
| 8 | Solar system | later | Sun in the middle, planets going round, Earth third, far planets colder |
| 9 | Electric circuit | second batch | battery pushes, wire path, bulb lights, a break turns it off |
| 10 | Food chain | second batch | the Sun feeds the plant, rabbit eats the plant, fox eats the rabbit, energy passes on |
| 11 | Life cycle (seed to flower, or egg to butterfly) | second batch | 4 stages |
| 12 | Forces: push, pull, friction | second batch | push, pull, friction slows, gravity pulls down |
| 13 | Sound | optional | something vibrates, air carries the vibration, it reaches the ear, louder = bigger vibration |
| 14 | Light and shadow | optional | light travels in straight lines, objects block it, shadow forms, moving the light changes the shadow |
| 15 | The heart | optional | the heart pumps, blood carries oxygen, back to the heart, faster when we run |

Plan (Anastasia, Nov 6): do **not** build all ten. Sky colours and magnets were added first because children already ask them. The rest waits for what the test families (Dubai and Saudi Arabia) really ask.

---

## Review checklist (Anastasia, or the tester)

Please check each finished scene on a phone (Extra, ask the question, tap **Show me**):

1. **Science is right and not misleading** for ages 7 to 11. Points to look at:
   - *Water cycle:* the sun warms the **sea**, vapour rises from the sea, clouds form, rain falls on the mountain and a river carries it back to the sea.
   - *Day and night:* the Sun is on the left. The lit (day) half faces it and the dark (night) half faces away. The continents scroll, so Earth looks like it spins. "24h" marks one turn.
   - *Moon phases:* the Sun is on the left. The left half of the Moon is always lit; what changes is how much of that lit half we see from Earth. The right column shows the shape we see, as in the UAE / northern half of the world (a growing half moon is lit on the right). The order shown is new → half (growing) → full → half (shrinking); the crescents in between are not drawn.
   - *Plant food:* roots take water, it rises up the stem, leaves catch sunlight, sugar sparkles and O₂ bubbles show food and oxygen. Air (carbon dioxide) is not drawn, to keep it simple. Should it be?
   - *Solid, liquid, gas:* ice → water → steam, with particles packed / loose / spread out under each, and a cooling arrow back.
   - *Sky colours:* left, daytime: white sunlight (drawn as all the colours together) hits the air, blue bounces off in every direction, so the child sees a blue sky. Right, sunset: the low Sun's light crosses much more air, the blue and green are scattered away on the way, and mostly orange and red reach the child. "Scatters" is the real word; is it OK for ages 7 to 9, or should it be "bounces"?
   - *Magnets:* the horseshoe magnet pulls a paper clip and a nail but not a wooden block; a bar magnet with N (red) and S (blue) and field lines; N facing N push apart; N facing S pull together. The letters N and S stay in Latin script in Arabic too, as in UAE science books. Please confirm.
2. **A child understands it without reading:** cover the labels; can they still say what happens?
3. **Tone and look:** colours, size on the phone, not too busy, motion calm (not distracting).
4. **Arabic:** the default Arabic labels in `src/lib/scenes.ts` (the `ar:` texts) are an AI draft, so please check them too. Moon labels now use child words as Anastasia suggested (قمر جديد، نصف يكبر، بدر، نصف يصغر); the school terms (المحاق، التربيع الأول، البدر، التربيع الأخير) are kept in a comment. A native speaker confirms both.

Send changes as "scene, part, what to change", and we update the drawing or the labels.

## Adding a scene (developers)

1. Add the id, `about` and 4 parts (`en` + `ar`) in `src/lib/scenes.ts`.
2. Draw it in `src/components/ExtraScene.tsx`: one `<g className={partClass(st(i))}>` per part with a `<Num>` marker. Use existing `wxs-` motion classes.
3. Optionally, map an offline answer to it in `src/lib/extra-reply.ts`.
4. Tests in `tests/unit/visual.test.ts` already check every scene has 4 parts with English and Arabic labels and is in the prompt.
