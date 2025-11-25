-- ===================================================================
-- CRITICAL BLOCKER FIXES FOR PRODUCTION LAUNCH (CORRECTED)
-- ===================================================================
-- This migration addresses 4 critical blockers preventing go-live:
-- 1. Allocate 50 missing seats to Demo Dispensary LLC
-- 2. Generate join code for Demo Dispensary LLC
-- 3. Add substantial content to modules 19-23 (currently empty)
-- ===================================================================

-- ===================================================================
-- BLOCKER #1: Allocate 50 seats to Demo Dispensary LLC
-- ===================================================================
DO $$
DECLARE
  demo_org_id UUID;
  demo_org_name TEXT;
  active_course_id UUID;
  current_seat_count INTEGER;
  seats_needed INTEGER;
  purchase_id UUID;
BEGIN
  -- Get Demo Dispensary LLC organization
  SELECT id, name INTO demo_org_id, demo_org_name
  FROM organizations
  WHERE name ILIKE '%Demo Dispensary%'
  LIMIT 1;

  IF demo_org_id IS NULL THEN
    RAISE NOTICE '❌ Demo Dispensary LLC not found';
    RETURN;
  END IF;

  RAISE NOTICE '📋 Found organization: % (ID: %)', demo_org_name, demo_org_id;

  -- Count current seats
  SELECT COUNT(*) INTO current_seat_count
  FROM rvt_seats
  WHERE organization_id = demo_org_id;

  RAISE NOTICE '🪑 Current seats: %', current_seat_count;

  -- Calculate seats needed (should have 50 total)
  seats_needed := 50 - current_seat_count;

  IF seats_needed <= 0 THEN
    RAISE NOTICE '✅ Demo Dispensary already has sufficient seats';
  ELSE
    RAISE NOTICE '🔧 Creating % new seats...', seats_needed;

    -- Get active course
    SELECT id INTO active_course_id
    FROM courses
    WHERE is_active = true
    LIMIT 1;

    IF active_course_id IS NULL THEN
      RAISE EXCEPTION 'No active course found';
    END IF;

    -- Create purchase record for audit trail
    INSERT INTO rvt_purchases (
      organization_id,
      quantity,
      amount_paid,
      currency,
      payment_method,
      status,
      idempotency_key,
      metadata
    ) VALUES (
      demo_org_id,
      seats_needed,
      0,
      'USD',
      'admin_allocation',
      'paid',
      'BLOCKER-FIX-' || demo_org_id::TEXT || '-' || NOW()::TEXT,
      jsonb_build_object(
        'reason', 'production_blocker_fix',
        'date', NOW(),
        'note', 'Allocated missing seats for Demo Dispensary LLC'
      )
    ) RETURNING id INTO purchase_id;

    -- Create the seats
    INSERT INTO rvt_seats (
      purchase_id,
      organization_id,
      course_id,
      status
    )
    SELECT
      purchase_id,
      demo_org_id,
      active_course_id,
      'available'
    FROM generate_series(1, seats_needed);

    RAISE NOTICE '✅ Created % seats for Demo Dispensary LLC (Purchase ID: %)', seats_needed, purchase_id;
  END IF;
END $$;

-- ===================================================================
-- BLOCKER #2: Generate join code for Demo Dispensary LLC
-- ===================================================================
DO $$
DECLARE
  demo_org_id UUID;
  demo_org_name TEXT;
  existing_code_count INTEGER;
  new_join_code TEXT;
