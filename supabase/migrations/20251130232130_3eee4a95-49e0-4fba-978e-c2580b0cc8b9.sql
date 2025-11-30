-- Insert Module 0: Welcome & Platform Orientation
INSERT INTO public.course_modules (
  course_id,
  module_number,
  title,
  description,
  content,
  estimated_minutes,
  stoplight_tier,
  is_active,
  learning_objectives,
  comar_reference
) VALUES (
  'e6841a2f-4e92-47c3-9ed4-243ccc22338b',
  0,
  'Welcome & Platform Orientation',
  'Introduction to the Maryland Cannabis Administration (MCA) Dispensary Agent Training Program and platform navigation.',
  '# Welcome to ProCann MCA Training

Welcome to the **Maryland Cannabis Administration (MCA) Dispensary Agent Training Program**. This comprehensive course is designed to prepare you for your role as a certified Responsible Vendor Trainer (RVT) in Maryland''s regulated cannabis industry.

## What You''ll Learn

**Legal Compliance:** Federal and Maryland cannabis laws, COMAR regulations (14.17.05), and your responsibilities as a dispensary agent.

**Operations & Safety:** Standard operating procedures, METRC tracking, security protocols, cash handling, and emergency response.

**Medical Knowledge:** Cannabis pharmacology, qualifying conditions, patient guidance, and safe consumption practices.

**Customer Service:** Professional communication, needs assessment, product recommendations, and handling difficult situations.

**Quality & Testing:** Lab testing requirements, Certificate of Analysis (COA) interpretation, and quality assurance standards.

## Course Structure

This training consists of **23 comprehensive modules** organized into three tiers:

- **Green Tier (Modules 1-8):** Foundational knowledge - laws, products, and customer service
- **Yellow Tier (Modules 9-16):** Operational excellence - METRC, inventory, security, and compliance
- **Red Tier (Modules 17-23):** Advanced topics - quality assurance, leadership, and specialized protocols

## How to Navigate

Each module includes:

1. **Overview:** Key concepts and learning objectives
2. **Video Content:** Professional instruction (when available)
3. **Documents:** Reference materials, checklists, and regulatory guides
4. **Quiz:** Knowledge checks to reinforce learning

Progress through each section sequentially. You must complete all activities in a section before proceeding to the next.

## Certification Requirements

To earn your **Maryland RVT Certification**, you must:

✓ Complete all 23 training modules
✓ Review all required reference documents
✓ Pass module quizzes with 80% or higher
✓ Pass the final comprehensive exam with 80% or higher

Upon successful completion, you''ll receive a **state-recognized certificate** valid for one year.

## Support & Resources

- **AI Assistant:** Click the voice icon for instant help
- **Technical Support:** Contact support@procannedu.com
- **MCA Regulations:** Access official COMAR documentation throughout the course

## Getting Started

Click **"Continue to Introduction to Maryland Cannabis Laws"** below to begin your journey toward MCA certification.

---

*This training program is aligned with COMAR 14.17.05 requirements and approved by the Maryland Cannabis Administration.*',
  15,
  'green',
  true,
  '["Understand the structure and requirements of the MCA training program", "Navigate the platform and access course materials", "Identify certification requirements and exam standards", "Access support resources and reference documentation"]',
  'COMAR 14.17.05'
) ON CONFLICT (course_id, module_number) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  content = EXCLUDED.content,
  estimated_minutes = EXCLUDED.estimated_minutes,
  stoplight_tier = EXCLUDED.stoplight_tier,
  learning_objectives = EXCLUDED.learning_objectives,
  comar_reference = EXCLUDED.comar_reference;