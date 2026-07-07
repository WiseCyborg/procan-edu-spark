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
    { q: "Which Maryland agency regulates cannabis dispensaries?", a: "Maryland Cannabis Administration", options: ["Maryland Cannabis Administration", "Department of Health", "Comptroller's Office"] },
    { q: "What is the minimum age to purchase cannabis in Maryland?", a: "21", options: ["18", "21", "25"] },
    { q: "Is it legal to transport cannabis across state lines?", a: "No, it violates federal law", options: ["Yes, if both states allow it", "No, it violates federal law", "Only for medical patients"] },
  ],
  2: [
    { q: "What is a key SOP for dispensary operations?", a: "Daily inventory checks", options: ["Daily inventory checks", "Monthly sales reports", "Random pricing"] },
    { q: "Who must approve SOPs in Maryland?", a: "Maryland Cannabis Administration", options: ["FDA", "DEA", "Maryland Cannabis Administration"] },
    { q: "What does an SOP help dispensary staff do?", a: "Perform tasks consistently and correctly", options: ["Perform tasks consistently and correctly", "Set their own work schedules", "Determine product pricing"] },
    { q: "How often should SOPs be reviewed?", a: "Regularly and when regulations change", options: ["Never", "Only when problems arise", "Regularly and when regulations change"] },
    { q: "Who is responsible for following dispensary SOPs?", a: "All dispensary staff", options: ["Only managers", "All dispensary staff", "Only compliance officers"] },
  ],
  3: [
    { q: "What must be tracked in inventory?", a: "Batch numbers", options: ["Employee hours", "Batch numbers", "Store hours"] },
    { q: "How often should inventory be reconciled?", a: "Daily", options: ["Weekly", "Daily", "Monthly"] },
    { q: "What system tracks cannabis from seed to sale?", a: "METRC", options: ["METRC", "QuickBooks", "POS only"] },
    { q: "How often must inventory be reconciled per MCA regulations?", a: "Daily", options: ["Monthly", "Weekly", "Daily"] },
    { q: "What should staff do if inventory counts do not match system records?", a: "Report the discrepancy immediately", options: ["Ignore minor discrepancies", "Report the discrepancy immediately", "Adjust the count without reporting"] },
  ],
  4: [
    { q: "What is required before a sale?", a: "ID verification", options: ["ID verification", "Credit check", "Membership"] },
    { q: "What is the minimum age for cannabis purchase?", a: "21", options: ["19", "21", "25"] },
    { q: "What must be verified before completing a cannabis sale?", a: "Valid ID and age", options: ["Customer loyalty status", "Valid ID and age", "Product preference"] },
    { q: "What are Maryland's daily purchase limits for adult-use customers?", a: "1.5 oz flower or equivalent", options: ["1 oz flower or equivalent", "1.5 oz flower or equivalent", "2 oz flower or equivalent"] },
    { q: "What should a dispensary agent do if a customer appears impaired?", a: "Refuse the sale", options: ["Complete the sale quickly", "Refuse the sale", "Offer a discount"] },
  ],
  5: [
    { q: "What safety measure prevents diversion?", a: "Locked storage", options: ["Open shelves", "Locked storage", "Public display"] },
    { q: "What should be worn when handling cannabis?", a: "Gloves", options: ["Gloves", "Aprons", "Masks"] },
    { q: "What should dispensary staff do in the event of a robbery?", a: "Comply and report immediately after", options: ["Pursue the suspect", "Comply and report immediately after", "Lock the doors and handle it internally"] },
    { q: "How should cannabis waste be handled?", a: "Rendered unusable and logged per MCA rules", options: ["Thrown in regular trash", "Rendered unusable and logged per MCA rules", "Given to employees"] },
    { q: "Which of the following is a required safety feature for dispensaries?", a: "24-hour security cameras", options: ["24-hour security cameras", "Open floor plan", "Self-checkout kiosks"] },
  ],
  6: [
    { q: "What is the primary psychoactive component of cannabis?", a: "THC", options: ["CBD", "THC", "CBN"] },
    { q: "Which is a potential adverse effect of cannabis?", a: "Anxiety", options: ["Pain relief", "Anxiety", "Improved sleep"] },
    { q: "What system in the human body interacts with cannabinoids?", a: "Endocannabinoid system", options: ["Digestive system", "Endocannabinoid system", "Cardiovascular system"] },
    { q: "Which cannabinoid is primarily responsible for psychoactive effects?", a: "THC", options: ["CBD", "CBN", "THC"] },
    { q: "Why should cannabis agents avoid making medical claims about products?", a: "They are not licensed healthcare providers", options: ["It slows sales", "They are not licensed healthcare providers", "Customers prefer not to hear it"] },
  ],
  7: [
    { q: "How long must sales records be kept?", a: "2 years", options: ["1 year", "2 years", "5 years"] },
    { q: "What must be recorded for each sale?", a: "Customer ID", options: ["Customer ID", "Employee mood", "Weather"] },
    { q: "How long must dispensaries retain sales records per MCA regulations?", a: "3 years", options: ["1 year", "2 years", "3 years"] },
    { q: "Which records must be kept for every cannabis transaction?", a: "Customer name and product purchased", options: ["Customer name and product purchased", "Customer's medical history", "Customer's employment information"] },
    { q: "What is the purpose of a chain of custody record?", a: "Document cannabis movement from origin to sale", options: ["Track employee performance", "Document cannabis movement from origin to sale", "Record customer complaints"] },
  ],
  8: [
    { q: "What is required for dispensary security?", a: "Surveillance cameras", options: ["Open windows", "Surveillance cameras", "Signage"] },
    { q: "Who must be notified of a security breach?", a: "Maryland Cannabis Administration", options: ["Local police only", "Maryland Cannabis Administration", "No one"] },
    { q: "Who must have access to dispensary security footage?", a: "MCA inspectors upon request", options: ["All employees", "Only the owner", "MCA inspectors upon request"] },
    { q: "What must dispensaries do with visitor access logs?", a: "Retain per MCA requirements", options: ["Shred after 30 days", "Retain per MCA requirements", "Share publicly"] },
    { q: "Which area of a dispensary requires restricted access?", a: "Storage and vault areas", options: ["Waiting room", "Retail floor", "Storage and vault areas"] },
  ],
  9: [
    { q: "What ensures compliance with COMAR?", a: "Regular audits", options: ["Customer feedback", "Regular audits", "Sales targets"] },
    { q: "What is a penalty for non-compliance?", a: "Fines", options: ["Fines", "Awards", "Promotions"] },
    { q: "What happens if a dispensary fails an MCA inspection?", a: "Fines, suspension, or license revocation", options: ["Nothing unless a customer complains", "Fines, suspension, or license revocation", "Staff are personally fined"] },
    { q: "Who enforces cannabis compliance in Maryland?", a: "Maryland Cannabis Administration", options: ["Local police only", "Maryland Cannabis Administration", "Department of Agriculture"] },
    { q: "What should a dispensary agent do if asked to violate a regulation?", a: "Refuse and report to a supervisor", options: ["Comply if the manager approves", "Refuse and report to a supervisor", "Ignore it if it seems minor"] },
  ],
  10: [
    { q: "What must cannabis packaging be?", a: "Child-resistant", options: ["Transparent", "Child-resistant", "Colorful"] },
    { q: "What is prohibited on packaging?", a: "Cartoon characters", options: ["Dosage info", "Cartoon characters", "Batch numbers"] },
    { q: "What information must appear on cannabis product packaging?", a: "THC/CBD content, warnings, and batch number", options: ["Only the price", "THC/CBD content, warnings, and batch number", "Just the strain name"] },
    { q: "Why is child-resistant packaging required?", a: "To prevent accidental ingestion by children", options: ["To reduce theft", "To prevent accidental ingestion by children", "To keep products fresh"] },
    { q: "Can a dispensary sell cannabis in non-compliant packaging?", a: "No, it violates MCA regulations", options: ["Yes, if the product is popular", "No, it violates MCA regulations", "Only for online orders"] },
  ],
  11: [
    { q: "What must be on a cannabis label?", a: "THC content", options: ["THC content", "Store logo", "Employee name"] },
    { q: "What warning is required on labels?", a: "Keep out of reach of children", options: ["Enjoy responsibly", "Keep out of reach of children", "Use daily"] },
    { q: "What warning must appear on all cannabis product labels?", a: "Health and safety warnings", options: ["Price per gram", "Health and safety warnings", "Staff recommendations"] },
    { q: "What does a batch number on a label allow?", a: "Tracing the product back to its test results", options: ["Price tracking", "Tracing the product back to its test results", "Identifying the dispensary manager"] },
    { q: "Can a dispensary add unapproved claims to a cannabis label?", a: "No, labels must comply with MCA requirements", options: ["Yes, if they believe them to be true", "No, labels must comply with MCA requirements", "Only for medical products"] },
  ],
  12: [
    { q: "What is required for cannabis transport?", a: "Secure vehicle", options: ["Open truck", "Secure vehicle", "Public transit"] },
    { q: "Who can transport cannabis?", a: "Licensed agents", options: ["Customers", "Licensed agents", "Anyone"] },
    { q: "What must accompany cannabis during transport?", a: "A manifest documenting the shipment", options: ["A verbal authorization", "A manifest documenting the shipment", "Only a vehicle registration"] },
    { q: "Who may legally transport cannabis between licensed facilities in Maryland?", a: "Only MCA-licensed transporters", options: ["Any employee with a valid license", "Only MCA-licensed transporters", "Customers picking up orders"] },
    { q: "What should a driver do if a cannabis shipment is compromised?", a: "Report immediately to the dispensary and MCA", options: ["Continue delivery", "Report immediately to the dispensary and MCA", "Discard the product"] },
  ],
  13: [
    { q: "How must cannabis waste be disposed?", a: "Rendered unusable", options: ["Thrown in trash", "Rendered unusable", "Recycled"] },
    { q: "What records are kept for waste?", a: "Weight and date", options: ["Employee name", "Weight and date", "Customer feedback"] },
    { q: "Why must cannabis waste be rendered unusable before disposal?", a: "To prevent diversion and comply with MCA rules", options: ["To reduce weight", "To prevent diversion and comply with MCA rules", "To save on disposal costs"] },
    { q: "What documentation is required for cannabis waste disposal?", a: "A waste log per MCA requirements", options: ["No documentation needed", "A waste log per MCA requirements", "Only a receipt from the disposal company"] },
    { q: "Which of the following is an approved method of cannabis waste disposal?", a: "Mixing with non-consumable material and discarding", options: ["Flushing down the drain", "Mixing with non-consumable material and discarding", "Burning without a permit"] },
  ],
  14: [
    { q: "What must be tested in cannabis?", a: "Pesticides", options: ["Color", "Pesticides", "Texture"] },
    { q: "Who conducts cannabis testing?", a: "Licensed labs", options: ["Dispensary staff", "Licensed labs", "Customers"] },
    { q: "What contaminants must cannabis be tested for before sale?", a: "Pesticides, heavy metals, and microbial contaminants", options: ["Only THC levels", "Pesticides, heavy metals, and microbial contaminants", "Just mold"] },
    { q: "What happens to cannabis that fails lab testing?", a: "It cannot be sold and must be destroyed or remediated", options: ["It is sold at a discount", "It cannot be sold and must be destroyed or remediated", "It is donated"] },
    { q: "Who performs required cannabis testing in Maryland?", a: "MCA-licensed independent laboratories", options: ["Dispensary staff", "MCA-licensed independent laboratories", "The cannabis grower"] },
  ],
  15: [
    { q: "What should customers be educated on?", a: "Dosage forms", options: ["Store hours", "Dosage forms", "Employee names"] },
    { q: "What symptom should customers report?", a: "Acute intoxication", options: ["Happiness", "Acute intoxication", "Energy"] },
    { q: "What is the recommended approach for a new cannabis consumer?", a: "Start low and go slow", options: ["Start high and adjust down", "Start low and go slow", "Use the strongest product available"] },
    { q: "What should a dispensary agent do if a customer asks about drug interactions?", a: "Direct them to consult a healthcare provider", options: ["Recommend a specific product", "Direct them to consult a healthcare provider", "Ignore the question"] },
    { q: "Which customers should dispensary staff be most cautious with regarding product recommendations?", a: "First-time consumers and those with health conditions", options: ["Experienced daily users", "First-time consumers and those with health conditions", "Senior citizens only"] },
  ],
  16: [
    { q: "What is an emergency procedure?", a: "Evacuation plan", options: ["Price adjustment", "Evacuation plan", "Staff meeting"] },
    { q: "Who is notified in an emergency?", a: "Authorities", options: ["Customers", "Authorities", "Media"] },
    { q: "What should staff do if a customer has a medical emergency on the premises?", a: "Call 911 immediately", options: ["Ask them to leave", "Call 911 immediately", "Wait to see if it resolves"] },
    { q: "Where should emergency contact numbers be posted in a dispensary?", a: "In easily accessible locations for all staff", options: ["Only in the manager's office", "In easily accessible locations for all staff", "In the parking lot"] },
    { q: "What should staff do immediately after an incident at the dispensary?", a: "Document the incident and notify a supervisor", options: ["Wait for the manager to return", "Document the incident and notify a supervisor", "Discuss it only with coworkers"] },
  ],
  17: [
    { q: "How often must agents be trained?", a: "Every 12 months", options: ["Every 6 months", "Every 12 months", "Every 2 years"] },
    { q: "What training covers drug interactions?", a: "RVT", options: ["Sales training", "RVT", "Marketing"] },
    { q: "How often must dispensary agents renew their RVT certification in Maryland?", a: "Every two years", options: ["Every year", "Every two years", "Every five years"] },
    { q: "What does the MCA Responsible Vendor Training cover?", a: "Laws, compliance, safety, and cannabis knowledge", options: ["Only sales techniques", "Laws, compliance, safety, and cannabis knowledge", "Only customer service"] },
    { q: "What must a dispensary do when an agent fails to complete required training?", a: "Remove them from the sales floor until training is complete", options: ["Allow them to continue working temporarily", "Remove them from the sales floor until training is complete", "Fine them personally"] },
  ],
  18: [
    { q: "What is an ethical duty of agents?", a: "Confidentiality", options: ["Upselling", "Confidentiality", "Advertising"] },
    { q: "What should agents avoid?", a: "Misrepresenting products", options: ["Educating customers", "Misrepresenting products", "Following SOPs"] },
    { q: "What should a dispensary agent do if offered a bribe by a customer?", a: "Refuse and report to a supervisor", options: ["Accept if the amount is small", "Refuse and report to a supervisor", "Ignore it"] },
    { q: "How should staff treat all customers regardless of their background?", a: "With equal respect and professionalism", options: ["Offer different service levels based on purchase history", "With equal respect and professionalism", "More attentively if they are medical patients"] },
    { q: "What is a dispensary agent's obligation if they witness a coworker violating regulations?", a: "Report it through the appropriate channel", options: ["Mind their own business", "Report it through the appropriate channel", "Handle it themselves without reporting"] },
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
  13: { comar: "COMAR 14.17.10.05", topic: "Disposal & Waste" },
  14: { comar: "COMAR 14.17.08", topic: "Quality Assurance" },
  15: { comar: "COMAR 14.17.05.06", topic: "Patient Education" },
  16: { comar: "COMAR 14.17.12.10", topic: "Emergency Response" },
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
