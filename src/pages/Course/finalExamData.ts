// Final Exam data + grader.
//
// BUG-017 fix: questions are graded by the STABLE TEXT VALUE of the correct
// option (not by a positional index against shuffled options). The learner's
// selected answer is captured and persisted as the option text, and the
// grader compares strings — so shuffling rendered option order can never
// cause a correct selection to be miscounted.

export interface QuizQuestion {
  /** Stable id, never depends on render or shuffle order. */
  id: string;
  q: string;
  /** The correct answer's literal text value — also the stable identifier of
   *  the correct option (option values are unique within each question). */
  a: string;
  options: string[];
}

export interface TopicScore {
  section_number: number;
  section_title: string;
  comar_section: string;
  topic_area: string;
  questions_correct: number;
  questions_total: number;
  score_percentage: number;
  needs_remediation: boolean;
}

export interface GradeResult {
  overallCorrect: number;
  overallTotal: number;
  overallPercent: number;
  isPassed: boolean;
  topicScores: TopicScore[];
}

export const PASSING_SCORE = 80;
export const TOTAL_SECTIONS = 18;

export const getQuestionId = (section: number, index: number) =>
  `s${section}_q${index}`;

const raw: Record<number, Array<Omit<QuizQuestion, 'id'>>> = {
  1: [
    { q: "Which federal law classifies cannabis as a Schedule I drug?", a: "Controlled Substances Act", options: ["Controlled Substances Act", "Food and Drug Act", "Tax Code"] },
    { q: "What is Maryland's legal possession limit for personal cannabis use?", a: "1.5 oz", options: ["1 oz", "1.5 oz", "2 oz"] },
  ],
  2: [
    { q: "What is a key SOP for dispensary operations?", a: "Daily inventory checks", options: ["Daily inventory checks", "Monthly sales reports", "Random pricing"] },
    { q: "Who must approve SOPs in Maryland?", a: "Maryland Cannabis Administration", options: ["FDA", "DEA", "Maryland Cannabis Administration"] },
  ],
  3: [
    { q: "What must be tracked in inventory?", a: "Batch numbers", options: ["Employee hours", "Batch numbers", "Store hours"] },
    { q: "How often should inventory be reconciled?", a: "Daily", options: ["Weekly", "Daily", "Monthly"] },
  ],
  4: [
    { q: "What is required before a sale?", a: "ID verification", options: ["ID verification", "Credit check", "Membership"] },
    { q: "What is the minimum age for cannabis purchase?", a: "21", options: ["19", "21", "25"] },
  ],
  5: [
    { q: "What safety measure prevents diversion?", a: "Locked storage", options: ["Open shelves", "Locked storage", "Public display"] },
    { q: "What should be worn when handling cannabis?", a: "Gloves", options: ["Gloves", "Aprons", "Masks"] },
  ],
  6: [
    { q: "What is the primary psychoactive component of cannabis?", a: "THC", options: ["CBD", "THC", "CBN"] },
    { q: "Which is a potential adverse effect of cannabis?", a: "Anxiety", options: ["Pain relief", "Anxiety", "Improved sleep"] },
  ],
  7: [
    { q: "How long must sales records be kept?", a: "5 years", options: ["1 year", "3 years", "5 years"] },
    { q: "What must be recorded for each sale?", a: "Customer ID", options: ["Customer ID", "Employee mood", "Weather"] },
  ],
  8: [
    { q: "What is required for dispensary security?", a: "Surveillance cameras", options: ["Open windows", "Surveillance cameras", "Signage"] },
    { q: "Who must be notified of a security breach?", a: "Maryland Cannabis Administration", options: ["Local police only", "Maryland Cannabis Administration", "No one"] },
  ],
  9: [
    { q: "What ensures compliance with COMAR?", a: "Regular audits", options: ["Customer feedback", "Regular audits", "Sales targets"] },
    { q: "What is a penalty for non-compliance?", a: "Fines", options: ["Fines", "Awards", "Promotions"] },
  ],
  10: [
    { q: "What must cannabis packaging be?", a: "Child-resistant", options: ["Transparent", "Child-resistant", "Colorful"] },
    { q: "What is prohibited on packaging?", a: "Cartoon characters", options: ["Dosage info", "Cartoon characters", "Batch numbers"] },
  ],
  11: [
    { q: "What must be on a cannabis label?", a: "THC content", options: ["THC content", "Store logo", "Employee name"] },
    { q: "What warning is required on labels?", a: "Keep out of reach of children", options: ["Enjoy responsibly", "Keep out of reach of children", "Use daily"] },
  ],
  12: [
    { q: "What is required for cannabis transport?", a: "Secure vehicle", options: ["Open truck", "Secure vehicle", "Public transit"] },
    { q: "Who can transport cannabis?", a: "Licensed agents", options: ["Customers", "Licensed agents", "Anyone"] },
  ],
  13: [
    { q: "How must cannabis waste be disposed?", a: "Rendered unusable", options: ["Thrown in trash", "Rendered unusable", "Recycled"] },
    { q: "What records are kept for waste?", a: "Weight and date", options: ["Employee name", "Weight and date", "Customer feedback"] },
  ],
  14: [
    { q: "What must be tested in cannabis?", a: "Pesticides", options: ["Color", "Pesticides", "Texture"] },
    { q: "Who conducts cannabis testing?", a: "Licensed labs", options: ["Dispensary staff", "Licensed labs", "Customers"] },
  ],
  15: [
    { q: "What should customers be educated on?", a: "Dosage forms", options: ["Store hours", "Dosage forms", "Employee names"] },
    { q: "What symptom should customers report?", a: "Acute intoxication", options: ["Happiness", "Acute intoxication", "Energy"] },
  ],
  16: [
    { q: "What is an emergency procedure?", a: "Evacuation plan", options: ["Price adjustment", "Evacuation plan", "Staff meeting"] },
    { q: "Who is notified in an emergency?", a: "Authorities", options: ["Customers", "Authorities", "Media"] },
  ],
  17: [
    { q: "How often must agents be trained?", a: "Every 12 months", options: ["Every 6 months", "Every 12 months", "Every 2 years"] },
    { q: "What training covers drug interactions?", a: "RVT", options: ["Sales training", "RVT", "Marketing"] },
  ],
  18: [
    { q: "What is an ethical duty of agents?", a: "Confidentiality", options: ["Upselling", "Confidentiality", "Advertising"] },
    { q: "What should agents avoid?", a: "Misrepresenting products", options: ["Educating customers", "Misrepresenting products", "Following SOPs"] },
  ],
};

