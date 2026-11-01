# Curriculum research: global + Dubai

Purpose: decide **what the School door should practise** so that the skill map and question bank make sense for children in Dubai, whatever curriculum their school follows. This is the input for the question-bank drafts.

Research date: November 2026. Sources are at the end. Where a point comes from general knowledge rather than a source found in this research, it is marked *(background)*. Check those points against the official documents before the final submission.

---

## 1. Who we serve in Dubai

KHDA (Dubai's private-school regulator), academic year 2024-25:

| Curriculum | Share of students |
|---|---|
| UK (British) | **37%** |
| Indian (CBSE / ICSE) | **26%** |
| US (American) | **14%** |
| IB | **7%** |
| UK/IB hybrid | 4% |
| Others (17 curricula in total, incl. UAE MoE, French, German…) | rest |

- 227 private schools, 387,441 students, **185 nationalities**, 33,210 Emirati students.
- Among **Emirati families the US curriculum is the most popular**, then UK, then IB.

**Takeaways for Wondrix**
- Keep the **UK "Year" labels** as the main grade scale (largest group, and the app already uses it), but **show the equivalent grade/class** for US, Indian, IB and UAE MoE families.
- Questions must work across curricula, so **aim at the shared core** (section 3), not at one textbook.

## 2. Grade and age equivalence *(background, check before publishing)*

| Age (start of year) | UK | US / IB PYP | Indian CBSE | UAE MoE |
|---|---|---|---|---|
| 5–6 | Year 1 | Kindergarten | UKG / Class 1* | KG2 |
| 6–7 | Year 2 | Grade 1 | Class 1 | Grade 1 (Cycle 1) |
| 7–8 | **Year 3** | Grade 2 | Class 2 | Grade 2 |
| 8–9 | **Year 4** | Grade 3 | Class 3 | Grade 3 |
| 9–10 | **Year 5** | Grade 4 | Class 4 | Grade 4 |
| 10–11 | **Year 6** | Grade 5 | Class 5 | Grade 5 (Cycle 2) |
| 11–12 | **Year 7** | Grade 6 | Class 6 | Grade 6 |

\* Indian school-entry age varies by school.

**Rule of thumb:** UK Year *N* ≈ US / IB / CBSE / UAE Grade *N−1*.
**Implemented:** Parent asks for the school curriculum and the grade picker shows names in that curriculum, with ages (`src/lib/curriculum.ts`).

## 3. The shared core: TIMSS Grade 4

TIMSS is the international maths and science study. **Dubai benchmarks its private schools against TIMSS and PISA** through KHDA's National Agenda Parameter, with targets set per school. So TIMSS is the most useful common ground: every curriculum above is measured against it in Dubai.

TIMSS 2023 Grade 4 content weights:

| Mathematics | Weight | Science | Weight |
|---|---|---|---|
| Number | **50%** | Life science | **45%** |
| Measurement & geometry | **30%** | Physical science | **35%** |
| Data | **20%** | Earth science | **20%** |

The UAE MoE maths curriculum uses the same TIMSS-style **cognitive levels: knowing, applying, reasoning**.

## 4. Notes per curriculum

- **England National Curriculum (UK schools)**
  - Maths is set out **year by year** for key stages 1–2, but schools only have to cover each programme by the end of the key stage.
  - Example Year 3 statutory fractions: add and subtract fractions with the same denominator within one whole; compare and order unit fractions.
  - Year 6 number goes up to 10,000,000.
  - Science KS2 runs year by year, and the content for Years 3–6 must be covered by the end of KS2. Year 4 strands: living things and habitats, animals including humans, states of matter, sound, electricity.
  - Other years *(background)*:
    - Y3: plants, animals (nutrition, skeleton), rocks, light, forces and magnets
    - Y5: life cycles, materials (dissolving), forces (gravity, friction, air resistance), Earth and space
    - Y6: classification, circulatory system, evolution, light, electricity
- **US (Common Core maths + NGSS science)**
  - Maths domains include **Number & Operations: Fractions** (grades 3–5) and **Measurement & Data** (for example, grade 5 unit conversions in metric and customary units).
  - NGSS grade 5 includes Space Systems (stars, solar system) and Earth's Systems (geosphere, biosphere, hydrosphere and atmosphere interacting; protecting Earth's resources).