BEGIN
  -- Get Demo Dispensary LLC organization
  SELECT id, name INTO demo_org_id, demo_org_name
  FROM organizations
  WHERE name ILIKE '%Demo Dispensary%'
  LIMIT 1;

  IF demo_org_id IS NULL THEN
    RAISE NOTICE '❌ Demo Dispensary LLC not found';
    RETURN;
  END IF;

  -- Check for existing active join codes
  SELECT COUNT(*) INTO existing_code_count
  FROM rvt_join_codes
  WHERE organization_id = demo_org_id
    AND is_active = true
    AND expires_at > NOW();

  IF existing_code_count > 0 THEN
    RAISE NOTICE '✅ Demo Dispensary already has % active join code(s)', existing_code_count;
    RETURN;
  END IF;

  -- Generate new join code
  new_join_code := 'DEMO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 6));

  -- Insert join code (without course_id since table doesn't have it)
  INSERT INTO rvt_join_codes (
    organization_id,
    code,
    max_uses,
    current_uses,
    expires_at,
    is_active,
    created_by
  ) VALUES (
    demo_org_id,
    new_join_code,
    150, -- Allow plenty of uses
    0,
    NOW() + INTERVAL '365 days',
    true,
    (SELECT id FROM auth.users WHERE email ILIKE '%admin%' LIMIT 1) -- Admin user
  );

  RAISE NOTICE '✅ Created join code for Demo Dispensary LLC: %', new_join_code;
  RAISE NOTICE '📅 Expires: %', TO_CHAR(NOW() + INTERVAL '365 days', 'YYYY-MM-DD');
END $$;

-- ===================================================================
-- BLOCKER #3: Add content to modules 19-23
-- ===================================================================

-- Module 19: Supervising Compliance Operations
UPDATE course_modules
SET 
  content = E'# Supervising Compliance Operations\n\n## Overview\n\nAs a supervisor, you are responsible for ensuring that your team adheres to all Maryland Cannabis Administration (MCA) regulations. This module covers the essential skills and knowledge needed to effectively supervise compliance operations in a cannabis dispensary.\n\n## Key Responsibilities\n\n### 1. Team Oversight\n- Monitor daily operations to ensure compliance with all regulations\n- Conduct regular audits of employee activities and documentation\n- Identify and address compliance gaps proactively\n- Implement corrective actions when violations occur\n\n### 2. Training and Development\n- Ensure all team members complete required training\n- Provide ongoing education on regulatory updates\n- Conduct refresher training sessions\n- Document all training activities\n\n### 3. Documentation Management\n- Oversee proper record-keeping practices\n- Verify accuracy of inventory tracking\n- Maintain patient verification records\n- Ensure secure storage of sensitive information\n\n### 4. Quality Assurance\n- Implement standard operating procedures (SOPs)\n- Conduct regular quality checks\n- Address product quality concerns\n- Maintain communication with cultivation and processing teams\n\n## Regulatory Framework\n\n### COMAR Requirements for Supervisors\nUnder COMAR 10.62.21, supervisors must:\n- Be at least 21 years of age\n- Complete required training within 90 days of hire\n- Maintain current knowledge of state regulations\n- Report violations to management immediately\n\n### Inspection Preparedness\n- Maintain inspection-ready facilities at all times\n- Keep all required documentation easily accessible\n- Train staff on proper conduct during inspections\n- Address inspector findings promptly\n\n## Best Practices\n\n1. **Daily Compliance Checks**: Start each shift with a compliance checklist\n2. **Open Communication**: Foster an environment where staff feel comfortable reporting concerns\n3. **Lead by Example**: Demonstrate proper compliance behaviors\n4. **Stay Informed**: Subscribe to MCA updates and industry newsletters\n5. **Document Everything**: Maintain detailed records of all compliance activities\n\n## Common Challenges and Solutions\n\n### Challenge: High Staff Turnover\n**Solution**: Implement comprehensive onboarding and mentorship programs\n\n### Challenge: Keeping Up with Regulatory Changes\n**Solution**: Designate time each week for regulatory review and team updates\n\n### Challenge: Balancing Customer Service with Compliance\n**Solution**: Train staff that compliance IS customer service - it protects everyone\n\n## Conclusion\n\nEffective supervision of compliance operations requires vigilance, knowledge, and leadership. By maintaining high standards and fostering a culture of compliance, you protect your organization, your team, and the patients you serve.',
  updated_at = NOW()
WHERE module_number = 19;

-- Module 20: Compliance Oversight & Regulatory Reporting
UPDATE course_modules
SET 
  content = E'# Compliance Oversight & Regulatory Reporting\n\n## Introduction\n\nRegulatory reporting is a critical component of cannabis dispensary operations in Maryland. This module covers the systems, processes, and best practices for maintaining compliance oversight and fulfilling reporting obligations to the Maryland Cannabis Administration (MCA).\n\n## Maryland''s Regulatory Reporting Requirements\n\n### Inventory Tracking System (Metrc)\nMaryland uses Metrc as the official seed-to-sale tracking system:\n- All inventory movements must be reported within 24 hours\n- Daily reconciliation of physical inventory with Metrc records\n- Proper tagging of all cannabis products\n- Accurate recording of sales transactions\n\n### Required Reports\n\n#### Daily Reports\n- Sales transactions\n- Inventory adjustments\n- Product transfers\n- Waste disposal\n\n#### Monthly Reports\n- Inventory reconciliation\n- Employee roster updates\n- Security incident reports\n- Diversion prevention activities\n\n#### Annual Reports\n- Comprehensive business operations review\n- Financial disclosures\n- Security system certifications\n- Training completion records\n\n## Compliance Oversight Framework\n\n### 1. Internal Audit Schedule\n\n**Weekly Audits:**\n- Cash handling procedures\n- Patient verification processes\n- Inventory accuracy checks\n- Security system functionality\n\n**Monthly Audits:**\n- Comprehensive inventory reconciliation\n- Employee compliance with SOPs\n- Documentation completeness review\n- Vendor compliance verification\n\n**Quarterly Audits:**\n- Full facility inspection\n- Security system assessment\n- Training records review\n- Financial controls audit\n\n### 2. Documentation Standards\n\n**Essential Records to Maintain:**\n- Patient registration documents (3 years)\n- Sales receipts (3 years)\n- Inventory records (3 years)\n- Employee files (including training records)\n- Security footage (30-60 days minimum)\n- Incident reports (3 years)\n- Inspection reports and responses\n\n### 3. Corrective Action Procedures\n\nWhen compliance issues are identified:\n\n1. **Immediate Response**\n   - Stop the non-compliant activity\n   - Document the issue thoroughly\n   - Notify management\n\n2. **Root Cause Analysis**\n   - Investigate how the issue occurred\n   - Identify contributing factors\n   - Determine if it''s an isolated incident or systemic problem\n\n3. **Implementation of Corrections**\n   - Develop corrective action plan\n   - Implement necessary changes\n   - Train staff on new procedures\n\n4. **Verification and Follow-up**\n   - Monitor effectiveness of corrections\n   - Document resolution\n   - Prevent recurrence\n\n## Technology and Systems\n\n### Metrc Integration\n- Ensure POS system integrates seamlessly with Metrc\n- Daily verification of data synchronization\n- Address integration errors immediately\n- Maintain backup procedures for system outages\n\n### Data Security\n- Implement role-based access controls\n- Regular password updates\n- Encrypted data storage and transmission\n- Regular system backups\n\n## Regulatory Inspections\n\n### Preparation\n- Maintain inspection-ready status daily\n- Keep all required documentation organized and accessible\n- Ensure staff knows their roles during inspections\n- Conduct mock inspections quarterly\n\n### During Inspection\n- Cooperate fully with inspectors\n- Provide requested documents promptly\n- Take notes on inspector observations\n- Ask for clarification when needed\n\n### Post-Inspection\n- Address all findings immediately\n- Submit required response documentation by deadlines\n- Implement corrective actions\n- Document completion of corrections\n\n## Reporting Violations\n\n### Mandatory Reporting Triggers\n- Diversion incidents\n- Security breaches\n- Loss or theft of product\n- Significant inventory discrepancies\n- Employee violations of regulations\n\n### Reporting Timeline\n- Immediate notification (within hours) for serious incidents\n- Written report within 24-48 hours\n- Follow-up as required by MCA\n\n## Conclusion\n\nEffective compliance oversight and regulatory reporting protects your license, maintains public trust, and ensures the safety of Maryland''s medical cannabis program. Diligence in these responsibilities is essential to successful dispensary operations.',
  updated_at = NOW()
WHERE module_number = 20;

-- Module 21: Team Training & Development Coordination
UPDATE course_modules
SET 
  content = E'# Team Training & Development Coordination\n\n## Introduction\n\nAs a training coordinator, you play a vital role in ensuring that all dispensary staff members are knowledgeable, compliant, and prepared to deliver excellent service. This module covers strategies for developing and implementing effective training programs in Maryland cannabis dispensaries.\n\n## Regulatory Training Requirements\n\n### Maryland MCA Requirements\n\nUnder COMAR 10.62.21, all dispensary employees must:\n- Complete required training within 90 days of hire\n- Receive training on Maryland cannabis laws, responsible vendor practices, patient privacy, proper product handling, security procedures, and diversion prevention\n\n### Annual Recertification\n- All employees must complete refresher training annually\n- Training must cover regulatory updates\n- Completion must be documented and reported to MCA\n\n## Developing a Training Program\n\n### Needs Assessment\n\n1. **Identify Knowledge Gaps**\n   - Conduct skills assessments\n   - Review performance metrics\n   - Analyze compliance audit findings\n   - Solicit employee feedback\n\n2. **Role-Specific Training Needs**\n   - Patient consultants: Product knowledge, counseling skills\n   - Inventory staff: Metrc system, tracking procedures\n   - Security personnel: Emergency response, incident reporting\n   - Managers: Compliance oversight, team leadership\n\n## Training Delivery Methods\n\n**In-Person Training**\n- Interactive workshops\n- Hands-on demonstrations\n- Role-playing exercises\n- Group discussions\n\n**Online Training**\n- E-learning modules\n- Video tutorials\n- Self-paced courses\n\n**On-the-Job Training**\n- Shadowing experienced staff\n- Mentorship programs\n- Supervised practice\n\n## Measuring Training Effectiveness\n\n### Assessment Methods\n\n1. **Knowledge Tests**\n   - Pre and post-training quizzes\n   - Competency exams\n   - Regulatory knowledge assessments\n\n2. **Skills Evaluations**\n   - Practical demonstrations\n   - Simulated scenarios\n   - Direct observation\n\n3. **Performance Metrics**\n   - Error rates reduction\n   - Compliance audit scores\n   - Customer satisfaction ratings\n\n## Creating a Learning Culture\n\n1. **Make Training Accessible**\n2. **Recognize Achievement**\n3. **Encourage Knowledge Sharing**\n4. **Lead by Example**\n\n## Conclusion\n\nEffective team training and development coordination ensures that your dispensary operates safely, compliantly, and professionally. By investing in your team''s knowledge and skills, you create a foundation for long-term success in Maryland''s medical cannabis industry.',
  updated_at = NOW()
WHERE module_number = 21;

-- Module 22: Incident Documentation & Investigation
UPDATE course_modules
SET 
  content = E'# Incident Documentation & Investigation\n\n## Introduction\n\nProper documentation and investigation of incidents is critical for maintaining compliance, improving operations, and protecting your dispensary''s license. This module covers best practices for handling various types of incidents.\n\n## Types of Incidents\n\n### Security Incidents\n- Theft or attempted theft\n- Unauthorized access\n- Security system failures\n- Suspicious behavior\n\n### Inventory Incidents\n- Inventory discrepancies\n- Product damage\n- Diversion or loss\n- System errors\n\n### Compliance Incidents\n- Regulatory violations\n- Failed audits\n- Patient verification failures\n- Documentation errors\n\n### Safety Incidents\n- Employee injuries\n- Customer accidents\n- Hazardous spills\n- Equipment malfunctions\n\n## Immediate Response Procedures\n\n### Step 1: Ensure Safety\n- Address immediate safety concerns\n- Evacuate if necessary\n- Secure the scene\n- Call emergency services if needed\n\n### Step 2: Contain the Incident\n- Stop ongoing violations\n- Prevent further damage\n- Isolate affected areas\n- Preserve evidence\n\n### Step 3: Initial Notification\n- Notify supervisor or manager\n- Alert security if applicable\n- Determine if MCA notification required\n- Contact law enforcement for criminal matters\n\n## Documentation Requirements\n\n### Essential Information\n- Date and time\n- Location\n- Individuals involved\n- Witnesses\n- Detailed description\n- Immediate actions taken\n\n### Best Practices\n1. Document immediately\n2. Be objective\n3. Be thorough\n4. Be accurate\n5. Store securely\n\n## Investigation Process\n\n### Phase 1: Information Gathering\n- Interview witnesses\n- Review physical evidence\n- Examine documentation\n- Review video footage\n\n### Phase 2: Root Cause Analysis\n- Ask the Five Whys\n- Identify contributing factors\n- Determine responsibility\n\n### Phase 3: Corrective Actions\n- Address root causes\n- Implement solutions\n- Train staff\n- Monitor effectiveness\n\n## Regulatory Reporting\n\n### When to Report to MCA\n- Theft or loss of product\n- Diversion incidents\n- Security breaches\n- Significant discrepancies\n\n### Reporting Timeline\n- Immediate phone notification\n- Written report within 24-48 hours\n- Follow-up as required\n\n## Conclusion\n\nThorough incident documentation and investigation protects your dispensary by identifying problems, implementing solutions, and demonstrating due diligence to regulators.',
  updated_at = NOW()
WHERE module_number = 22;

-- Module 23: Advanced Diversion Prevention Strategies
UPDATE course_modules
SET 
  content = E'# Advanced Diversion Prevention Strategies\n\n## Introduction\n\nDiversion prevention is one of the most critical responsibilities in cannabis dispensary operations. This module covers advanced strategies for identifying, preventing, and responding to diversion attempts.\n\n## Understanding Diversion\n\n### What is Diversion?\n\nDiversion occurs when medical cannabis is redirected outside Maryland''s regulated system:\n- External Diversion: Theft, robbery, fraudulent purchases\n- Internal Diversion: Employee theft or facilitation\n- Patient Diversion: Illegal resale by registered patients\n\n### Why It Matters\n1. Legal consequences (license revocation, fines, charges)\n2. Public safety concerns\n3. Program integrity\n4. Business impact\n\n## Risk Assessment\n\n### High-Risk Scenarios\n\n**Employee-Related:**\n- New employees with limited training\n- Financial hardship situations\n- Access to high-value products\n- Working alone or during closing\n\n**Operational Risks:**\n- Cash-intensive transactions\n- High-value inventory\n- Inadequate security\n- Weak access controls\n\n**Patient-Related:**\n- Unusually large purchases\n- Suspicious identification\n- Coordinated group purchases\n\n## Prevention Strategies\n\n### Physical Security\n- Comprehensive surveillance\n- Access control systems\n- Alarm systems\n- Physical barriers\n- Secure storage\n\n### Operational Controls\n- Daily inventory counts\n- Real-time Metrc integration\n- Transaction monitoring\n- Cash handling procedures\n- Segregation of duties\n\n### Human Resources\n- Pre-employment screening\n- Comprehensive training\n- Culture of compliance\n- Open reporting channels\n\n## Detection and Monitoring\n\n### Red Flags\n\n**Employee Behavior:**\n- Unexplained discrepancies on their shifts\n- Working alone frequently\n- Unusual interest in high-value products\n- Attempts to bypass security\n\n**Patient Behavior:**\n- Maximum quantity purchases\n- Cash-only transactions\n- Suspicious identification\n- Nervousness or evasiveness\n\n### Monitoring Systems\n- Automated alerts\n- Regular audits\n- Data analysis\n- Pattern identification\n\n## Investigation Procedures\n\n### When Diversion is Suspected\n\n1. Initial assessment\n2. Secure evidence\n3. Conduct investigation\n4. Take appropriate action\n5. Report to authorities\n\n## Reporting Requirements\n\n### Mandatory MCA Reporting\n- Confirmed diversion\n- Theft or loss\n- Significant discrepancies\n- Security breaches\n- Employee involvement\n\n## Industry Best Practices\n\n1. Stay informed on trends\n2. Regular security reviews\n3. Employee engagement\n4. Technology integration\n5. Law enforcement partnerships\n\n## Conclusion\n\nAdvanced diversion prevention requires a multi-layered approach combining physical security, operational controls, employee training, and vigilant monitoring. By implementing these strategies, you protect your dispensary, maintain compliance, and contribute to Maryland''s medical cannabis program integrity.',
  updated_at = NOW()
WHERE module_number = 23;

-- ===================================================================
-- VERIFICATION QUERIES
-- ===================================================================

-- Verify Demo Dispensary seat allocation
SELECT 
  o.name,
  o.course_credits,
  COUNT(rs.id) as total_seats,
  COUNT(rs.id) FILTER (WHERE rs.status = 'available') as available_seats,
  COUNT(rs.id) FILTER (WHERE rs.status = 'assigned') as assigned_seats,
  COUNT(rs.id) FILTER (WHERE rs.status = 'used') as used_seats
FROM organizations o
LEFT JOIN rvt_seats rs ON rs.organization_id = o.id
WHERE o.name ILIKE '%Demo Dispensary%'
GROUP BY o.id, o.name, o.course_credits;

-- Verify Demo Dispensary join code
SELECT 
  o.name,
  jc.code,
  jc.max_uses,
  jc.current_uses,
  jc.expires_at,
  jc.is_active
FROM rvt_join_codes jc
JOIN organizations o ON o.id = jc.organization_id
WHERE o.name ILIKE '%Demo Dispensary%'
  AND jc.is_active = true
ORDER BY jc.created_at DESC;

-- Verify module content updates
SELECT 
  module_number,
  title,
  LENGTH(content) as content_length,
  CASE 
    WHEN LENGTH(content) > 500 THEN '✅ Substantial content'
    ELSE '⚠️  Needs more content'
  END as status
FROM course_modules
WHERE module_number BETWEEN 19 AND 23
ORDER BY module_number;