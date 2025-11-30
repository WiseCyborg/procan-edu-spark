-- Add quiz questions for Module 0: Welcome & Platform Orientation
UPDATE course_modules 
SET quiz_questions = '[
  {
    "id": "m0-q1",
    "question": "What is the minimum passing score required for the RVT certification exam?",
    "options": ["60%", "70%", "80%", "90%"],
    "correct": "80%",
    "explanation": "A score of 80% or higher is required to pass the RVT certification exam and earn your Maryland Cannabis Dispensary Agent certification.",
    "topic": "Certification Requirements",
    "difficulty": "easy"
  },
  {
    "id": "m0-q2", 
    "question": "How many modules are in the ProCann MCA Training Program?",
    "options": ["18", "20", "23", "25"],
    "correct": "23",
    "explanation": "The training consists of 23 comprehensive modules organized into three tiers: Green Tier (foundational), Yellow Tier (intermediate), and Red Tier (advanced).",
    "topic": "Course Structure",
    "difficulty": "easy"
  },
  {
    "id": "m0-q3",
    "question": "Which tier covers foundational knowledge including laws, products, and customer service?",
    "options": ["Red Tier", "Yellow Tier", "Green Tier", "Blue Tier"],
    "correct": "Green Tier",
    "explanation": "Green Tier (Modules 1-8) covers foundational knowledge including Maryland cannabis laws, product types, customer service, and basic compliance requirements.",
    "topic": "Course Structure",
    "difficulty": "easy"
  },
  {
    "id": "m0-q4",
    "question": "What must you complete before taking the final exam?",
    "options": ["Only the videos", "Only the quizzes", "All 23 modules", "Just the Green Tier"],
    "correct": "All 23 modules",
    "explanation": "You must complete all 23 training modules before you are eligible to take the final certification exam.",
    "topic": "Certification Requirements",
    "difficulty": "easy"
  },
  {
    "id": "m0-q5",
    "question": "According to COMAR 14.17.05, what is the primary role of a Registered Dispensary Agent?",
    "options": [
      "To prescribe medical cannabis",
      "To ensure safe, legal, and compliant dispensary operations",
      "To grow cannabis plants",
      "To deliver cannabis to patients homes"
    ],
    "correct": "To ensure safe, legal, and compliant dispensary operations",
    "explanation": "Registered Dispensary Agents are responsible for ensuring all dispensary operations comply with Maryland state laws and COMAR regulations, providing safe access to cannabis products for qualified patients and customers.",
    "topic": "Professional Role",
    "comarRef": "COMAR 14.17.05",
    "difficulty": "medium"
  }
]'::jsonb
WHERE module_number = 0 
AND course_id = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b';