-- Add lessons JSONB column to course_modules
ALTER TABLE course_modules 
ADD COLUMN IF NOT EXISTS lessons JSONB DEFAULT '[]';

COMMENT ON COLUMN course_modules.lessons IS 'SCORM-style lesson structure with video, summary, and resources for each module';

-- Add 10 comprehensive quiz questions for Module 0 (Welcome & Platform Orientation)
UPDATE course_modules 
SET quiz_questions = '[
  {
    "id": "q0-1",
    "question": "What is the primary purpose of the Maryland Cannabis Administration (MCA)?",
    "options": [
      "To promote cannabis sales in Maryland",
      "To regulate and oversee the cannabis industry in Maryland",
      "To provide medical cannabis to patients",
      "To eliminate illegal cannabis activity"
    ],
    "correct": "To regulate and oversee the cannabis industry in Maryland",
    "explanation": "The MCA is the state agency responsible for regulating all aspects of Maryland''s cannabis industry, including licensing, compliance, and enforcement.",
    "topic": "Regulatory Framework",
    "comarRef": "COMAR 14.17",
    "difficulty": "easy",
    "relatedModules": ["part1"]
  },
  {
    "id": "q0-2",
    "question": "Which document outlines the operational rules for Maryland dispensaries?",
    "options": [
      "The Cannabis Operations Manual",
      "COMAR Title 14",
      "The Federal Drug Enforcement Act",
      "Maryland State Constitution"
    ],
    "correct": "COMAR Title 14",
    "explanation": "COMAR (Code of Maryland Regulations) Title 14, specifically section 14.17, contains the detailed operational rules for cannabis dispensaries in Maryland.",
    "topic": "Regulatory Framework",
    "comarRef": "COMAR 14.17",
    "difficulty": "easy",
    "relatedModules": ["part1"]
  },
  {
    "id": "q0-3",
    "question": "What is a Responsible Vendor Training (RVT) program?",
    "options": [
      "Training for customers on safe cannabis use",
      "Required training for all cannabis dispensary agents",
      "Optional training for management only",
      "Training for law enforcement"
    ],
    "correct": "Required training for all cannabis dispensary agents",
    "explanation": "RVT is mandatory training that all cannabis dispensary agents must complete before working in a Maryland dispensary. It covers regulations, compliance, and best practices.",
    "topic": "Compliance Training",
    "difficulty": "medium",
    "relatedModules": ["part1", "part11"]
  },
  {
    "id": "q0-4",
    "question": "What happens if a dispensary agent fails to complete their RVT certification?",
    "options": [
      "They receive a warning",
      "Nothing - it''s optional",
      "They cannot work in a Maryland dispensary",
      "They can work but with supervision only"
    ],
    "correct": "They cannot work in a Maryland dispensary",
    "explanation": "RVT certification is a mandatory requirement. Without it, an individual cannot legally work as a dispensary agent in Maryland.",
    "topic": "Compliance Training",
    "comarRef": "COMAR 14.17.05",
    "difficulty": "medium",
    "relatedModules": ["part1"]
  },
  {
    "id": "q0-5",
    "question": "How often must RVT certification be renewed?",
    "options": [
      "Every 6 months",
      "Annually (every year)",
      "Every 2 years",
      "It never expires"
    ],
    "correct": "Annually (every year)",
    "explanation": "RVT certification must be renewed every year to ensure all dispensary agents stay current with the latest regulations and best practices.",
    "topic": "Compliance Training",
    "difficulty": "easy",
    "relatedModules": ["part1"]
  },
  {
    "id": "q0-6",
    "question": "Which of the following is NOT a responsibility of a Maryland dispensary agent?",
    "options": [
      "Verifying customer identification",
      "Maintaining accurate inventory records",
      "Prescribing cannabis for medical conditions",
      "Ensuring compliance with COMAR regulations"
    ],
    "correct": "Prescribing cannabis for medical conditions",
    "explanation": "Only licensed physicians can recommend cannabis for medical use. Dispensary agents cannot prescribe or recommend specific medical treatments.",
    "topic": "Professional Responsibilities",
    "difficulty": "easy",
    "relatedModules": ["part6", "part11"]
  },
  {
    "id": "q0-7",
    "question": "What is the minimum age to purchase adult-use cannabis in Maryland?",
    "options": [
      "18 years old",
      "19 years old",
      "21 years old",
      "25 years old"
    ],
    "correct": "21 years old",
    "explanation": "Maryland law requires customers to be at least 21 years old to purchase adult-use cannabis. Medical cannabis patients may be younger with proper certification.",
    "topic": "Age Verification",
    "comarRef": "COMAR 14.17.12",
    "difficulty": "easy",
    "relatedModules": ["part2"]
  },
  {
    "id": "q0-8",
    "question": "What is the purpose of METRC in Maryland''s cannabis industry?",
    "options": [
      "To collect taxes from dispensaries",
      "To track cannabis from cultivation to sale (seed-to-sale tracking)",
      "To test cannabis products for quality",
      "To issue dispensary licenses"
    ],
    "correct": "To track cannabis from cultivation to sale (seed-to-sale tracking)",
    "explanation": "METRC (Marijuana Enforcement Tracking Reporting Compliance) is the state''s seed-to-sale tracking system that monitors all cannabis products throughout the supply chain.",
    "topic": "Inventory Management",
    "comarRef": "COMAR 14.17.09",
    "difficulty": "medium",
    "relatedModules": ["part7"]
  },
  {
    "id": "q0-9",
    "question": "Which of the following best describes ''diversion'' in the cannabis industry?",
    "options": [
      "Changing product packaging",
      "The illegal sale or distribution of cannabis outside regulated channels",
      "Moving inventory between dispensary locations",
      "Discounting products for customers"
    ],
    "correct": "The illegal sale or distribution of cannabis outside regulated channels",
    "explanation": "Diversion refers to cannabis products leaving the legal, regulated market and entering illegal channels. Preventing diversion is a critical responsibility for all dispensary agents.",
    "topic": "Diversion Prevention",
    "comarRef": "COMAR 14.17.08",
    "difficulty": "medium",
    "relatedModules": ["part12", "part22"]
  },
  {
    "id": "q0-10",
    "question": "If a customer presents an ID that appears altered or fake, what should the dispensary agent do?",
    "options": [
      "Accept it if the customer insists it''s real",
      "Call the police immediately",
      "Refuse the sale and document the incident per store policy",
      "Ask for a different form of ID and accept whichever one looks better"
    ],
    "correct": "Refuse the sale and document the incident per store policy",
    "explanation": "Agents must refuse any sale when ID authenticity is in question and document the incident according to dispensary procedures. This protects both the business and maintains compliance.",
    "topic": "ID Verification",
    "comarRef": "COMAR 14.17.12",
    "difficulty": "hard",
    "relatedModules": ["part2", "part8"]
  }
]'::jsonb
WHERE module_number = 0;

-- Note: You can add quiz questions for other modules using similar UPDATE statements
-- Each module should have 10+ questions with mixed difficulty levels (easy/medium/hard)
-- Topics should align with the module content and include COMAR references where applicable