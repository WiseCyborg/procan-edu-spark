/**
 * Module Document Content System
 * HTML-based document content for all training modules
 * Replaces non-existent PDF files with rich, interactive content
 */

export interface DocumentContent {
  id: string;
  title: string;
  content: string; // HTML content
  lastUpdated: string;
  version: string;
  comarReferences?: string[];
  category: string;
}

export const documentContent: Record<string, DocumentContent> = {
  'md-laws-guide': {
    id: 'md-laws-guide',
    title: 'Maryland Cannabis Laws Guide',
    category: 'Legal & Regulatory',
    version: '2.1',
    lastUpdated: '2025-01-15',
    comarReferences: ['14.17.01', '14.17.15.05', '14.17.08'],
    content: `
      <h2>Maryland Cannabis Legal Framework</h2>
      <p>This comprehensive guide covers all Maryland cannabis laws and regulations that dispensary agents must understand to ensure full compliance with state requirements.</p>
      
      <h3>COMAR 14.17 Overview</h3>
      <p>Maryland legalized adult-use cannabis effective <strong>July 1, 2023</strong>, following voter approval of Question 4 in November 2022. The Maryland Cannabis Administration (MCA) regulates all aspects of the industry under COMAR Title 14, Subtitle 17.</p>
      
      <h3>Key Regulatory Requirements</h3>
      <h4>Age Verification (COMAR 14.17.05.03)</h4>
      <ul>
        <li><strong>Adult-Use:</strong> Customers must be 21 years or older</li>
        <li><strong>Medical:</strong> Valid MMCC registration card required</li>
        <li><strong>ID Requirements:</strong> Valid government-issued photo ID must be checked for every transaction</li>
        <li><strong>Acceptable IDs:</strong> Driver's license, state ID, passport, military ID</li>
      </ul>
      
      <h4>Purchase Limits (COMAR 14.17.05.08)</h4>
      <p><strong>Adult-Use Limits (30 days):</strong></p>
      <ul>
        <li>Flower: 1.5 oz per transaction</li>
        <li>Concentrates: 12 grams</li>
        <li>Edibles: 750mg THC</li>
      </ul>
      
      <p><strong>Medical Limits (30 days):</strong></p>
      <ul>
        <li>Flower: 120 grams (4.2 oz)</li>
        <li>Concentrates: 36 grams</li>
        <li>Edibles: No limit (as prescribed)</li>
      </ul>
    `
  },
  
  'responsible-vendor': {
    id: 'responsible-vendor',
    title: 'Responsible Vendor Certification Guide',
    category: 'Certification',
    version: '2.0',
    lastUpdated: '2025-01-15',
    comarReferences: ['14.17.05.01'],
    content: `
      <h2>Responsible Vendor Training (RVT) Certification</h2>
      <p>All Maryland dispensary agents must complete Responsible Vendor Training and pass a certification exam before selling cannabis products.</p>
      
      <h3>RVT Requirements (COMAR 14.17.05.01)</h3>
      <ul>
        <li>Complete an approved RVT training program (minimum 4 hours)</li>
        <li>Pass a certification exam with a score of 80% or higher</li>
        <li>Renew certification annually</li>
        <li>Maintain proof of current certification at all times while working</li>
      </ul>
      
      <h3>Certification Exam Details</h3>
      <ul>
        <li><strong>Format:</strong> 50 multiple choice questions</li>
        <li><strong>Passing Score:</strong> 40/50 correct (80%)</li>
        <li><strong>Time Limit:</strong> 90 minutes</li>
        <li><strong>Certificate:</strong> Valid for 12 months from issue date</li>
      </ul>
    `
  },
  
  'sop-manual': {
    id: 'sop-manual',
    title: 'Standard Operating Procedures Manual',
    category: 'Operations',
    version: '3.1',
    lastUpdated: '2025-01-15',
    comarReferences: ['14.17.05.02', '14.17.05.06'],
    content: `
      <h2>Standard Operating Procedures (SOPs)</h2>
      <p>Comprehensive daily operational procedures for dispensary staff to ensure compliance, security, and excellent customer service.</p>
      
      <h3>Opening Procedures</h3>
      <h4>Security System Checks (COMAR 14.17.05.06)</h4>
      <ol>
        <li><strong>Alarm System:</strong> Disarm alarm within 60 seconds of entry</li>
        <li><strong>Surveillance:</strong> Verify all cameras are recording</li>
        <li><strong>Access Control:</strong> Test door locks and badge readers</li>
        <li><strong>Safe/Vault:</strong> Verify secure storage is locked</li>
      </ol>
      
      <h3>Customer Transaction Procedures</h3>
      <ol>
        <li>Greet customer professionally</li>
        <li>Verify age with valid government ID</li>
        <li>Assess customer needs through conversation</li>
        <li>Recommend appropriate products</li>
        <li>Record sale in METRC before payment</li>
        <li>Process payment and provide receipt</li>
        <li>Package products in opaque exit bag</li>
      </ol>
    `
  },
  
  'metrc-guide': {
    id: 'metrc-guide',
    title: 'METRC User Guide for Maryland',
    category: 'Operations',
    version: '2.3',
    lastUpdated: '2025-01-15',
    comarReferences: ['14.17.05.09'],
    content: `
      <h2>METRC Track-and-Trace System Guide</h2>
      <p>Maryland uses METRC to track all cannabis from cultivation to sale. Every dispensary agent must understand METRC operations.</p>
      
      <h3>What is METRC?</h3>
      <p>METRC is Maryland's <strong>seed-to-sale tracking system</strong> that tracks every cannabis plant and product, records all inventory movements, and enables MCA regulatory oversight.</p>
      
      <h3>METRC Package Tags</h3>
      <p>Every cannabis product has a unique METRC tag (UID):</p>
      <ul>
        <li><strong>Format:</strong> 1A400000000XXXX (16 characters)</li>
        <li><strong>Location:</strong> Attached to product packaging</li>
        <li><strong>Rule:</strong> Cannot be removed or altered</li>
      </ul>
      
      <h3>Recording Sales in METRC</h3>
      <ol>
        <li>Scan product barcode or enter UID manually</li>
        <li>Verify quantities match customer selection</li>
        <li>Check purchase limits are not exceeded</li>
        <li>Record sale in METRC before payment</li>
        <li>Print receipt from METRC system</li>
      </ol>
    `
  },
  
  'inventory-sop': {
    id: 'inventory-sop',
    title: 'Inventory Management SOPs',
    category: 'Operations',
    version: '1.5',
    lastUpdated: '2025-01-15',
    content: `
      <h2>Inventory Management Procedures</h2>
      <p>Proper inventory control ensures compliance, prevents losses, and maintains product quality.</p>
      
      <h3>Daily Inventory Tasks</h3>
      <ul>
        <li>Run physical inventory count of high-volume products</li>
        <li>Compare physical count to METRC quantities</li>
        <li>Document any discrepancies immediately</li>
        <li>Report variances over 5% to manager</li>
      </ul>
      
      <h3>Receiving Procedures</h3>
      <ol>
        <li>Verify incoming transfer in METRC</li>
        <li>Count all packages and check for damage</li>
        <li>Compare to manifest</li>
        <li>Accept transfer in METRC within 24 hours</li>
      </ol>
    `
  },
  
  'security-protocols': {
    id: 'security-protocols',
    title: 'Security Protocols Checklist',
    category: 'Operations',
    version: '2.0',
    lastUpdated: '2025-01-15',
    content: `
      <h2>Security Protocols</h2>
      <p>Daily security compliance checklist for all dispensary staff.</p>
      
      <h3>Physical Security</h3>
      <ul>
        <li>All entry/exit points secured with locks</li>
        <li>Surveillance cameras recording 24/7</li>
        <li>Product storage areas locked when unattended</li>
        <li>Cash secured in safe when not in use</li>
      </ul>
      
      <h3>Access Control</h3>
      <ul>
        <li>Badge access required for all restricted areas</li>
        <li>Visitor log maintained at all times</li>
        <li>Former employees deactivated within 24 hours</li>
      </ul>
    `
  },
  
  'pharmacology-guide': {
    id: 'pharmacology-guide',
    title: 'Cannabis Pharmacology Guide',
    category: 'Medical',
    version: '1.8',
    lastUpdated: '2025-01-15',
    content: `
      <h2>Cannabis Pharmacology Basics</h2>
      <p>Understanding cannabinoids and their effects on the human body.</p>
      
      <h3>Major Cannabinoids</h3>
      <h4>THC (Tetrahydrocannabinol)</h4>
      <ul>
        <li>Primary psychoactive compound</li>
        <li>Effects: Euphoria, relaxation, altered perception</li>
        <li>Medical uses: Pain relief, appetite stimulation, nausea reduction</li>
      </ul>
      
      <h4>CBD (Cannabidiol)</h4>
      <ul>
        <li>Non-psychoactive compound</li>
        <li>Effects: Relaxation without intoxication</li>
        <li>Medical uses: Anxiety relief, inflammation reduction, seizure control</li>
      </ul>
    `
  },
  
  'medical-program-guide': {
    id: 'medical-program-guide',
    title: 'Maryland Medical Cannabis Program Guide',
    category: 'Medical',
    version: '2.2',
    lastUpdated: '2025-01-15',
    content: `
      <h2>Maryland Medical Cannabis Program</h2>
      <p>Overview of Maryland's medical cannabis program (MMCC) for dispensary agents.</p>
      
      <h3>Patient Registration</h3>
      <ul>
        <li>Patients must have qualifying medical condition</li>
        <li>Physician must certify medical need</li>
        <li>Registration card valid for up to 3 years</li>
        <li>Card must be presented for all purchases</li>
      </ul>
      
      <h3>Medical Benefits</h3>
      <ul>
        <li>Higher purchase limits than adult-use</li>
        <li>No sales tax on medical purchases</li>
        <li>Access to medical-only products</li>
      </ul>
    `
  },
  
  'qualifying-conditions': {
    id: 'qualifying-conditions',
    title: 'Qualifying Conditions Reference',
    category: 'Medical',
    version: '1.3',
    lastUpdated: '2025-01-15',
    content: `
      <h2>Maryland Qualifying Medical Conditions</h2>
      <p>List of conditions that qualify for medical cannabis registration.</p>
      
      <h3>Approved Conditions</h3>
      <ul>
        <li>Chronic or severe pain</li>
        <li>Nausea or severe vomiting</li>
        <li>Cachexia (wasting syndrome)</li>
        <li>Severe or persistent muscle spasms</li>
        <li>Seizures</li>
        <li>Severe anorexia</li>
        <li>Glaucoma</li>
        <li>Post-traumatic stress disorder (PTSD)</li>
      </ul>
    `
  },
  
  'patient-guidance': {
    id: 'patient-guidance',
    title: 'Patient Education Guide',
    category: 'Medical',
    version: '1.6',
    lastUpdated: '2025-01-15',
    content: `
      <h2>Patient Education Resources</h2>
      <p>Guide for educating medical cannabis patients on safe and effective use.</p>
      
      <h3>First-Time Patient Recommendations</h3>
      <ul>
        <li><strong>Start Low:</strong> Begin with lowest THC products</li>
        <li><strong>Go Slow:</strong> Wait 2 hours before increasing dose</li>
        <li><strong>Keep Journal:</strong> Track doses and effects</li>
        <li><strong>Consult Physician:</strong> Discuss with healthcare provider</li>
      </ul>
    `
  },
  
  'product-guide': {
    id: 'product-guide',
    title: 'Cannabis Product Knowledge Reference Guide',
    category: 'Products',
    version: '2.4',
    lastUpdated: '2025-01-15',
    comarReferences: ['14.17.05.01'],
    content: `
      <h2>Comprehensive Cannabis Product Guide</h2>
      <p>Complete reference for cannabis product types, characteristics, and customer recommendations.</p>
      
      <h3>Product Categories</h3>
      <h4>Flower (Bud)</h4>
      <ul>
        <li>Dried cannabis plant material</li>
        <li>Consumed via smoking or vaporization</li>
        <li>Effects: Fast onset (5-15 minutes), duration 2-4 hours</li>
      </ul>
      
      <h4>Concentrates</h4>
      <ul>
        <li>Extracted cannabinoids and terpenes</li>
        <li>Types: Shatter, wax, live resin, distillate</li>
        <li>Higher potency than flower</li>
      </ul>
      
      <h4>Edibles</h4>
      <ul>
        <li>Cannabis-infused foods and beverages</li>
        <li>Effects: Delayed onset (30-90 minutes), longer duration (4-8 hours)</li>
        <li>Precise dosing in milligrams THC</li>
      </ul>
    `
  },
  
  'consumption-methods': {
    id: 'consumption-methods',
    title: 'Consumption Methods Comparison Chart',
    category: 'Products',
    version: '1.4',
    lastUpdated: '2025-01-15',
    content: `
      <h2>Consumption Methods Comparison</h2>
      <p>Understanding different ways to consume cannabis and their characteristics.</p>
      
      <h3>Method Comparison Table</h3>
      <p><strong>Smoking (Joints, Pipes, Bongs):</strong></p>
      <ul>
        <li>Onset: 5-15 minutes</li>
        <li>Duration: 2-4 hours</li>
        <li>Pros: Fast effects, easy dosing control</li>
        <li>Cons: Respiratory irritation, odor</li>
      </ul>
      
      <p><strong>Vaporization:</strong></p>
      <ul>
        <li>Onset: 5-10 minutes</li>
        <li>Duration: 2-3 hours</li>
        <li>Pros: Less harsh, more discreet</li>
        <li>Cons: Device cost, learning curve</li>
      </ul>
      
      <p><strong>Edibles:</strong></p>
      <ul>
        <li>Onset: 30-90 minutes</li>
        <li>Duration: 4-8 hours</li>
        <li>Pros: Long-lasting, no inhalation</li>
        <li>Cons: Delayed effects, harder to control dose</li>
      </ul>
    `
  },
  
  'customer-service-handbook': {
    id: 'customer-service-handbook',
    title: 'Customer Service Handbook',
    category: 'Customer Service',
    version: '2.1',
    lastUpdated: '2025-01-15',
    content: `
      <h2>Customer Service Excellence</h2>
      <p>Professional customer service standards for dispensary agents.</p>
      
      <h3>Core Service Principles</h3>
      <ul>
        <li><strong>Respect:</strong> Treat every customer with dignity and respect</li>
        <li><strong>Knowledge:</strong> Provide accurate, helpful information</li>
        <li><strong>Patience:</strong> Take time to understand customer needs</li>
        <li><strong>Privacy:</strong> Maintain customer confidentiality</li>
      </ul>
      
      <h3>Customer Interaction Steps</h3>
      <ol>
        <li>Greet warmly within 30 seconds of entry</li>
        <li>Ask open-ended questions to understand needs</li>
        <li>Listen actively without interrupting</li>
        <li>Provide personalized recommendations</li>
        <li>Explain products clearly and accurately</li>
        <li>Thank customer and invite return</li>
      </ol>
    `
  },
  
  'needs-assessment-tool': {
    id: 'needs-assessment-tool',
    title: 'Customer Needs Assessment Tool',
    category: 'Customer Service',
    version: '1.2',
    lastUpdated: '2025-01-15',
    content: `
      <h2>Customer Needs Assessment Framework</h2>
      <p>Structured approach to understanding customer requirements and preferences.</p>
      
      <h3>Key Questions to Ask</h3>
      <ul>
        <li>"Is this your first visit to a dispensary?"</li>
        <li>"What are you hoping to achieve with cannabis?"</li>
        <li>"Do you prefer faster or longer-lasting effects?"</li>
        <li>"Have you used cannabis before? What was your experience?"</li>
        <li>"Do you have any preferences for consumption method?"</li>
      </ul>
      
      <h3>Listening for Clues</h3>
      <ul>
        <li>Experience level (first-timer vs experienced user)</li>
        <li>Desired effects (relaxation, energy, pain relief)</li>
        <li>Lifestyle factors (work schedule, social activities)</li>
        <li>Concerns or fears about cannabis use</li>
      </ul>
    `
  },
  
  'product-selection-guide': {
    id: 'product-selection-guide',
    title: 'Product Selection Decision Tree',
    category: 'Customer Service',
    version: '1.5',
    lastUpdated: '2025-01-15',
    content: `
      <h2>Product Selection Guide</h2>
      <p>Decision framework for helping customers choose appropriate products.</p>
      
      <h3>Selection Criteria</h3>
      <h4>For New Users:</h4>
      <ul>
        <li>Start with low THC products (5-10mg)</li>
        <li>Recommend edibles or tinctures for precise dosing</li>
        <li>Suggest CBD-rich products to balance THC effects</li>
        <li>Provide clear dosing instructions</li>
      </ul>
      
      <h4>For Experienced Users:</h4>
      <ul>
        <li>Ask about preferred potency levels</li>
        <li>Discuss strain preferences (indica, sativa, hybrid)</li>
        <li>Recommend concentrates if seeking higher potency</li>
        <li>Suggest variety for different occasions</li>
      </ul>
    `
  },
  
  'dosing-guidelines': {
    id: 'dosing-guidelines',
    title: 'Safe Dosing Guidelines',
    category: 'Safety',
    version: '2.0',
    lastUpdated: '2025-01-15',
    content: `
      <h2>Safe Cannabis Dosing Guidelines</h2>
      <p>Evidence-based recommendations for responsible cannabis consumption.</p>
      
      <h3>General Dosing Principles</h3>
      <ul>
        <li><strong>Start Low:</strong> Begin with smallest dose (2.5-5mg THC for edibles)</li>
        <li><strong>Go Slow:</strong> Wait 2 hours before increasing dose</li>
        <li><strong>Track Effects:</strong> Keep journal of doses and outcomes</li>
        <li><strong>Adjust Gradually:</strong> Increase by 2.5mg increments only</li>
      </ul>
      
      <h3>Dosing by Product Type</h3>
      <p><strong>Edibles:</strong> Start with 2.5mg THC, wait 2 hours, max 10mg for beginners</p>
      <p><strong>Smoking/Vaping:</strong> Start with 1-2 inhalations, wait 15 minutes</p>
      <p><strong>Tinctures:</strong> Start with 0.25mL, wait 30-60 minutes</p>
    `
  },
  
  'effects-safety-sheet': {
    id: 'effects-safety-sheet',
    title: 'Effects & Safety Information Sheet',
    category: 'Safety',
    version: '1.7',
    lastUpdated: '2025-01-15',
    content: `
      <h2>Cannabis Effects and Safety Information</h2>
      <p>Important safety information about cannabis use and effects.</p>
      
      <h3>Common Effects</h3>
      <h4>Positive Effects:</h4>
      <ul>
        <li>Relaxation and stress relief</li>
        <li>Pain reduction</li>
        <li>Improved appetite</li>
        <li>Enhanced creativity</li>
      </ul>
      
      <h4>Potential Negative Effects:</h4>
      <ul>
        <li>Anxiety or paranoia (especially with high THC)</li>
        <li>Dry mouth and eyes</li>
        <li>Increased heart rate</li>
        <li>Short-term memory impairment</li>
        <li>Dizziness or nausea</li>
      </ul>
      
      <h3>Safety Warnings</h3>
      <ul>
        <li>Never drive or operate machinery under the influence</li>
        <li>Keep all products away from children and pets</li>
        <li>Do not use if pregnant or breastfeeding</li>
        <li>May interact with certain medications</li>
      </ul>
    `
  },
  
  'adverse-reaction-protocol': {
    id: 'adverse-reaction-protocol',
    title: 'Adverse Reaction Response Protocol',
    category: 'Safety',
    version: '1.4',
    lastUpdated: '2025-01-15',
    content: `
      <h2>Responding to Adverse Reactions</h2>
      <p>Procedures for handling customer adverse reactions to cannabis.</p>
      
      <h3>Signs of Adverse Reaction</h3>
      <ul>
        <li>Extreme anxiety or panic</li>
        <li>Rapid heartbeat or chest pain</li>
        <li>Nausea or vomiting</li>
        <li>Severe dizziness or disorientation</li>
        <li>Loss of consciousness</li>
      </ul>
      
      <h3>Response Steps</h3>
      <ol>
        <li><strong>Stay Calm:</strong> Reassure customer that effects are temporary</li>
        <li><strong>Create Safe Space:</strong> Move to quiet, comfortable area</li>
        <li><strong>Hydrate:</strong> Offer water (no caffeine)</li>
        <li><strong>Monitor:</strong> Check breathing and consciousness</li>
        <li><strong>Call 911:</strong> If symptoms severe or customer requests</li>
        <li><strong>Document:</strong> Record incident details after resolved</li>
      </ol>
    `
  },
  
  'emergency-response-procedures': {
    id: 'emergency-response-procedures',
    title: 'Emergency Response Procedures',
    category: 'Safety',
    version: '2.3',
    lastUpdated: '2025-01-15',
    content: `
      <h2>Emergency Response Procedures</h2>
      <p>Critical protocols for various emergency situations.</p>
      
      <h3>Medical Emergency</h3>
      <ol>
        <li>Call 911 immediately</li>
        <li>Provide first aid if trained</li>
        <li>Do not move injured person unless in danger</li>
        <li>Alert manager and security</li>
        <li>Document incident after emergency resolved</li>
      </ol>
      
      <h3>Fire Emergency</h3>
      <ol>
        <li>Activate fire alarm</li>
        <li>Call 911</li>
        <li>Evacuate all customers and staff</li>
        <li>Use fire extinguisher only if safe and trained</li>
        <li>Meet at designated assembly point</li>
      </ol>
      
      <h3>Active Threat</h3>
      <ol>
        <li>Follow RUN-HIDE-FIGHT protocol</li>
        <li>Activate panic alarm if available</li>
        <li>Call 911 when safe</li>
        <li>Do not confront unless no alternative</li>
      </ol>
    `
  },
  
  'record-keeping-templates': {
    id: 'record-keeping-templates',
    title: 'Record Keeping Templates',
    category: 'Compliance',
    version: '1.8',
    lastUpdated: '2025-01-15',
    content: `
      <h2>Compliance Record Keeping Templates</h2>
      <p>Required documentation templates for maintaining regulatory compliance.</p>
      
      <h3>Daily Records</h3>
      <ul>
        <li><strong>Opening/Closing Checklist:</strong> Security system status, inventory verification</li>
        <li><strong>Cash Log:</strong> Starting balance, sales, deposits, ending balance</li>
        <li><strong>Incident Log:</strong> Any unusual events, customer issues, system errors</li>
      </ul>
      
      <h3>Weekly Records</h3>
      <ul>
        <li><strong>Inventory Reconciliation:</strong> Physical count vs METRC</li>
        <li><strong>Security Review:</strong> Camera footage spot checks</li>
      </ul>
      
      <h3>Monthly Records</h3>
      <ul>
        <li><strong>Employee Training Log:</strong> Staff training completion</li>
        <li><strong>Maintenance Log:</strong> Equipment servicing and repairs</li>
      </ul>
    `
  },
  
  'retention-schedule': {
    id: 'retention-schedule',
    title: 'Document Retention Schedule',
    category: 'Compliance',
    version: '1.3',
    lastUpdated: '2025-01-15',
    content: `
      <h2>Document Retention Requirements</h2>
      <p>Maryland cannabis regulations require specific document retention periods.</p>
      
      <h3>Retention Periods</h3>
      <p><strong>7 Years:</strong></p>
      <ul>
        <li>Sales records and receipts</li>
        <li>Inventory records</li>
        <li>Financial records</li>
        <li>Tax documents</li>
      </ul>
      
      <p><strong>5 Years:</strong></p>
      <ul>
        <li>Employee records</li>
        <li>Training documentation</li>
        <li>Incident reports</li>
      </ul>
      
      <p><strong>3 Years:</strong></p>
      <ul>
        <li>Visitor logs</li>
        <li>Maintenance records</li>
        <li>Surveillance footage</li>
      </ul>
    `
  },
  
  'lab-testing-guide': {
    id: 'lab-testing-guide',
    title: 'Lab Testing Requirements Guide',
    category: 'Quality',
    version: '2.0',
    lastUpdated: '2025-01-15',
    content: `
      <h2>Maryland Lab Testing Requirements</h2>
      <p>All cannabis products must pass laboratory testing before sale.</p>
      
      <h3>Required Tests</h3>
      <ul>
        <li><strong>Potency:</strong> THC, CBD, and other cannabinoid levels</li>
        <li><strong>Microbial:</strong> Mold, mildew, bacteria</li>
        <li><strong>Pesticides:</strong> Residual pesticide screening</li>
        <li><strong>Heavy Metals:</strong> Lead, arsenic, cadmium, mercury</li>
        <li><strong>Residual Solvents:</strong> From extraction process</li>
      </ul>
      
      <h3>Pass/Fail Criteria</h3>
      <p>Products must meet all Maryland safety standards. Failed batches cannot be sold and must be destroyed.</p>
    `
  },
  
  'coa-interpretation': {
    id: 'coa-interpretation',
    title: 'COA Interpretation Guide',
    category: 'Quality',
    version: '1.6',
    lastUpdated: '2025-01-15',
    content: `
      <h2>Certificate of Analysis (COA) Reading Guide</h2>
      <p>Understanding lab test results on product certificates of analysis.</p>
      
      <h3>Key COA Components</h3>
      <h4>Cannabinoid Profile:</h4>
      <ul>
        <li>THC percentage and total milligrams</li>
        <li>CBD percentage and total milligrams</li>
        <li>Other cannabinoids (CBN, CBG, etc.)</li>
      </ul>
      
      <h4>Terpene Profile:</h4>
      <ul>
        <li>Dominant terpenes and percentages</li>
        <li>Total terpene content</li>
        <li>Expected aroma and flavor notes</li>
      </ul>
      
      <h4>Safety Testing Results:</h4>
      <ul>
        <li>Microbial: Pass/Fail for mold and bacteria</li>
        <li>Pesticides: Pass/Fail or non-detect</li>
        <li>Heavy Metals: Within safe limits</li>
      </ul>
    `
  },
  
  'packaging-labeling-standards': {
    id: 'packaging-labeling-standards',
    title: 'Packaging & Labeling Standards',
    category: 'Compliance',
    version: '2.1',
    lastUpdated: '2025-01-15',
    content: `
      <h2>Maryland Packaging and Labeling Requirements</h2>
      <p>All cannabis products must meet strict packaging and labeling standards.</p>
      
      <h3>Packaging Requirements</h3>
      <ul>
        <li><strong>Child-Resistant:</strong> All packages must be child-resistant certified</li>
        <li><strong>Opaque:</strong> Contents not visible from outside</li>
        <li><strong>Resealable:</strong> For products with multiple servings</li>
        <li><strong>Tamper-Evident:</strong> Clear indication if opened</li>
      </ul>
      
      <h3>Required Label Information</h3>
      <ul>
        <li>Product name and type</li>
        <li>Net weight/volume</li>
        <li>THC and CBD content (mg and %)</li>
        <li>Harvest/packaging date</li>
        <li>Expiration date</li>
        <li>METRC UID number</li>
        <li>Producer/processor license number</li>
        <li>Warning statements</li>
      </ul>
    `
  },
  
  'label-checklist': {
    id: 'label-checklist',
    title: 'Label Compliance Checklist',
    category: 'Compliance',
    version: '1.4',
    lastUpdated: '2025-01-15',
    content: `
      <h2>Product Label Compliance Checklist</h2>
      <p>Verify all required label elements before selling products.</p>
      
      <h3>Label Verification Steps</h3>
      <ul>
        <li>☐ Product name clearly visible</li>
        <li>☐ THC content in mg and percentage</li>
        <li>☐ CBD content in mg and percentage</li>
        <li>☐ Net weight accurate</li>
        <li>☐ Batch number present</li>
        <li>☐ METRC UID visible and scannable</li>
        <li>☐ Warning statements included</li>
        <li>☐ Producer license number visible</li>
        <li>☐ Expiration date in MM/DD/YYYY format</li>
      </ul>
    `
  },
  
  'inspection-checklist': {
    id: 'inspection-checklist',
    title: 'Inspection Readiness Checklist',
    category: 'Compliance',
    version: '2.2',
    lastUpdated: '2025-01-15',
    content: `
      <h2>MCA Inspection Readiness Checklist</h2>
      <p>Prepare for unannounced MCA compliance inspections.</p>
      
      <h3>Documentation Ready</h3>
      <ul>
        <li>☐ Current employee RVT certificates</li>
        <li>☐ METRC reports (last 30 days)</li>
        <li>☐ Security system logs</li>
        <li>☐ Inventory records</li>
        <li>☐ Sales receipts</li>
      </ul>
      
      <h3>Physical Compliance</h3>
      <ul>
        <li>☐ All products properly labeled</li>
        <li>☐ Surveillance cameras operational</li>
        <li>☐ Secure storage locked</li>
        <li>☐ No expired products on shelves</li>
        <li>☐ Floor plan matches approved layout</li>
      </ul>
    `
  },
  
  'audit-guide': {
    id: 'audit-guide',
    title: 'Audit Preparation Guide',
    category: 'Compliance',
    version: '1.9',
    lastUpdated: '2025-01-15',
    content: `
      <h2>Compliance Audit Preparation</h2>
      <p>Step-by-step guide for preparing for regulatory audits.</p>
      
      <h3>30 Days Before Audit</h3>
      <ul>
        <li>Review all compliance documentation</li>
        <li>Verify employee certifications are current</li>
        <li>Conduct internal compliance review</li>
        <li>Address any identified gaps</li>
      </ul>
      
      <h3>During Audit</h3>
      <ul>
        <li>Greet auditors professionally</li>
        <li>Provide requested documentation promptly</li>
        <li>Answer questions honestly and directly</li>
        <li>Take notes of auditor comments</li>
        <li>Request clarification if needed</li>
      </ul>
      
      <h3>After Audit</h3>
      <ul>
        <li>Review audit findings within 24 hours</li>
        <li>Create corrective action plan</li>
        <li>Implement fixes immediately</li>
        <li>Document all remediation steps</li>
      </ul>
    `
  },
  
  'incident-report-forms': {
    id: 'incident-report-forms',
    title: 'Incident Report Forms',
    category: 'Safety',
    version: '1.5',
    lastUpdated: '2025-01-15',
    content: `
      <h2>Incident Documentation Templates</h2>
      <p>Proper documentation of incidents is required for compliance and liability protection.</p>
      
      <h3>When to File Incident Report</h3>
      <ul>
        <li>Customer adverse reaction</li>
        <li>Security breach or theft</li>
        <li>Employee injury</li>
        <li>Equipment malfunction</li>
        <li>Product recall</li>
        <li>METRC system error</li>
      </ul>
      
      <h3>Required Information</h3>
      <ul>
        <li>Date, time, and location</li>
        <li>Detailed description of incident</li>
        <li>Individuals involved (names, roles)</li>
        <li>Actions taken in response</li>
        <li>Witnesses (names and contact info)</li>
        <li>Follow-up required</li>
      </ul>
    `
  },
  
  'substance-disorders': {
    id: 'substance-disorders',
    title: 'Substance Use Disorder Recognition',
    category: 'Safety',
    version: '1.3',
    lastUpdated: '2025-01-15',
    content: `
      <h2>Recognizing Substance Use Disorders</h2>
      <p>Dispensary agents should be aware of signs of substance use disorders and know how to respond compassionately.</p>
      
      <h3>Warning Signs</h3>
      <ul>
        <li>Purchasing maximum limits frequently</li>
        <li>Appearing intoxicated during visits</li>
        <li>Requesting only high-potency products</li>
        <li>Expressing concerns about tolerance</li>
        <li>Reporting negative life impacts from use</li>
      </ul>
      
      <h3>Appropriate Response</h3>
      <ul>
        <li>Approach with compassion, not judgment</li>
        <li>Suggest speaking with healthcare provider</li>
        <li>Provide resources for substance abuse support</li>
        <li>Inform manager of concerns (confidentially)</li>
        <li>Never refuse service based solely on suspicion</li>
      </ul>
      
      <h3>Resources</h3>
      <ul>
        <li>Maryland Substance Abuse Hotline: 1-800-422-0009</li>
        <li>SAMHSA National Helpline: 1-800-662-4357</li>
      </ul>
    `
  }
};

export function getDocumentContent(contentId: string): DocumentContent | undefined {
  return documentContent[contentId];
}

export function getDocumentsByCategory(category: string): DocumentContent[] {
  return Object.values(documentContent).filter(doc => doc.category === category);
}