export const quizzes: Record<number, QuizQuestion[]> = Object.fromEntries(
  Object.entries(raw).map(([sec, qs]) => [
    Number(sec),
    qs.map((q, i) => ({ ...q, id: getQuestionId(Number(sec), i) })),
  ]),
) as Record<number, QuizQuestion[]>;

export const expectedQuestionIds = new Set(
  Object.values(quizzes).flatMap(sectionQuestions => sectionQuestions.map(q => q.id)),
);

export const sectionTitles: Record<number, string> = {
  1: "Federal and State Cannabis Laws",
  2: "Standard Operating Procedures",
  3: "Inventory Management",
  4: "Sales Procedures",
  5: "Safety Protocols",
  6: "Health and Pharmacology",
  7: "Record Keeping",
  8: "Security Measures",
  9: "Compliance Standards",
  10: "Packaging Regulations",
  11: "Labeling Requirements",
  12: "Transportation Guidelines",
  13: "Waste Management",
  14: "Testing Standards",
  15: "Customer Education",
  16: "Emergency Procedures",
  17: "Training Requirements",
  18: "Ethical Standards",
};

export const comarSections: Record<number, { comar: string; topic: string }> = {
  1: { comar: "COMAR 14.17.05.01", topic: "Legal Framework" },
  2: { comar: "COMAR 14.17.12.02", topic: "Operational Compliance" },
  3: { comar: "COMAR 14.17.12.04", topic: "Inventory Control" },
  4: { comar: "COMAR 14.17.12.02", topic: "Sales & Transactions" },
  5: { comar: "COMAR 14.17.05.06", topic: "Workplace Safety" },
  6: { comar: "COMAR 14.17.05.06", topic: "Medical Knowledge" },
  7: { comar: "COMAR 14.17.05.08", topic: "Documentation" },
  8: { comar: "COMAR 14.17.05.07", topic: "Security & Loss Prevention" },
  9: { comar: "COMAR 14.17.05.08", topic: "Regulatory Compliance" },
  10: { comar: "COMAR 14.17.18.02", topic: "Product Packaging" },
  11: { comar: "COMAR 14.17.18", topic: "Product Labeling" },
  12: { comar: "COMAR 14.17.09", topic: "Transport & Distribution" },
  13: { comar: "COMAR 14.17", topic: "Disposal & Waste" },
  14: { comar: "COMAR 14.17.08", topic: "Quality Assurance" },
  15: { comar: "COMAR 14.17.05.06", topic: "Patient Education" },
  16: { comar: "COMAR 14.17", topic: "Emergency Response" },
  17: { comar: "COMAR 14.17.05.04", topic: "Agent Training" },
  18: { comar: "COMAR 14.17.15.05", topic: "Professional Ethics" },
};

