-- Insert all 18 Vimeo training videos into video_assets table
INSERT INTO video_assets (asset_key, storage_path, public_url, title, description, is_active) VALUES
('section_1_laws', 'vimeo/1073070281', 'https://player.vimeo.com/video/1073070281', 'Section 1: Legal and Regulatory Foundations', 'Federal and State Cannabis Laws - Legal framework, Controlled Substances Act, Maryland possession limits', true),
('section_2_sops', 'vimeo/1073072061', 'https://player.vimeo.com/video/1073072061', 'Section 2: Operational and Safety Procedures', 'Standard Operating Procedures - SOPs for dispensary operations per Maryland regulations', true),
('section_3_inventory', 'vimeo/1073072073', 'https://player.vimeo.com/video/1073072073', 'Section 3: Cannabis Pharmacology and Therapeutics', 'Inventory Management - Inventory tracking and reconciliation requirements', true),
('section_4_sales', 'vimeo/1073072091', 'https://player.vimeo.com/video/1073072091', 'Section 4: Substance Use and Customer Safety', 'Sales Procedures - Compliant sales practices for cannabis products', true),
('section_5_safety', 'vimeo/1073072103', 'https://player.vimeo.com/video/1073072103', 'Section 5: Responsible Vendor Training Program', 'Safety Protocols - Safety measures for dispensary operations', true),
('section_6_health', 'vimeo/1096133759', 'https://player.vimeo.com/video/1096133759', 'Section 6: Health Considerations', 'Health Considerations - Health-related regulations for cannabis use', true),
('section_7_records', 'vimeo/1096134152', 'https://player.vimeo.com/video/1096134152', 'Section 7: Mastering Record Keeping', 'Record Keeping - Record retention and documentation rules', true),
('section_8_security', 'vimeo/1096134435', 'https://player.vimeo.com/video/1096134435', 'Section 8: Mastering Dispensary Security', 'Security Measures - Security requirements for dispensaries', true),
('section_9_compliance', 'vimeo/1096134709', 'https://player.vimeo.com/video/1096134709', 'Section 9: Mastering Compliance Audits', 'Compliance Audits - Audit and inspection processes', true),
('section_10_packaging', 'vimeo/1096135200', 'https://player.vimeo.com/video/1096135200', 'Section 10: Cannabis Packaging Laws', 'Packaging Requirements - Packaging standards for cannabis products', true),
('section_11_labeling', 'vimeo/1096135626', 'https://player.vimeo.com/video/1096135626', 'Section 11: Cannabis Labeling Standards', 'Labeling Standards - Labeling requirements for cannabis', true),
('section_12_transport', 'vimeo/1096136076', 'https://player.vimeo.com/video/1096136076', 'Section 12: Cannabis Transport Rules', 'Transportation Rules - Rules for transporting cannabis products', true),
('section_13_waste', 'vimeo/1096136520', 'https://player.vimeo.com/video/1096136520', 'Section 13: Cannabis Waste Management', 'Waste Management - Proper cannabis waste disposal methods', true),
('section_14_testing', 'vimeo/1096137849', 'https://player.vimeo.com/video/1096137849', 'Section 14: Cannabis Product Testing', 'Product Testing - Testing requirements for cannabis', true),
('section_15_customer_ed', 'vimeo/1096138533', 'https://player.vimeo.com/video/1096138533', 'Section 15: Customer Education', 'Customer Education - How to educate customers on cannabis use', true),
('section_16_emergencies', 'vimeo/1096142296', 'https://player.vimeo.com/video/1096142296', 'Section 16: Emergency Procedures', 'Emergency Procedures - Protocols for emergencies in dispensaries', true),
('section_17_training', 'vimeo/1096140061', 'https://player.vimeo.com/video/1096140061', 'Section 17: Staff Training Essentials', 'Staff Training - Training requirements for dispensary staff', true),
('section_18_ethics', 'vimeo/1096145464', 'https://player.vimeo.com/video/1096145464', 'Section 18: Ethical Practices', 'Ethical Practices - Ethical standards for cannabis dispensaries', true);

-- Update all course_modules with appropriate video URLs
UPDATE course_modules SET video_url = 'https://player.vimeo.com/video/1073070281' WHERE module_number = 1;
UPDATE course_modules SET video_url = 'https://player.vimeo.com/video/1096133759' WHERE module_number = 2;
UPDATE course_modules SET video_url = 'https://player.vimeo.com/video/1073072103' WHERE module_number = 3;
UPDATE course_modules SET video_url = 'https://player.vimeo.com/video/1073072073' WHERE module_number = 4;
UPDATE course_modules SET video_url = 'https://player.vimeo.com/video/1096138533' WHERE module_number = 5;
UPDATE course_modules SET video_url = 'https://player.vimeo.com/video/1096134435' WHERE module_number = 6;
UPDATE course_modules SET video_url = 'https://player.vimeo.com/video/1096137849' WHERE module_number = 7;
UPDATE course_modules SET video_url = 'https://player.vimeo.com/video/1073072091' WHERE module_number = 8;
UPDATE course_modules SET video_url = 'https://player.vimeo.com/video/1073072091' WHERE module_number = 9;
UPDATE course_modules SET video_url = 'https://player.vimeo.com/video/1096133759' WHERE module_number = 10;
UPDATE course_modules SET video_url = 'https://player.vimeo.com/video/1073072103' WHERE module_number = 11;
UPDATE course_modules SET video_url = 'https://player.vimeo.com/video/1096135200' WHERE module_number = 12;
UPDATE course_modules SET video_url = 'https://player.vimeo.com/video/1096134152' WHERE module_number = 13;
UPDATE course_modules SET video_url = 'https://player.vimeo.com/video/1073072091' WHERE module_number = 14;
UPDATE course_modules SET video_url = 'https://player.vimeo.com/video/1073072061' WHERE module_number = 15;
UPDATE course_modules SET video_url = 'https://player.vimeo.com/video/1096136076' WHERE module_number = 16;
UPDATE course_modules SET video_url = 'https://player.vimeo.com/video/1096136520' WHERE module_number = 17;
UPDATE course_modules SET video_url = 'https://player.vimeo.com/video/1096145464' WHERE module_number = 18;
UPDATE course_modules SET video_url = 'https://player.vimeo.com/video/1096134709' WHERE module_number = 19;
UPDATE course_modules SET video_url = 'https://player.vimeo.com/video/1096134709' WHERE module_number = 20;
UPDATE course_modules SET video_url = 'https://player.vimeo.com/video/1096140061' WHERE module_number = 21;
UPDATE course_modules SET video_url = 'https://player.vimeo.com/video/1096142296' WHERE module_number = 22;
UPDATE course_modules SET video_url = 'https://player.vimeo.com/video/1096135626' WHERE module_number = 23;