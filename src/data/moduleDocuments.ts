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
    comarReferences: ['14.17.01', '14.17.05', '14.17.08'],
    content: `
      <h2>Maryland Cannabis Legal Framework</h2>
      
      <div class="alert-info">
        <strong>Important:</strong> This guide reflects Maryland law as of January 2025. Always verify current regulations with the Maryland Cannabis Administration.
      </div>

      <h3>1. Federal vs. State Law</h3>
      <p>Cannabis remains illegal under federal law (Controlled Substances Act, Schedule I). However, Maryland has legalized cannabis for both medical and adult use under state law. Dispensary agents must understand this conflict:</p>
      
      <ul>
        <li><strong>Federal Law:</strong> Cannabis is Schedule I (high abuse potential, no accepted medical use)</li>
        <li><strong>State Law:</strong> Maryland recognizes medical and adult-use cannabis</li>
        <li><strong>Practical Impact:</strong> Federal employees, military personnel, and those in federally regulated industries cannot use cannabis even where state-legal</li>
      </ul>

      <h3>2. Maryland Adult-Use Cannabis (Effective July 1, 2023)</h3>
      
      <h4>Possession Limits</h4>
      <table>
        <tr>
          <th>Product Type</th>
          <th>Possession Limit</th>
        </tr>
        <tr>
          <td>Cannabis flower</td>
          <td>1.5 ounces (42.5 grams)</td>
        </tr>
        <tr>
          <td>Concentrated cannabis</td>
          <td>12 grams</td>
        </tr>
        <tr>
          <td>Cannabis products (edibles)</td>
          <td>750mg THC total</td>
        </tr>
      </table>

      <h4>Purchase Requirements</h4>
      <ul>
        <li>Minimum age: 21 years old</li>
        <li>Valid government-issued photo ID required</li>
        <li>Maryland residents and out-of-state visitors may purchase</li>
        <li>No medical card required for adult-use purchases</li>
      </ul>

      <h3>3. Maryland Medical Cannabis Program</h3>
      <p>Maryland's medical cannabis program (established 2014) continues alongside adult-use:</p>
      
      <ul>
        <li><strong>Patient Requirements:</strong> Must have qualifying medical condition and physician certification</li>
        <li><strong>Caregiver Provisions:</strong> Registered caregivers may purchase on behalf of patients</li>
        <li><strong>Tax Benefits:</strong> Medical purchases may be exempt from certain taxes</li>
        <li><strong>Higher Limits:</strong> Medical patients may have higher possession limits than adult-use</li>
      </ul>

      <h4>Qualifying Medical Conditions</h4>
      <ul>
        <li>Cachexia, anorexia, wasting syndrome</li>
        <li>Severe or chronic pain</li>
        <li>Severe nausea</li>
        <li>Seizures</li>
        <li>Severe or persistent muscle spasms</li>
        <li>Glaucoma</li>
        <li>Post-traumatic stress disorder (PTSD)</li>
        <li>Any other condition that is severe and resistant to conventional medicine</li>
      </ul>

      <h3>4. COMAR Title 14, Subtitle 17 - Key Sections</h3>
      
      <h4>14.17.01 - General Provisions</h4>
      <p>Defines terms, establishes regulatory authority of MCA, and outlines licensing requirements.</p>

      <h4>14.17.05 - Dispensary Operations</h4>
      <p>This is the primary section governing your work as a dispensary agent:</p>
      <ul>
        <li><strong>.01:</strong> License application and renewal requirements</li>
        <li><strong>.03:</strong> Security and surveillance requirements</li>
        <li><strong>.04:</strong> Inventory tracking and METRC compliance</li>
        <li><strong>.05:</strong> Patient verification and registration</li>
        <li><strong>.06:</strong> Product testing and quality assurance</li>
        <li><strong>.07:</strong> Packaging and labeling requirements</li>
        <li><strong>.08:</strong> Responsible vendor training (this course!)</li>
      </ul>

      <h4>14.17.08 - Enforcement and Penalties</h4>
      <p>Violations can result in:</p>
      <ul>
        <li>Written warnings</li>
        <li>Civil penalties ($5,000 - $50,000)</li>
        <li>License suspension or revocation</li>
        <li>Criminal charges for serious violations</li>
      </ul>

      <h3>5. Dispensary Agent Responsibilities</h3>
      
      <div class="checklist">
        <h4>Daily Compliance Checklist</h4>
        <ul>
          <li>☐ Verify customer age with valid photo ID</li>
          <li>☐ Check medical cards for authenticity and expiration</li>
          <li>☐ Ensure purchases stay within legal limits</li>
          <li>☐ Properly log all transactions in METRC</li>
          <li>☐ Verify product packaging and labeling compliance</li>
          <li>☐ Maintain security protocols at all times</li>
          <li>☐ Refuse service when appropriate (intoxication, minors, suspicious activity)</li>
        </ul>
      </div>

      <h3>6. Prohibited Activities</h3>
      
      <div class="alert-danger">
        <strong>Never Do These:</strong>
        <ul>
          <li>Sell to anyone under 21 (or 18 without valid medical card)</li>
          <li>Allow consumption on premises</li>
          <li>Accept false or expired identification</li>
          <li>Exceed possession limits in single transaction</li>
          <li>Sell cannabis that hasn't been tested and labeled properly</li>
          <li>Divert product to non-licensed entities</li>
          <li>Make medical claims about products (for adult-use customers)</li>
        </ul>
      </div>

      <h3>7. Key Definitions</h3>
      <dl>
        <dt>Cannabis</dt>
        <dd>All parts of the cannabis plant, including marijuana and medical cannabis, but excluding hemp</dd>
        
        <dt>Dispensary Agent</dt>
        <dd>An individual who is at least 21 years old and authorized by a licensed dispensary to process orders and dispense cannabis</dd>
        
        <dt>METRC</dt>
        <dd>Marijuana Enforcement Tracking Reporting Compliance - Maryland's seed-to-sale tracking system</dd>
        
        <dt>Medical Cannabis</dt>
        <dd>Cannabis that meets laboratory standards, is free from contaminants, and is recommended by a physician for a qualifying medical condition</dd>
        
        <dt>Qualifying Patient</dt>
        <dd>An individual with a written certification from a physician for use of medical cannabis to treat a qualifying medical condition</dd>
      </dl>

      <h3>8. Resources</h3>
      <ul>
        <li><strong>MCA Website:</strong> <a href="https://mmcc.maryland.gov" target="_blank">mmcc.maryland.gov</a></li>
        <li><strong>COMAR Regulations:</strong> Available on MCA website</li>
        <li><strong>METRC Support:</strong> Training and technical assistance available</li>
        <li><strong>Compliance Hotline:</strong> Report violations confidentially</li>
      </ul>

      <div class="alert-info">
        <strong>Remember:</strong> When in doubt, always verify with your dispensary manager or MCA compliance officer. It's better to ask questions than to violate regulations.
      </div>
    `
  },

  'dispensary-sops': {
    id: 'dispensary-sops',
    title: 'Standard Operating Procedures Manual',
    category: 'Operations',
    version: '3.2',
    lastUpdated: '2025-01-15',
    comarReferences: ['14.17.05.03', '14.17.05.04'],
    content: `
      <h2>Dispensary Standard Operating Procedures</h2>
      
      <h3>1. Opening Procedures (Daily)</h3>
      
      <h4>Before Opening (6:00 AM - 9:00 AM)</h4>
      <ol>
        <li><strong>Security Check (15 min)</strong>
          <ul>
            <li>Walk perimeter, check for signs of break-in or tampering</li>
            <li>Verify all cameras are operational (green lights)</li>
            <li>Test alarm system and panic buttons</li>
            <li>Check door locks and access control systems</li>
          </ul>
        </li>
        
        <li><strong>Facility Inspection (15 min)</strong>
          <ul>
            <li>Check temperature and humidity in storage areas (60-70°F, 55-62% RH)</li>
            <li>Inspect vault for organization and security</li>
            <li>Verify no product is left in customer areas from previous day</li>
            <li>Clean and sanitize all customer-facing surfaces</li>
          </ul>
        </li>
        
        <li><strong>METRC System Login (10 min)</strong>
          <ul>
            <li>Log into METRC with your individual credentials</li>
            <li>Review any overnight alerts or system messages</li>
            <li>Verify inventory counts match system records</li>
            <li>Report any discrepancies to manager immediately</li>
          </ul>
        </li>
        
        <li><strong>Cash Management (10 min)</strong>
          <ul>
            <li>Count opening till ($200 starting balance)</li>
            <li>Verify safe contents with dual control (2 agents required)</li>
            <li>Document cash on hand in logbook</li>
            <li>Prepare change denominations for day</li>
          </ul>
        </li>
        
        <li><strong>Product Readiness (20 min)</strong>
          <ul>
            <li>Pull pre-packed orders for pickup</li>
            <li>Verify expiration dates on all products</li>
            <li>Ensure proper labeling on all items</li>
            <li>Stock customer display samples (if applicable)</li>
          </ul>
        </li>
      </ol>

      <h3>2. Customer Service Procedures</h3>
      
      <h4>Step 1: Greeting and ID Verification</h4>
      <div class="procedure-box">
        <p><strong>Script:</strong> "Good [morning/afternoon], welcome to [Dispensary Name]. I'll need to see your valid photo ID to verify you're 21 or older."</p>
        
        <p><strong>ID Check Requirements:</strong></p>
        <ul>
          <li>Photo must match person presenting ID</li>
          <li>ID must not be expired</li>
          <li>Birthdate confirms 21+ years of age</li>
          <li>Acceptable IDs: Driver's license, passport, military ID, state ID card</li>
        </ul>
        
        <p><strong>If Medical Patient:</strong> Also verify medical cannabis card is valid and matches ID</p>
      </div>

      <h4>Step 2: Needs Assessment</h4>
      <p><strong>Questions to Ask:</strong></p>
      <ul>
        <li>"Are you familiar with cannabis products, or is this your first visit?"</li>
        <li>"What are you looking for today?" (pain relief, sleep, relaxation, etc.)</li>
        <li>"Do you have experience with cannabis? What's your tolerance level?"</li>
        <li>"Do you prefer flower, concentrates, or edibles?"</li>
        <li>"Is there a specific cannabinoid ratio you're looking for?" (THC, CBD, CBG)</li>
      </ul>

      <h4>Step 3: Product Recommendations</h4>
      <div class="alert-warning">
        <strong>Important Distinctions:</strong>
        <ul>
          <li><strong>Medical Patients:</strong> You may discuss therapeutic effects and symptom management</li>
          <li><strong>Adult-Use Customers:</strong> Focus on effects (energizing vs. relaxing), flavor, and potency - DO NOT make medical claims</li>
        </ul>
      </div>

      <h4>Step 4: Dosing Guidance</h4>
      <table>
        <tr>
          <th>Experience Level</th>
          <th>Recommended Starting Dose</th>
          <th>Guidance</th>
        </tr>
        <tr>
          <td>First-time user</td>
          <td>2.5-5mg THC (edibles)<br>1-2 inhalations (flower/vape)</td>
          <td>"Start low and go slow. Wait 2 hours before taking more edibles."</td>
        </tr>
        <tr>
          <td>Occasional user</td>
          <td>5-10mg THC</td>
          <td>"You may increase gradually, but still wait full effect window."</td>
        </tr>
        <tr>
          <td>Regular user</td>
          <td>10-20mg THC</td>
          <td>"Base on your tolerance, but be cautious with new product types."</td>
        </tr>
      </table>

      <h4>Step 5: Transaction Processing</h4>
      <ol>
        <li>Scan product barcodes in POS system</li>
        <li>Verify purchase doesn't exceed possession limits</li>
        <li>Record transaction in METRC real-time</li>
        <li>Process payment (cash or debit - no credit cards)</li>
        <li>Provide receipt and exit packaging</li>
      </ol>

      <h3>3. Inventory Management</h3>
      
      <h4>Receiving Product Deliveries</h4>
      <ol>
        <li>Verify delivery manifest matches METRC transfer</li>
        <li>Inspect all packages for tampering or damage</li>
        <li>Check product labels for compliance (THC content, testing dates)</li>
        <li>Quarantine any questionable products</li>
        <li>Accept transfer in METRC system</li>
        <li>Store products according to type and storage requirements</li>
      </ol>

      <h4>Daily Inventory Audit (End of Shift)</h4>
      <ul>
        <li>Physical count of high-value items</li>
        <li>Reconcile POS sales with METRC logs</li>
        <li>Document any discrepancies greater than 2%</li>
        <li>Report waste or damaged products</li>
      </ul>

      <h3>4. Security Protocols</h3>
      
      <h4>Access Control</h4>
      <ul>
        <li>Badge in/out for all entries and exits</li>
        <li>Never prop doors open</li>
        <li>Escort all visitors (vendors, contractors)</li>
        <li>Report lost badges immediately</li>
      </ul>

      <h4>Video Surveillance</h4>
      <ul>
        <li>Cameras must capture all areas where cannabis is stored or sold</li>
        <li>90-day video retention required</li>
        <li>Check camera functionality during opening procedures</li>
        <li>Report any camera outages to manager immediately</li>
      </ul>

      <h4>Theft Prevention</h4>
      <div class="alert-danger">
        <strong>If You Witness Theft:</strong>
        <ol>
          <li>Do NOT physically confront the individual</li>
          <li>Note detailed description (clothing, direction of travel)</li>
          <li>Press panic button if feeling threatened</li>
          <li>Call 911 if safe to do so</li>
          <li>Complete incident report immediately after</li>
        </ol>
      </div>

      <h3>5. Closing Procedures (Daily)</h3>
      
      <h4>End of Business (30-45 minutes before closing)</h4>
      <ol>
        <li><strong>Final Customers:</strong> Inform customers of closing time, complete all transactions</li>
        <li><strong>Cash Reconciliation:</strong>
          <ul>
            <li>Count cash drawer</li>
            <li>Compare to POS report</li>
            <li>Document any overages/shortages</li>
            <li>Secure cash in safe (dual control)</li>
          </ul>
        </li>
        <li><strong>METRC Closeout:</strong>
          <ul>
            <li>Verify all sales recorded</li>
            <li>Complete any pending transfers</li>
            <li>Log off individual account</li>
          </ul>
        </li>
        <li><strong>Product Securing:</strong>
          <ul>
            <li>Return all display products to vault</li>
            <li>Verify no product in customer areas</li>
            <li>Lock vault and limited-access areas</li>
          </ul>
        </li>
        <li><strong>Facility Lockdown:</strong>
          <ul>
            <li>Arm alarm system</li>
            <li>Verify all windows and doors locked</li>
            <li>Turn off non-essential equipment</li>
            <li>Exit through designated door, verify lock behind you</li>
          </ul>
        </li>
      </ol>

      <h3>6. Refusing Service</h3>
      
      <p>You MUST refuse service if:</p>
      <ul>
        <li>Customer appears intoxicated or impaired</li>
        <li>Customer is under 21 (or under 18 without valid medical card)</li>
        <li>ID appears fraudulent or expired</li>
        <li>Medical card is expired or doesn't match ID</li>
        <li>Purchase would exceed possession limits</li>
        <li>Customer is aggressive, threatening, or disruptive</li>
      </ul>

      <p><strong>How to Refuse Service Professionally:</strong></p>
      <p>"I'm sorry, but I'm unable to complete this transaction today. [Brief reason: expired ID, over limit, etc.] Please contact our manager if you have questions."</p>

      <div class="alert-info">
        <strong>Remember:</strong> It's always better to refuse a sale than to violate regulations. You will not be penalized for refusing service in good faith.
      </div>

      <h3>7. Emergency Contacts</h3>
      <table>
        <tr>
          <th>Emergency Type</th>
          <th>Contact</th>
          <th>When to Use</th>
        </tr>
        <tr>
          <td>Medical Emergency</td>
          <td>911</td>
          <td>Overdose, injury, health crisis</td>
        </tr>
        <tr>
          <td>Security Threat</td>
          <td>911 + Panic Button</td>
          <td>Robbery, violence, threats</td>
        </tr>
        <tr>
          <td>System Outage</td>
          <td>METRC Support: 1-877-566-6506</td>
          <td>Cannot log sales, system errors</td>
        </tr>
        <tr>
          <td>Regulatory Questions</td>
          <td>Dispensary Manager</td>
          <td>Unclear compliance situations</td>
        </tr>
      </table>
    `
  },

  'emergency-procedures': {
    id: 'emergency-procedures',
    title: 'Emergency Response Procedures',
    category: 'Safety',
    version: '2.0',
    lastUpdated: '2025-01-15',
    comarReferences: ['14.17.05.09'],
    content: `
      <h2>Emergency Response Procedures</h2>
      
      <div class="alert-danger">
        <strong>Life Safety Priority:</strong> In ANY emergency, human safety comes first. Property and product can be replaced; lives cannot.
      </div>

      <h3>1. Medical Emergencies</h3>
      
      <h4>Cannabis Overconsumption</h4>
      <p><strong>Signs of Overconsumption:</strong></p>
      <ul>
        <li>Severe anxiety or panic attack</li>
        <li>Paranoia or confusion</li>
        <li>Rapid heartbeat</li>
        <li>Nausea or vomiting</li>
        <li>Extreme dizziness or difficulty standing</li>
        <li>Unresponsiveness</li>
      </ul>

      <p><strong>Immediate Response:</strong></p>
      <ol>
        <li><strong>Stay Calm:</strong> Reassure the person. Overconsumption is rarely life-threatening but can be frightening.</li>
        <li><strong>Move to Quiet Area:</strong> Reduce stimulation (lights, noise)</li>
        <li><strong>Keep Person Sitting or Lying Down:</strong> Prevent falls</li>
        <li><strong>Offer Water:</strong> Stay hydrated, but don't force</li>
        <li><strong>Monitor Vital Signs:</strong> Breathing, pulse, responsiveness</li>
        <li><strong>Call 911 If:</strong>
          <ul>
            <li>Person becomes unresponsive</li>
            <li>Breathing becomes labored or irregular</li>
            <li>Severe chest pain</li>
            <li>Seizures occur</li>
            <li>Person requests medical help</li>
          </ul>
        </li>
      </ol>

      <div class="alert-warning">
        <strong>Important:</strong> Be honest with EMS about cannabis use. Medics need complete information to provide proper care. Maryland law protects those seeking emergency medical help.
      </div>

      <h4>Other Medical Emergencies</h4>
      <table>
        <tr>
          <th>Emergency</th>
          <th>Action</th>
        </tr>
        <tr>
          <td>Seizure</td>
          <td>Clear area, protect head, time seizure, call 911 if lasts >5 minutes or person doesn't regain consciousness</td>
        </tr>
        <tr>
          <td>Cardiac event</td>
          <td>Call 911 immediately, start CPR if trained and needed, use AED if available</td>
        </tr>
        <tr>
          <td>Severe allergic reaction</td>
          <td>Call 911, use EpiPen if person has one, monitor breathing</td>
        </tr>
        <tr>
          <td>Injury (cut, burn)</td>
          <td>Administer first aid, call 911 if severe, complete incident report</td>
        </tr>
      </table>

      <h3>2. Security Emergencies</h3>
      
      <h4>Armed Robbery</h4>
      <div class="procedure-box">
        <p><strong>During Robbery:</strong></p>
        <ol>
          <li><strong>Comply Fully:</strong> Give what is demanded. Your life is more valuable than any product or money.</li>
          <li><strong>Stay Calm:</strong> Speak slowly and clearly. Avoid sudden movements.</li>
          <li><strong>Observe Details:</strong> Mental note of: height, build, clothing, weapons, speech patterns, escape direction</li>
          <li><strong>Don't Be a Hero:</strong> Do NOT try to stop or chase the robber</li>
          <li><strong>Activate Silent Alarm:</strong> If you can do so safely without drawing attention</li>
        </ol>
        
        <p><strong>After Robber Leaves:</strong></p>
        <ol>
          <li>Lock doors to prevent re-entry</li>
          <li>Call 911 immediately</li>
          <li>Preserve scene - don't touch anything robber touched</li>
          <li>Write down details while fresh in memory</li>
          <li>Do not discuss incident with media or on social media</li>
          <li>Cooperate fully with police investigation</li>
        </ol>
      </div>

      <h4>Aggressive or Threatening Customer</h4>
      <p><strong>De-escalation Steps:</strong></p>
      <ol>
        <li><strong>Stay Calm:</strong> Keep your voice low and steady</li>
        <li><strong>Create Space:</strong> Step back, keep counter between you and customer</li>
        <li><strong>Listen Actively:</strong> "I understand you're upset. How can I help?"</li>
        <li><strong>Set Boundaries:</strong> "I want to help you, but I need you to lower your voice."</li>
        <li><strong>Offer Solutions:</strong> "Let me get my manager to assist you."</li>
      </ol>

      <p><strong>If Situation Escalates:</strong></p>
      <ul>
        <li>Press panic button (discreetly if possible)</li>
        <li>Ask customer to leave premises</li>
        <li>Call 911 if customer refuses to leave or makes threats</li>
        <li>Never physically touch or restrain customer unless in immediate danger</li>
        <li>Document incident thoroughly after resolution</li>
      </ul>

      <h4>Break-In or Burglary (After Hours)</h4>
      <p>If alarm company notifies you of break-in:</p>
      <ol>
        <li><strong>Do NOT Go to Facility:</strong> Let police respond</li>
        <li>Call police to verify alarm response</li>
        <li>Notify facility manager and security company</li>
        <li>Only enter facility once police have cleared it</li>
        <li>Document missing/damaged items with photos</li>
        <li>File police report and METRC discrepancy report</li>
      </ol>

      <h3>3. Fire Emergency</h3>
      
      <h4>If You Discover Fire</h4>
      <p><strong>R.A.C.E. Protocol:</strong></p>
      <ul>
        <li><strong>R</strong> = Rescue: Help anyone in immediate danger</li>
        <li><strong>A</strong> = Alarm: Pull fire alarm, call 911</li>
        <li><strong>C</strong> = Confine: Close doors to contain fire</li>
        <li><strong>E</strong> = Evacuate or Extinguish: 
          <ul>
            <li>If fire is SMALL (wastebasket-sized) and you're trained, use fire extinguisher</li>
            <li>If fire is LARGE or spreading, evacuate immediately</li>
          </ul>
        </li>
      </ul>

      <h4>Fire Extinguisher Use (P.A.S.S.)</h4>
      <ol>
        <li><strong>P</strong>ull the pin</li>
        <li><strong>A</strong>im at base of fire</li>
        <li><strong>S</strong>queeze handle</li>
        <li><strong>S</strong>weep side to side</li>
      </ol>

      <div class="alert-danger">
        <strong>Never Fight Fire If:</strong>
        <ul>
          <li>You don't know what's burning</li>
          <li>Fire is spreading rapidly</li>
          <li>You don't have proper extinguisher for fire type</li>
          <li>Room is filling with smoke</li>
          <li>Fire is between you and exit</li>
        </ul>
        <strong>When in doubt, GET OUT!</strong>
      </div>

      <h4>Evacuation Procedure</h4>
      <ol>
        <li>Alert all customers and staff: "We need to evacuate immediately. Please exit through [nearest exit]."</li>
        <li>Help anyone needing assistance</li>
        <li>Close doors as you leave (don't lock)</li>
        <li>Meet at designated assembly point (minimum 100 feet from building)</li>
        <li>Account for all staff and customers</li>
        <li>Call 911 if not already called</li>
        <li>Do NOT re-enter building until fire department gives all-clear</li>
      </ol>

      <h3>4. Natural Disasters</h3>
      
      <h4>Severe Weather (Tornado Warning)</h4>
      <ol>
        <li>Move everyone to interior room away from windows</li>
        <li>Stay low to ground</li>
        <li>Cover head and neck</li>
        <li>Wait for all-clear from weather service</li>
      </ol>

      <h4>Earthquake</h4>
      <ul>
        <li><strong>During Shaking:</strong> Drop, Cover, Hold On - under desk or table</li>
        <li><strong>After Shaking Stops:</strong> Check for injuries, evacuate if building damaged, watch for aftershocks</li>
      </ul>

      <h4>Flood</h4>
      <ul>
        <li>Move to higher ground immediately</li>
        <li>Never drive or walk through flood waters</li>
        <li>Do not return to facility until authorities declare safe</li>
      </ul>

      <h3>5. System Failures</h3>
      
      <h4>METRC Outage</h4>
      <p><strong>Immediate Actions:</strong></p>
      <ol>
        <li>Call METRC Support: 1-877-566-6506</li>
        <li>Switch to paper logging system</li>
        <li>Record ALL transactions manually with:
          <ul>
            <li>Customer ID (last 4 digits)</li>
            <li>Products sold (name, quantity, batch #)</li>
            <li>Time of sale</li>
            <li>Agent initials</li>
          </ul>
        </li>
        <li>When METRC comes back online, enter ALL transactions within 24 hours</li>
        <li>Document outage duration for compliance records</li>
      </ol>

      <h4>Power Outage</h4>
      <ol>
        <li>Switch to emergency lighting (if available)</li>
        <li>Complete current transactions on backup power</li>
        <li>Do NOT start new transactions if POS is down</li>
        <li>Lock vault and secure product</li>
        <li>If prolonged (>1 hour):
          <ul>
            <li>Close facility to protect inventory</li>
            <li>Post notice on door with expected reopening</li>
            <li>Monitor temperature-sensitive products</li>
          </ul>
        </li>
      </ol>

      <h3>6. Incident Reporting</h3>
      
      <p>ALL incidents must be documented within 24 hours using the Incident Report Form. Include:</p>
      <ul>
        <li>Date, time, location</li>
        <li>Description of incident</li>
        <li>Names of involved parties (staff, customers, witnesses)</li>
        <li>Actions taken</li>
        <li>Police report number (if applicable)</li>
        <li>Photos of damage (if safe to take)</li>
        <li>Follow-up actions needed</li>
      </ul>

      <h3>7. Emergency Contact Information</h3>
      <table>
        <tr>
          <th>Service</th>
          <th>Number</th>
          <th>When to Call</th>
        </tr>
        <tr>
          <td>Police/Fire/EMS</td>
          <td>911</td>
          <td>Life-threatening emergencies</td>
        </tr>
        <tr>
          <td>Poison Control</td>
          <td>1-800-222-1222</td>
          <td>Accidental ingestion, overdose questions</td>
        </tr>
        <tr>
          <td>METRC Support</td>
          <td>1-877-566-6506</td>
          <td>System outages, technical issues</td>
        </tr>
        <tr>
          <td>MCA Compliance</td>
          <td>(Check current number on MCA website)</td>
          <td>Reporting major violations or security breaches</td>
        </tr>
      </table>

      <div class="alert-info">
        <strong>Post this information:</strong> Emergency contact numbers should be posted prominently in break room, behind counter, and in vault area.
      </div>
    `
  }
};

/**
 * Get document content by ID
 */
export function getDocumentContent(contentId: string): DocumentContent | undefined {
  return documentContent[contentId];
}

/**
 * Get all documents for a category
 */
export function getDocumentsByCategory(category: string): DocumentContent[] {
  return Object.values(documentContent).filter(doc => doc.category === category);
}
