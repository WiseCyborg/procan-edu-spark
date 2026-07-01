## File
`src/pages/Course/finalExamData.ts` (317 lines total)

## Data Structure
```ts
interface QuizQuestion {
  id: string;      // stable id via getQuestionId(section, index) → `s{n}_q{i}`
  q: string;       // question text
  a: string;       // correct answer as literal option text (stable identifier)
  options: string[];
}

// Raw source: Record<sectionNumber, Array<Omit<QuizQuestion,'id'>>>
// 18 sections × 2 questions each = 36 questions
// Passing score: 80 (PASSING_SCORE), TOTAL_SECTIONS = 18
// Grading is by string match against `a` — shuffle-safe (BUG-017 fix)
```

## First 3 Questions (Section 1 + Section 2 q1)

**Section 1 — Q1** (`id: s1_q0`)
- q: "Which federal law classifies cannabis as a Schedule I drug?"
- options: `["Controlled Substances Act", "Food and Drug Act", "Tax Code"]`
- a: `"Controlled Substances Act"`

**Section 1 — Q2** (`id: s1_q1`)
- q: "What is Maryland's legal possession limit for personal cannabis use?"
- options: `["1 oz", "1.5 oz", "2 oz"]`
- a: `"1.5 oz"`

**Section 2 — Q1** (`id: s2_q0`)
- q: "What is a key SOP for dispensary operations?"
- options: `["Daily inventory checks", "Monthly sales reports", "Random pricing"]`
- a: `"Daily inventory checks"`

## Notes
- File also exports `PASSING_SCORE`, `TOTAL_SECTIONS`, `getQuestionId()`, and (further down, not shown) topic metadata + grader logic that returns `GradeResult` with per-topic `TopicScore[]`.
- Ready to view more sections or the grader on request — no edits proposed yet since this was a read-only lookup.
