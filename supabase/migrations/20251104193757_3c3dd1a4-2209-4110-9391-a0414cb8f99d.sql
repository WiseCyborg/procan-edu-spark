-- Sprint 1: Add COMAR compliance fields and update critical modules

-- Add new columns for COMAR compliance tracking
ALTER TABLE public.course_modules 
ADD COLUMN IF NOT EXISTS comar_reference TEXT,
ADD COLUMN IF NOT EXISTS learning_objectives JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER DEFAULT 15;

-- Update Module 6: Security and Safety - Add Drug-Free Workplace Policy (COMAR 21.11.08.03)
UPDATE public.course_modules
SET 
  title = 'Security, Safety, and Drug-Free Workplace',
  description = 'Maintaining security and safety in cannabis dispensaries, including Maryland Drug-Free Workplace requirements',
  comar_reference = 'COMAR 14.17.05.02(A)(9); COMAR 21.11.08.03',
  learning_objectives = '[
    "Understand security protocols for cannabis dispensaries",
    "Implement emergency response procedures",
    "Comply with Maryland Drug-Free Workplace Policy (COMAR 21.11.08.03)",
    "Recognize signs of substance abuse in the workplace",
    "Maintain a safe and compliant work environment"
  ]'::jsonb,
  estimated_minutes = 20
WHERE module_number = 6;

-- Update Module 12: Packaging and Labeling - Add Diversion Prevention
UPDATE public.course_modules
SET 
  title = 'Product Packaging, Labeling, and Diversion Prevention',
  description = 'Understanding packaging and labeling requirements, plus detection and prevention of cannabis diversion',
  comar_reference = 'COMAR 14.17.05.02(A)(12)',
  learning_objectives = '[
    "Apply proper packaging and labeling standards",
    "Identify signs of potential diversion",
    "Implement diversion prevention protocols",
    "Report suspicious activities appropriately",
    "Maintain chain of custody documentation"
  ]'::jsonb,
  estimated_minutes = 25
WHERE module_number = 12;

-- Update Module 15: SOPs and Record Keeping
UPDATE public.course_modules
SET 
  title = 'Standard Operating Procedures and Record Keeping',
  description = 'Comprehensive SOPs for dispensary operations and maintaining proper business records',
  comar_reference = 'COMAR 14.17.05.02(A)(10)',
  learning_objectives = '[
    "Follow standard operating procedures for all dispensary operations",
    "Maintain accurate business records",
    "Comply with documentation requirements",
    "Execute proper record retention procedures",
    "Conduct internal audits and quality checks"
  ]'::jsonb,
  estimated_minutes = 20
WHERE module_number = 15;

-- Update all other modules with COMAR references
UPDATE public.course_modules SET comar_reference = 'COMAR 14.17.05.02(A)(1)', estimated_minutes = 15 WHERE module_number = 1;
UPDATE public.course_modules SET comar_reference = 'COMAR 14.17.05.02(A)(2)', estimated_minutes = 20 WHERE module_number = 2;
UPDATE public.course_modules SET comar_reference = 'COMAR 14.17.05.02(A)(3)', estimated_minutes = 18 WHERE module_number = 3;
UPDATE public.course_modules SET comar_reference = 'COMAR 14.17.05.02(A)(4)', estimated_minutes = 15 WHERE module_number = 4;
UPDATE public.course_modules SET comar_reference = 'COMAR 14.17.05.02(A)(5)', estimated_minutes = 12 WHERE module_number = 5;
UPDATE public.course_modules SET comar_reference = 'COMAR 14.17.05.02(A)(6)', estimated_minutes = 20 WHERE module_number = 7;
UPDATE public.course_modules SET comar_reference = 'COMAR 14.17.05.02(A)(7)', estimated_minutes = 22 WHERE module_number = 8;
UPDATE public.course_modules SET comar_reference = 'COMAR 14.17.05.02(A)(8)', estimated_minutes = 18 WHERE module_number = 9;
UPDATE public.course_modules SET comar_reference = 'COMAR 14.17.05.02(A)(11)', estimated_minutes = 15 WHERE module_number = 10;
UPDATE public.course_modules SET comar_reference = 'COMAR 14.17.05.02(A)(13)', estimated_minutes = 16 WHERE module_number = 11;
UPDATE public.course_modules SET comar_reference = 'COMAR 14.17.05.02(A)(14)', estimated_minutes = 15 WHERE module_number = 13;
UPDATE public.course_modules SET comar_reference = 'COMAR 14.17.05.02(A)(15)', estimated_minutes = 20 WHERE module_number = 14;
UPDATE public.course_modules SET comar_reference = 'COMAR 14.17.05.02(A)(16)', estimated_minutes = 12 WHERE module_number = 16;
UPDATE public.course_modules SET comar_reference = 'COMAR 14.17.05.02(B)', estimated_minutes = 10 WHERE module_number = 17;
UPDATE public.course_modules SET comar_reference = 'COMAR 14.17.05.02(C)', estimated_minutes = 30 WHERE module_number = 18;

-- Create index for COMAR reference lookups
CREATE INDEX IF NOT EXISTS idx_course_modules_comar ON public.course_modules(comar_reference);

COMMENT ON COLUMN public.course_modules.comar_reference IS 'Maryland COMAR regulation reference(s) that this module satisfies';
COMMENT ON COLUMN public.course_modules.learning_objectives IS 'Array of learning objectives for this module';
COMMENT ON COLUMN public.course_modules.estimated_minutes IS 'Estimated completion time in minutes';