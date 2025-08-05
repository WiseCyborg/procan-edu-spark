-- Add remaining modules 6-18 with fixed JSON
INSERT INTO public.course_modules (
  course_id, 
  module_number, 
  title, 
  description, 
  content, 
  quiz_questions,
  is_active
) VALUES 
(
  'e6841a2f-4e92-47c3-9ed4-243ccc22338b',
  6,
  'Security and Safety Protocols',
  'Maintaining security and safety in cannabis dispensaries',
  'This module covers security requirements, safety protocols, and emergency procedures for cannabis retail operations.',
  '[{"question": "What is required for dispensary security systems?", "options": ["Cameras only", "Alarms only", "Both cameras and alarms", "None"], "correct": "Both cameras and alarms", "explanation": "Dispensaries must have comprehensive security systems including cameras and alarms."}]'::jsonb,
  true
),
(
  'e6841a2f-4e92-47c3-9ed4-243ccc22338b',
  7,
  'Laboratory Testing and Quality Control',
  'Understanding cannabis testing and quality assurance',
  'Learn about mandatory testing requirements, quality control measures, and lab result interpretation.',
  '[{"question": "What contaminants must cannabis be tested for in Maryland?", "options": ["Pesticides only", "Heavy metals only", "Pesticides and heavy metals", "None"], "correct": "Pesticides and heavy metals", "explanation": "Maryland requires testing for pesticides, heavy metals, and other contaminants."}]'::jsonb,
  true
),
(
  'e6841a2f-4e92-47c3-9ed4-243ccc22338b',
  8,
  'Dosage Guidelines and Patient Consultation',
  'Providing proper dosage guidance to patients',
  'Learn how to guide patients on proper dosage, product selection, and consumption methods.',
  '[{"question": "What should you advise a new patient about dosing?", "options": ["Start high", "Start low and go slow", "Maximum dose immediately", "No guidance needed"], "correct": "Start low and go slow", "explanation": "New patients should always start with low doses and increase gradually."}]'::jsonb,
  true
),
(
  'e6841a2f-4e92-47c3-9ed4-243ccc22338b',
  9,
  'Point of Sale Systems and Transactions',
  'Managing dispensary transactions and POS systems',
  'Understanding POS requirements, transaction recording, and compliance with sales regulations.',
  '[{"question": "What information must be recorded for each sale?", "options": ["Product only", "Patient ID only", "Product and patient ID", "Nothing"], "correct": "Product and patient ID", "explanation": "All sales must record product details and patient identification."}]'::jsonb,
  true
),
(
  'e6841a2f-4e92-47c3-9ed4-243ccc22338b',
  10,
  'Medical Cannabis and Drug Interactions',
  'Understanding potential drug interactions with cannabis',
  'Learn about potential interactions between cannabis and other medications.',
  '[{"question": "Should patients consult their doctor about cannabis and other medications?", "options": ["Never", "Sometimes", "Always", "Only for certain medications"], "correct": "Always", "explanation": "Patients should always consult healthcare providers about potential drug interactions."}]'::jsonb,
  true
),
(
  'e6841a2f-4e92-47c3-9ed4-243ccc22338b',
  11,
  'Cannabis Cultivation Basics',
  'Understanding cannabis cultivation fundamentals',
  'Learn about cultivation methods, plant biology, and growing regulations.',
  '[{"question": "What is required for legal cannabis cultivation in Maryland?", "options": ["No license needed", "Medical license only", "Commercial license", "Personal use allowed"], "correct": "Commercial license", "explanation": "Only licensed commercial cultivators can grow cannabis in Maryland."}]'::jsonb,
  true
),
(
  'e6841a2f-4e92-47c3-9ed4-243ccc22338b',
  12,
  'Product Packaging and Labeling',
  'Understanding packaging and labeling requirements',
  'Learn about mandatory labeling requirements, child-resistant packaging, and compliance standards.',
  '[{"question": "What must be included on cannabis product labels?", "options": ["THC content only", "CBD content only", "THC and CBD content", "Nothing required"], "correct": "THC and CBD content", "explanation": "Labels must include both THC and CBD content along with other required information."}]'::jsonb,
  true
),
(
  'e6841a2f-4e92-47c3-9ed4-243ccc22338b',
  13,
  'Handling Cash and Banking',
  'Financial management in cannabis retail',
  'Understanding banking challenges, cash handling procedures, and financial compliance.',
  '[{"question": "Why do cannabis businesses often operate cash-only?", "options": ["Customer preference", "Banking restrictions", "Government requirement", "Lower costs"], "correct": "Banking restrictions", "explanation": "Many banks avoid cannabis businesses due to federal regulations."}]'::jsonb,
  true
),
(
  'e6841a2f-4e92-47c3-9ed4-243ccc22338b',
  14,
  'Age Verification and ID Checking',
  'Proper age verification procedures',
  'Learn proper ID checking procedures, acceptable identification, and age verification requirements.',
  '[{"question": "What is the minimum age for medical cannabis patients in Maryland?", "options": ["18 years", "21 years", "Any age with guardian", "16 years"], "correct": "Any age with guardian", "explanation": "Minors can be medical cannabis patients with proper guardian consent and certification."}]'::jsonb,
  true
),
(
  'e6841a2f-4e92-47c3-9ed4-243ccc22338b',
  15,
  'Record Keeping and Documentation',
  'Maintaining proper business records',
  'Understanding record keeping requirements, documentation standards, and audit preparedness.',
  '[{"question": "How long must dispensaries keep sales records?", "options": ["1 year", "3 years", "5 years", "Forever"], "correct": "3 years", "explanation": "Maryland requires dispensaries to maintain sales records for at least 3 years."}]'::jsonb,
  true
),
(
  'e6841a2f-4e92-47c3-9ed4-243ccc22338b',
  16,
  'Transportation and Delivery',
  'Cannabis transportation and delivery regulations',
  'Learn about transportation requirements, delivery protocols, and vehicle security standards.',
  '[{"question": "Are cannabis delivery services legal in Maryland?", "options": ["Yes, always", "No, never", "Yes, with proper licensing", "Only for medical"], "correct": "Yes, with proper licensing", "explanation": "Licensed dispensaries can provide delivery services with proper authorization."}]'::jsonb,
  true
),
(
  'e6841a2f-4e92-47c3-9ed4-243ccc22338b',
  17,
  'Waste Disposal and Management',
  'Proper cannabis waste disposal procedures',
  'Understanding waste disposal requirements, environmental considerations, and compliance protocols.',
  '[{"question": "How must cannabis waste be disposed of?", "options": ["Regular trash", "Special waste procedures", "Burning", "Composting"], "correct": "Special waste procedures", "explanation": "Cannabis waste must be rendered unusable and disposed of according to specific state regulations."}]'::jsonb,
  true
),
(
  'e6841a2f-4e92-47c3-9ed4-243ccc22338b',
  18,
  'Final Review and Best Practices',
  'Comprehensive review of all training topics',
  'Final review of all course materials, best practices summary, and exam preparation.',
  '[{"question": "What is the most important aspect of responsible cannabis retail?", "options": ["Profit maximization", "Patient safety and compliance", "Fast service", "Product variety"], "correct": "Patient safety and compliance", "explanation": "Patient safety and regulatory compliance are the most important aspects of responsible cannabis retail."}]'::jsonb,
  true
);

-- Update profiles table to include additional fields for enhanced profile management
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'Maryland';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;