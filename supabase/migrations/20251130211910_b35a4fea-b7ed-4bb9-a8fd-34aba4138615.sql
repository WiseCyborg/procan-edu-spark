-- Expand Module 22 content to 2,500+ characters for launch readiness
UPDATE course_modules 
SET content = '# Incident Documentation & Investigation

## Introduction

Proper documentation and investigation of incidents is critical for maintaining compliance, improving operations, and protecting your dispensary''s license. This module covers best practices for handling various types of incidents in accordance with COMAR 13A.25.06 and related regulations.

## Types of Incidents

### Security Incidents
- Theft or attempted theft
- Unauthorized access
- Security system failures
- Suspicious behavior

### Inventory Incidents
- Inventory discrepancies exceeding allowable variance (COMAR 13A.25.05.02)
- Product damage
- Diversion or loss
- System errors

### Compliance Incidents
- Regulatory violations
- Failed audits
- Patient verification failures
- Documentation errors

### Safety Incidents
- Employee injuries
- Customer accidents
- Hazardous spills
- Equipment malfunctions

## Immediate Response Procedures

### Step 1: Ensure Safety
- Address immediate safety concerns
- Evacuate if necessary
- Secure the scene
- Call emergency services if needed

### Step 2: Contain the Incident
- Stop ongoing violations
- Prevent further damage
- Isolate affected areas
- Preserve evidence

### Step 3: Initial Notification
- Notify supervisor or manager immediately
- Alert security if applicable
- Determine if MCA notification required within 24 hours
- Contact law enforcement for criminal matters

## Documentation Requirements

### Essential Information
- Date and time (with timezone)
- Exact location within facility
- Individuals involved (names, roles)
- Witnesses (contact information)
- Detailed description (who, what, when, where, why, how)
- Immediate actions taken
- Supporting evidence (photos, video timestamps)

### Best Practices
1. Document immediately while details are fresh
2. Be objective - report facts, not opinions
3. Be thorough - include all relevant details
4. Be accurate - verify information
5. Store securely with restricted access

## Investigation Process

### Phase 1: Information Gathering
- Interview witnesses separately
- Review physical evidence
- Examine documentation and logs
- Review video footage (preserve copies)
- Collect supporting materials

### Phase 2: Root Cause Analysis
- Ask the Five Whys to identify underlying causes
- Identify contributing factors (training gaps, system failures)
- Determine responsibility without assigning blame
- Consider environmental and procedural factors

### Phase 3: Corrective Actions
- Address root causes, not just symptoms
- Implement preventive solutions
- Train staff on new procedures
- Monitor effectiveness with follow-up audits

## Real-World Scenario

**Example: Inventory Discrepancy Investigation**

A budtender discovers 3.5 grams of cannabis flower missing during end-of-shift reconciliation. The proper response includes:

1. **Immediate**: Stop all sales, secure inventory area, notify manager
2. **Documentation**: Record exact product (strain, batch), last verified count, time discovered, potential witnesses
3. **Investigation**: Review surveillance footage, interview staff who accessed inventory, check for system errors
4. **Resolution**: Determine if theft, loss, or documentation error; implement corrective measures (additional cameras, dual-verification procedures)
5. **Reporting**: If theft confirmed, notify MCA within 24 hours per COMAR 13A.25.06.03

## Regulatory Reporting

### When to Report to MCA (COMAR 13A.25.06.03)
- Theft or loss of product exceeding reporting thresholds
- Diversion incidents
- Security breaches compromising product security
- Significant discrepancies in inventory tracking

### Reporting Timeline
- Immediate phone notification for urgent matters
- Written report within 24-48 hours as specified
- Follow-up documentation as required by MCA
- Maintain copies for audit purposes (minimum 4 years)

## Common Mistakes to Avoid

1. **Delaying documentation** - Write reports immediately while memory is accurate
2. **Incomplete witness statements** - Get full contact information and detailed accounts
3. **Missing video evidence** - Preserve footage before automatic deletion
4. **Inadequate root cause analysis** - Don''t stop at surface-level explanations
5. **Failure to follow up** - Verify corrective actions were effective

## Conclusion

Thorough incident documentation and investigation protects your dispensary by identifying problems, implementing solutions, and demonstrating due diligence to regulators. Proper procedures minimize repeat incidents, reduce liability, and maintain MCA compliance. Remember: every incident is an opportunity to improve your operations and strengthen your compliance program.',
  updated_at = now()
WHERE module_number = 22;