const norm = (s: string | undefined | null) =>
  (s ?? '').toString().trim().toLowerCase();

/**
 * Stable-value grader. Compares the learner's selected option TEXT against
 * the question's stored correct option TEXT. Independent of render order.
 *
 * @param answers Map of questionId -> selected option text value
 */
export function gradeExam(answers: Record<string, string>): GradeResult {
  const topicScores: TopicScore[] = [];
  let overallCorrect = 0;
  let overallTotal = 0;

  for (let section = 1; section <= TOTAL_SECTIONS; section++) {
    const questions = quizzes[section] || [];
    let sectionCorrect = 0;
    for (const q of questions) {
      const selected = answers[q.id];
      if (selected !== undefined && norm(selected) === norm(q.a)) {
        sectionCorrect += 1;
      }
    }
    const sectionTotal = questions.length;
    const pct = sectionTotal > 0 ? Math.round((sectionCorrect / sectionTotal) * 100) : 0;

    overallCorrect += sectionCorrect;
    overallTotal += sectionTotal;

    topicScores.push({
      section_number: section,
      section_title: sectionTitles[section],
      comar_section: comarSections[section].comar,
      topic_area: comarSections[section].topic,
      questions_correct: sectionCorrect,
      questions_total: sectionTotal,
      score_percentage: pct,
      needs_remediation: pct < PASSING_SCORE,
    });
  }

  const overallPercent = overallTotal > 0
    ? Math.round((overallCorrect / overallTotal) * 100)
    : 0;
  const isPassed = overallPercent >= PASSING_SCORE
    && topicScores.every(t => t.score_percentage >= PASSING_SCORE);

  return { overallCorrect, overallTotal, overallPercent, isPassed, topicScores };
}

/** Build a perfect answer map — used by the self-test. */
export function buildPerfectAnswers(): Record<string, string> {
  const out: Record<string, string> = {};
  for (let s = 1; s <= TOTAL_SECTIONS; s++) {
    for (const q of quizzes[s]) out[q.id] = q.a;
  }
  return out;
}

/**
 * Build the same questionId -> selected option text map the rendered radio path
 * produces. This intentionally keys by the rendered question object's stable id.
 */
export function buildRenderedPathPerfectAnswers(
  renderedQuizzes: Record<number, QuizQuestion[]> = quizzes,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (let s = 1; s <= TOTAL_SECTIONS; s++) {
    for (const renderedQuestion of renderedQuizzes[s] || []) {
      if (!expectedQuestionIds.has(renderedQuestion.id)) {
        throw new Error(`[FinalExam selfTest] Rendered question id ${renderedQuestion.id} is not in the grader expected id set`);
      }
      out[renderedQuestion.id] = renderedQuestion.options.find(o => o === renderedQuestion.a) ?? renderedQuestion.a;
    }
  }
  return out;
}

