-- Delete any existing test records first
DELETE FROM public.regulatory_content 
WHERE section_number LIKE '14.17.05.%';

-- Insert fresh COMAR 14.17.05 sections with all required NOT NULL fields
INSERT INTO public.regulatory_content (
  section_number,
  section_title,
  content_text,
  plain_language_summary,
  compliance_tips,
  change_impact_level,
  last_modified_at,
  last_mca_review_date,
  source_url,
  version_hash
) VALUES 
(
  '14.17.05.01',
  'Scope and Purpose',
  'This regulation establishes the requirements for licensed cannabis dispensary agents in Maryland, including training, certification, and ongoing compliance obligations.',
  'Defines who must complete dispensary agent training and what the training must cover.',
  '["All staff handling cannabis products must be trained", "Training must be completed before serving customers", "Recertification required annually"]'::jsonb,
  'major',
  NOW(),
  NOW(),
  'https://dsd.maryland.gov/regulations/Pages/14.17.aspx',
  md5('14.17.05.01-scope-2024')
),
(
  '14.17.05.02',
  'Definitions',
  'Key terms including dispensary agent, qualifying patient, caregiver, cannabis product, and responsible vendor training as used throughout COMAR 14.17.',
  'Explains the official meaning of key terms used in cannabis regulations.',
  '["Understand the difference between patient and adult-use customers", "Know what qualifies as a cannabis product under Maryland law"]'::jsonb,
  'moderate',
  NOW(),
  NOW(),
  'https://dsd.maryland.gov/regulations/Pages/14.17.aspx',
  md5('14.17.05.02-definitions-2024')
),
(
  '14.17.05.03',
  'Agent Registration Requirements',
  'All dispensary agents must register with the Maryland Cannabis Administration, submit to background checks, and maintain valid registration while employed.',
  'Every person working at a dispensary must be registered with the state and pass a background check.',
  '["Complete registration before first day of work", "Keep registration current - do not let it lapse", "Report any changes in personal information within 10 days"]'::jsonb,
  'critical',
  NOW(),
  NOW(),
  'https://dsd.maryland.gov/regulations/Pages/14.17.aspx',
  md5('14.17.05.03-registration-2024')
),
(
  '14.17.05.04',
  'Training Requirements',
  'Dispensary agents must complete MCA-approved responsible vendor training covering product knowledge, customer safety, regulatory compliance, ID verification, and security protocols.',
  'Training covers everything you need to safely and legally serve cannabis customers.',
  '["Training must be from an MCA-approved provider", "Keep your certificate accessible", "Training expires after 12 months"]'::jsonb,
  'critical',
  NOW(),
  NOW(),
  'https://dsd.maryland.gov/regulations/Pages/14.17.aspx',
  md5('14.17.05.04-training-2024')
),
(
  '14.17.05.05',
  'Customer Identification and Verification',
  'Agents must verify the identity and age of every customer using valid government-issued identification. Adults must be 21+ for recreational sales.',
  'Check ID for every customer, every time. Adults must be 21 or older for recreational cannabis.',
  '["Accept only valid, non-expired government IDs", "Know how to spot fake IDs", "When in doubt, refuse the sale"]'::jsonb,
  'critical',
  NOW(),
  NOW(),
  'https://dsd.maryland.gov/regulations/Pages/14.17.aspx',
  md5('14.17.05.05-verification-2024')
),
(
  '14.17.05.06',
  'Product Knowledge and Safety',
  'Agents must understand cannabis products, proper storage, dosing guidance, and safety precautions to provide accurate information to customers.',
  'Know your products well enough to help customers make safe, informed choices.',
  '["Never make medical claims", "Always recommend starting with low doses", "Know product storage requirements"]'::jsonb,
  'major',
  NOW(),
  NOW(),
  'https://dsd.maryland.gov/regulations/Pages/14.17.aspx',
  md5('14.17.05.06-product-2024')
),
(
  '14.17.05.07',
  'Security and Diversion Prevention',
  'Agents must follow security protocols to prevent theft, diversion, and unauthorized access to cannabis products.',
  'Follow all security rules to keep products safe and prevent theft.',
  '["Never leave products unattended", "Report suspicious activity immediately", "Follow cash handling procedures exactly"]'::jsonb,
  'critical',
  NOW(),
  NOW(),
  'https://dsd.maryland.gov/regulations/Pages/14.17.aspx',
  md5('14.17.05.07-security-2024')
),
(
  '14.17.05.08',
  'Record Keeping and Compliance',
  'Dispensaries must maintain accurate records of all transactions, inventory, and compliance activities as required by the MCA.',
  'Keep accurate records of everything - sales, inventory, and compliance activities.',
  '["Record every transaction in the tracking system", "Daily inventory counts are required", "Keep records for the required retention period"]'::jsonb,
  'major',
  NOW(),
  NOW(),
  'https://dsd.maryland.gov/regulations/Pages/14.17.aspx',
  md5('14.17.05.08-records-2024')
);