- **Indian CBSE (NCERT)**
  - New textbooks under NEP 2020 / NCF 2023: **"Maths Mela"** for Classes 3–5 (Class 3 has 14 chapters).
  - Class 5 includes **Fractions** and **Angles as Turns**.
  - Class 4 includes **Thousands Around Us**, **Sharing and Measuring** and **Measuring Length**.
  - Style: real-life stories (travel, fairs, family), which suits the Wondrix tone.
- **IB PYP**
  - Maths has five strands: **data handling, measurement, shape and space, pattern and function, number**.
  - Science is defined by **concepts and skills more than fixed content**, and is taught through six transdisciplinary themes.
  - An inquiry style, "why" and "what if" questions, fits the Extra door well.
- **UAE MoE**
  - Cycles: KG, Cycle 1 (Grades 1–4), Cycle 2 (5–8), Cycle 3 (9–12).
  - In KG and Cycle 1, **maths and science are taught mainly in Arabic**; some streams teach them in English.
  - Grades 1–4 take an external MoE diagnostic assessment in English and maths.
  - **Implication:** Arabic UI and questions would open Wondrix to UAE MoE Cycle 1 children (a later feature).

## 5. Gap analysis: Wondrix skill map vs the shared core

Current skills (15): measure-length, halves-quarters, add-within-100, shapes-angles, multiply-basics, fractions-compare, percentages, algebra-intro (maths); living-things, materials, day-night, habitats, forces-motion, solar-system, cells-micro (science).

| Area (TIMSS weight) | Covered now | Missing (suggested new skills) |
|---|---|---|
| **Number (50%)** | adding, times tables, fractions, percentages | **place value** (thousands → millions), **division**, **decimals**, subtraction / word problems |
| **Measurement & geometry (30%)** | length, shapes & turns | **time**, **mass & capacity**, **perimeter & area** |
| **Data (20%)** | **nothing** | **reading tables, bar charts and pictograms** (also an IB PYP strand and a UK statistics strand from Year 2) |
| **Life science (45%)** | living things, habitats, cells | **plants**, **human body** (nutrition, skeleton, teeth, heart), **food chains** |
| **Physical science (35%)** | materials, forces & motion | **light & shadows**, **sound**, **electricity**, **magnets**, **states of matter** (could extend materials) |
| **Earth science (20%)** | day & night, solar system | **rocks & soils**, **water cycle / weather**, **caring for Earth's resources** (NGSS grade 5; very relevant to UAE water and energy) |

**Biggest gaps:** the whole **data** strand (20% of TIMSS maths) and core **number** (place value, division, decimals). Adding new skills changes the skill graph and the UI, so it is a product decision; it is listed as phase 2 below.

## 6. Writing guidelines for questions (Dubai-ready)

1. **Metric units only** (UAE uses metric): cm, m, km, g, kg, ml, l, °C. Never miles, pounds or °F.
2. **Money in dirhams (AED)** and simple numbers.
3. **Inclusive, local and global contexts:** desert, dates, camels and falcons, the metro, the beach, mangroves, a school trip to a science centre, cooking, sharing snacks.
   - Mix names from many nationalities (Aisha, Omar, Priya, Arjun, Leo, Maya, Chen, Fatima…).
   - **Avoid** religious or political topics, and stereotypes.
4. **Climate-aware:** no "snowy winter" assumptions. Dubai has hot summers, mild winters and very little rain, so weather questions should reflect that.
5. **Three choices, one correct.** Wrong choices are **real misconceptions**, so the "explain wrong" text can teach.
   - Example: "A half is 2 equal parts, not 4."
6. **Cognitive mix** (TIMSS / UAE MoE): about 40% knowing, 40% applying, 20% reasoning.
7. **Short, age-fit English:** Years 1–3 one sentence; Years 4–6 up to two; Year 7+ can use correct terms.
8. **Explanations:** "explain correct" says **why** it is right, and "explain wrong" names the **misconception kindly**. No em dashes (house style).

## 7. Plan