/**
 * Runtime self-check. Throws (in dev) if the grader regresses or the data is
 * inconsistent. Called once when the FinalExam component mounts in dev.
 */
export function selfTestGrader(): void {
  // 1. Every question's correct answer text must appear in its options.
  for (let s = 1; s <= TOTAL_SECTIONS; s++) {
    for (const q of quizzes[s]) {
      if (!q.options.includes(q.a)) {
        throw new Error(`[FinalExam selfTest] Question ${q.id} correct answer "${q.a}" not in options`);
      }
    }
  }

  // 2. A perfect answer map must grade to 100%, passed, all 18 topics at 100%.
  const perfect = gradeExam(buildPerfectAnswers());
  if (perfect.overallPercent !== 100 || !perfect.isPassed) {
    throw new Error(`[FinalExam selfTest] Perfect answers did not score 100% passed (got ${perfect.overallPercent}%, passed=${perfect.isPassed})`);
  }
  if (perfect.topicScores.length !== TOTAL_SECTIONS
      || !perfect.topicScores.every(t => t.score_percentage === 100)) {
    throw new Error('[FinalExam selfTest] Perfect answers did not produce 18 topics at 100%');
  }

  // 3. Empty answers must grade to 0% and not-passed.
  const empty = gradeExam({});
  if (empty.overallPercent !== 0 || empty.isPassed) {
    throw new Error('[FinalExam selfTest] Empty answers did not score 0% / failed');
  }

  // 4. Shuffled-option independence: selecting by VALUE still grades correctly
  //    even if we pretend options were rendered in a different order.
  const shuffledAnswers: Record<string, string> = {};
  for (let s = 1; s <= TOTAL_SECTIONS; s++) {
    for (const q of quizzes[s]) {
      // Reverse the options to simulate a shuffle and still pick the correct value.
      const reversed = [...q.options].reverse();
      shuffledAnswers[q.id] = reversed.find(o => o === q.a)!;
    }
  }
  const shuffled = gradeExam(shuffledAnswers);
  if (shuffled.overallPercent !== 100 || !shuffled.isPassed) {
    throw new Error('[FinalExam selfTest] Shuffle-independent grading regressed');
  }

  // 5. Full render -> radio answers path: simulate the shuffled question objects
  //    used by FinalExam.tsx, key answers exactly as the radio inputs do
  //    (renderedQuestion.id), and verify the canonical grader still scores 100%.
  const renderedShuffledQuizzes = Object.fromEntries(
    Object.entries(quizzes).map(([section, qs]) => [
      Number(section),
      qs.map(q => ({ ...q, options: [...q.options].reverse() })),
    ]),
  ) as Record<number, QuizQuestion[]>;
  const renderPath = gradeExam(buildRenderedPathPerfectAnswers(renderedShuffledQuizzes));
  if (renderPath.overallPercent !== 100 || !renderPath.isPassed || renderPath.topicScores.length !== TOTAL_SECTIONS) {
    throw new Error(`[FinalExam selfTest] Render-to-answer path regressed (got ${renderPath.overallPercent}%, topics=${renderPath.topicScores.length}, passed=${renderPath.isPassed})`);
  }

  // 6. Partial credit: miss exactly one question -> 35/36 -> 97%, but NOT passed
  //    because the section with the miss drops below 80% (1/2 = 50%).
  const partial = { ...buildPerfectAnswers() };
  partial[getQuestionId(1, 0)] = 'WRONG_VALUE';
  const partialRes = gradeExam(partial);
  if (partialRes.overallCorrect !== 35 || partialRes.isPassed) {
    throw new Error(`[FinalExam selfTest] Partial grading regressed (correct=${partialRes.overallCorrect}, passed=${partialRes.isPassed})`);
  }
}
