-- Add remaining modules 6-18 and enhance profiles table
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
);

-- Add modules 11-18
INSERT INTO public.course_modules (
  course_id, 
  module_number, 
  title, 
  description, 
  content, 
  quiz_questions,
  is_active
) 
SELECT 
  'e6841a2f-4e92-47c3-9ed4-243ccc22338b',
  s.i,
  CASE 
    WHEN s.i = 11 THEN 'Cannabis Cultivation Basics'
    WHEN s.i = 12 THEN 'Product Packaging and Labeling'
    WHEN s.i = 13 THEN 'Handling Cash and Banking'
    WHEN s.i = 14 THEN 'Age Verification and ID Checking'
    WHEN s.i = 15 THEN 'Record Keeping and Documentation'
    WHEN s.i = 16 THEN 'Transportation and Delivery'
    WHEN s.i = 17 THEN 'Waste Disposal and Management'
    WHEN s.i = 18 THEN 'Final Review and Best Practices'
  END,
  'Advanced training module covering specialized topics in cannabis retail and compliance.',
  'This module covers advanced topics relevant to Maryland cannabis retail operations, including specialized compliance requirements and professional development.',
  '[{"question": "What is a key requirement for module ' || s.i || '?", "options": ["Compliance", "Safety", "Quality", "All of the above"], "correct": "All of the above", "explanation": "All aspects are important for cannabis retail operations."}]'::jsonb,
  true
FROM generate_series(11, 18) AS s(i);

-- Update profiles table to include additional fields for enhanced profile management
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'Maryland';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;