- **Phase 1 (now):** draft about **5 more questions per existing skill**, spread across the grades each skill covers, following section 6.
  - This takes the bank from 20 to about 95 items, so practice no longer runs out after 1–2 questions.
  - The automated tests check every item: exactly one correct choice, valid grades, unique ids.
  - Anastasia reviews accuracy and tone in the PR.
- **Phase 2 (needs a product decision):** add the missing skills from section 5, starting with **data (charts and tables)**, **place value**, **decimals**, **light & shadows**, **plants** and **water & weather**.
  - This needs updates to the skill graph, the grade defaults and the radar.
- **Done:** a curriculum picker in Parent (UK, US, Indian, IB, UAE MoE, Other). It renames grades everywhere ("Year 4" → "Grade 3" / "Class 3", with ages) and tells the AI the grade name and spelling. There is still one internal scale and one question bank (`src/lib/curriculum.ts`).
- **Phase 3 (later):** Arabic UI and questions for UAE MoE Cycle 1, and per-curriculum topic-order tweaks only where a real difference is confirmed.

---

## Sources

- KHDA, *Dubai's private school sector records 6% enrolment growth in 2024-25 academic year*: https://web.khda.gov.ae/en/About-Us/News/2025/Dubais-private-school-sector-records-6-enrolment
- KHDA, *Mandatory Curriculum Requirements for Private Schools in Dubai*: https://web.khda.gov.ae/getattachment/Resources/Forms/Curriculum_Requirements_for_Private_Schools_in_Dubai_Eng.pdf.aspx?lang=en-GB
- KHDA, *UAE Ministry of Education Curriculum*: https://web.khda.gov.ae/en/Educational-Consultation-for-Parents/UAE-Ministry-of-Education-Curriculum
- Gulf News, *Dubai private schools aligned with National Agenda*: https://gulfnews.com/uae/education/dubai-private-schools-aligned-with-national-agenda-1.1962908
- Khaleej Times, *Dubai schools to participate in annual external assessments*: https://khaleejtimes.com/uae/dubai-schools-to-participate-in-annual-external-assessments
- KHDA School Inspection Supplement (copy): https://www.tabbiemath.com/assets/pdf/KHDA_School_Inspection_Supplement_.pdf
- TIMSS 2023 Dubai encyclopedia entry: https://timss2023.org/wp-content/uploads/2024/10/Dubai-UAE.pdf
- TIMSS 2023 UAE encyclopedia entry: https://timss2023.org/wp-content/uploads/2024/10/United-Arab-Emirates.pdf
- TIMSS 2023 Mathematics framework: https://elvis.bc.edu/timss2023/frameworks/pdf/T23_Frameworks_Ch1_Mathematics.pdf
- TIMSS 2023 Science framework: https://timss.bc.edu/timss2023/frameworks/pdf/T23_Frameworks_Ch2_Science.pdf
- DfE, *National curriculum in England: mathematics programmes of study*: https://www.gov.uk/government/publications/national-curriculum-in-england-mathematics-programmes-of-study/national-curriculum-in-england-mathematics-programmes-of-study
- DfE, *National curriculum in England: science programmes of study*: https://gov.uk/government/publications/national-curriculum-in-england-science-programmes-of-study/national-curriculum-in-england-science-programmes-of-study
- NCERT CIET, *Maths Mela*: https://ciet.ncert.gov.in/audio-book/158
- CBSE Class 3 maths syllabus overview (EuroSchool): https://www.euroschoolindia.com/blogs/cbse-class-3-maths-syllabus/
- NCERT Class 5 maths chapter list (Aglasem): https://schools.aglasem.com/ncert-books-class-5-maths-chapter-3/
- California Dept. of Education, NGSS grades 3–5 content: https://www.cde.ca.gov/ta/tg/ca/documents/cangsscorecontent.docx
- IB, *PYP programme brochure*: https://ibo.org/globalassets/new-structure/brochures-and-infographics/pdfs/pyp-programme-brochure-en.pdf
- IB PYP Mathematics scope and sequence (2009 copy): https://blogs.ubc.ca/constructivistlessonetec560/files/2014/08/Math-Scope-and-Sequence.pdf
