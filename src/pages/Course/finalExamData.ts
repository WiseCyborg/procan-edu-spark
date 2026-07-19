// Final Exam display metadata.
//
// Questions and the answer key have been moved server-side. The client no
// longer holds correct answers, quiz option text, or a grader. This module
// only exports the shapes and display constants used by the exam UI.

export interface QuizQuestion {
  /** Stable id, never depends on render or shuffle order. */
  id: string;
  q: string;
  /** Retained in the shape for existing UI code paths, but the client is no
   *  longer authoritative — server grading is the only source of truth. */
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

export const PASSING_SCORE = 80;
export const TOTAL_SECTIONS = 18;

export const getQuestionId = (section: number, index: number) =>
  `s${section}_q${index}`;

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
  1: { comar: "COMAR 14.17.01", topic: "Legal Framework" },
  2: { comar: "COMAR 14.17.12.02", topic: "Operational Compliance" },
  3: { comar: "COMAR 14.17.12.10", topic: "Inventory Control" },
  4: { comar: "COMAR 14.17.12.04", topic: "Sales & Transactions" },
  5: { comar: "COMAR 14.17.15.05", topic: "Workplace Safety" },
  6: { comar: "COMAR 14.17", topic: "Medical Knowledge" },
  7: { comar: "COMAR 14.17.14.02", topic: "Documentation" },
  8: { comar: "COMAR 14.17.12.02", topic: "Security & Loss Prevention" },
  9: { comar: "COMAR 14.17.14", topic: "Regulatory Compliance" },
  10: { comar: "COMAR 14.17.18.02", topic: "Product Packaging" },
  11: { comar: "COMAR 14.17.18.03", topic: "Product Labeling" },
  12: { comar: "COMAR 14.17.09", topic: "Transport & Distribution" },
  13: { comar: "COMAR 14.17.10.05", topic: "Disposal & Waste" },
  14: { comar: "COMAR 14.17.08", topic: "Quality Assurance" },
  15: { comar: "COMAR 14.17.12.04", topic: "Patient Education" },
  16: { comar: "COMAR 14.17", topic: "Emergency Response" },
  17: { comar: "COMAR 14.17.15.05", topic: "Agent Training" },
  18: { comar: "COMAR 14.17.15.05", topic: "Professional Ethics" },
};
