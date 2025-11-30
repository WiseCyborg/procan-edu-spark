-- Expand modules 9-18 with proper SQL escaping
-- All apostrophes are escaped as ''

UPDATE course_modules SET content = '## Overview

The Point of Sale (POS) system is the nerve center of dispensary operations, serving as the critical interface between regulatory compliance, inventory management, and customer transactions. In Maryland''s tightly regulated cannabis industry, your POS system must seamlessly integrate with the state''s Metrc seed-to-sale tracking system while providing real-time transaction recording, purchase limit enforcement, and comprehensive audit trails. Every sale must be recorded accurately, every gram tracked precisely, and every regulatory requirement satisfied instantly—making POS proficiency essential for every dispensary employee.

## Key POS System Functions

Your dispensary''s POS system performs multiple critical functions:

**Transaction Recording**: Every sale must be recorded in real-time with complete product details (strain, batch number, weight/quantity, THC/CBD content), patient information (MMCC ID verification, purchase limits), pricing breakdown (product cost, taxes, discounts), and timestamp documentation. This creates an unbreakable audit trail for MCA inspections.

**Metrc Integration**: The POS automatically updates Maryland''s Metrc tracking system with each transaction, transferring product from your inventory to the patient''s possession in the state database. Any disconnect between your POS and Metrc creates compliance violations.

**Purchase Limit Enforcement**: Maryland law limits patients to specific monthly purchase amounts. Your POS must track cumulative purchases across all dispensaries statewide and prevent sales that would exceed legal limits—rejecting transactions automatically when limits are reached.

**Sales Tax Calculation**: The POS calculates and collects applicable state and local sales taxes on every transaction, maintaining separate accounting for tax remittance to revenue authorities.

## Regulatory Compliance Requirements

COMAR 10.62.31 establishes strict POS and transaction recording requirements:

**Real-Time Recording**: All transactions must be entered into the POS immediately at the time of sale—no delayed entries, batch processing, or manual logs permitted. The timestamp in your POS must match the actual transaction time.

**Patient Verification Integration**: Before completing any sale, the POS must verify the patient''s MMCC registration status, check photo ID against registration, confirm purchase limits haven''t been exceeded, and document the verification in the transaction record.

**Inventory Deduction**: The moment a sale is recorded, inventory must be automatically reduced in both your POS and Metrc—ensuring perfect synchronization between systems and preventing "phantom inventory" discrepancies.

**Audit Trail Protection**: POS records are legally protected documents that cannot be altered or deleted. All corrections require supervisor approval and leave a documented trail of the change, original entry, reason for correction, and authorizing employee.

## Transaction Processing Best Practices

Follow these industry-standard procedures for every transaction:

**Pre-Transaction**: Verify patient MMCC card is current and unexpired, check photo ID matches cardholder name and photo, confirm patient hasn''t exceeded purchase limits, and review any product-specific restrictions in patient profile.

**During Transaction**: Scan product barcodes to ensure accuracy (never manually enter products), verify weights match labeled amounts for flower products, apply any eligible patient discounts or promotions, clearly communicate total cost including taxes before payment, and process payment (cash handling protocols or electronic payment per your dispensary''s procedures).

**Post-Transaction**: Print receipt with all required information (dispensary name/license, date/time, budtender name, itemized products with batch numbers, tax breakdown), provide patient education materials as appropriate, package products in compliant child-resistant containers, and thank the patient professionally.

## Handling Complex Scenarios

**Voided Transactions**: If a transaction must be voided (customer changes mind before payment, incorrect products scanned, pricing error discovered), immediately notify your supervisor, document the void reason in POS notes, ensure inventory is correctly restored, and never complete a void without manager approval code. All voids appear in daily audit reports.

**Returns and Exchanges**: Maryland regulations typically prohibit returns of cannabis products once they leave the dispensary, but product exchanges for quality issues (moldy product, broken packaging) may be permitted under your dispensary''s policies. Always follow your facility''s specific SOP, requiring manager approval, documenting the exchange reason thoroughly, and ensuring returned products are quarantined for proper disposal.

**Split Payments**: When patients pay with multiple methods (partial cash, partial debit), your POS must accurately record each payment type and amount, balance total payments to transaction amount, and generate appropriate documentation for cash handling and electronic payment reconciliation.

**System Downtime**: If your POS system experiences technical failure during business hours, immediately notify management and IT support, secure the dispensary (no sales can occur without POS functionality), document the downtime in your incident log, and never attempt manual sales or "catch-up" entries later—MCA requires real-time recording only.

## Daily Reconciliation Procedures

At the end of each shift or business day, dispensaries perform critical reconciliation:

**Till Balancing**: Count all cash in your till, compare to POS-recorded cash sales for your session, investigate and document any discrepancies (overages or shortages), and report significant variances to management immediately.

**Transaction Review**: Verify all transactions in POS match Metrc updates, confirm no pending or incomplete transactions remain, review void and return documentation for completeness, and ensure all supervisor approvals are properly recorded.

**Sales Reports**: Generate and review daily sales summary reports (total revenue by product category, tax collected, discounts applied, payment method breakdown), inventory movement reports (units sold by product type), and compliance reports (purchase limits approached, ID verification flags, any system errors).

## Common Challenges & Solutions

**Challenge**: POS and Metrc sync failures due to internet connectivity issues.  
**Solution**: Monitor system status indicators continuously, report sync errors immediately to IT/management, never override sync warnings, and follow contingency plans (may require closing until connectivity restored).

**Challenge**: Patients approaching or exceeding purchase limits mid-transaction.  
**Solution**: Check purchase history before beginning consultation (not during checkout), educate patients about their remaining limits proactively, suggest lower-potency alternatives if limits are close, and never attempt to circumvent limits through system manipulation.

**Challenge**: Pricing discrepancies between shelf labels and POS.  
**Solution**: Always honor the POS pricing (it''s the legal record), notify management immediately of discrepancies for correction, offer appropriate customer service remedy (discount, alternative product), and never manually override prices without manager approval.

## Conclusion

Point of Sale system proficiency is non-negotiable for dispensary employees—it''s where compliance, customer service, and business operations converge. Every transaction you process creates a permanent legal record that must withstand MCA scrutiny, satisfy Metrc tracking requirements, and reflect accurate inventory movement. Master your POS system, follow transaction procedures precisely, and understand that your attention to detail in every sale protects your dispensary''s license, ensures patient safety, and maintains the integrity of Maryland''s medical cannabis program.'
WHERE module_number = 9;

UPDATE course_modules SET content = '## Overview

Medical cannabis interacts with numerous prescription medications, over-the-counter drugs, and herbal supplements through complex pharmacological mechanisms—creating potential for dangerous adverse effects, reduced medication efficacy, or enhanced toxicity. As a dispensary employee, you occupy a critical position in patient safety: you''re often the last healthcare touchpoint before a patient consumes cannabis alongside their existing medications. While you cannot provide medical advice or diagnosis, you must recognize high-risk drug interaction scenarios, ask appropriate screening questions, and know when to refer patients to their physicians or pharmacists for professional guidance.

## Understanding Drug Interaction Mechanisms

Cannabis interacts with other drugs through several pathways:

**CYP450 Enzyme Inhibition**: THC and CBD inhibit cytochrome P450 enzymes (particularly CYP3A4, CYP2C9, CYP2C19) in the liver—the same enzymes responsible for metabolizing approximately 60% of prescription medications. When cannabis blocks these enzymes, other drugs accumulate to potentially toxic levels in the bloodstream because they''re broken down more slowly than expected.

**Additive Effects**: Cannabis compounds can amplify the effects of medications with similar mechanisms. For example, cannabis''s sedative properties add to those of benzodiazepines, opioids, or sleep medications—creating excessive drowsiness, respiratory depression, or impaired coordination far beyond what either substance produces alone.

**Blood Pressure and Heart Rate**: THC can increase heart rate and alter blood pressure, potentially interacting with cardiovascular medications, antihypertensives, and drugs affecting heart rhythm.

**Blood Sugar Effects**: Cannabis may affect glucose metabolism, potentially interacting with diabetes medications and causing unexpected hypoglycemia or hyperglycemia.

## High-Risk Medication Categories

Certain medication classes require extra caution with cannabis use:

**Blood Thinners (Anticoagulants)**: Warfarin, apixaban, rivaroxaban. Cannabis can significantly alter anticoagulant effects, increasing bleeding risk or causing dangerous clot formation. Patients on blood thinners require close INR monitoring by their physicians when starting cannabis.

**Sedatives and CNS Depressants**: Benzodiazepines (Xanax, Valium, Ativan), opioid pain medications (oxycodone, hydrocodone, morphine), sleep aids (Ambien, Lunesta), muscle relaxants. Cannabis intensifies sedation, raises fall risk in elderly patients, and can cause respiratory depression when combined with opioids.

**Antidepressants and Psychiatric Medications**: SSRIs, SNRIs, MAO inhibitors, antipsychotics, mood stabilizers. Cannabis may interfere with medication effectiveness, worsen psychiatric symptoms in some patients, or create serotonin syndrome when combined with certain antidepressants.

**Heart Medications**: Beta-blockers, calcium channel blockers, ACE inhibitors, digoxin, antiarrhythmics. Cannabis''s cardiovascular effects can counteract blood pressure control or interact with heart rhythm medications.

**Diabetes Medications**: Insulin, metformin, sulfonylureas. Cannabis may affect blood sugar unpredictably, requiring medication dose adjustments under physician supervision.

**Immunosuppressants**: Medications taken by transplant recipients or patients with autoimmune diseases. Cannabis may interact with these critical medications, affecting their blood levels and efficacy.

## Patient Screening Questions

During patient consultations, ask these essential screening questions:

"Are you currently taking any prescription medications?" (If yes, ask for a list or ask patient to show their medication bottles.)

"Has your doctor discussed using medical cannabis alongside your current medications?" (This reveals whether the patient''s physician is aware and involved.)

"Are you taking any blood thinners, heart medications, diabetes medications, or medications for anxiety, depression, or sleep?" (Highlights high-risk categories.)

"Do you take any herbal supplements or over-the-counter medications regularly?" (Many patients don''t consider these "real medications" but they can interact.)

"Have you experienced any unusual symptoms since starting cannabis—dizziness, excessive drowsiness, rapid heartbeat, changes in your other medications'' effectiveness?" (Identifies potential interactions already occurring.)

## Documentation and Communication Requirements

COMAR 10.62.28 requires dispensaries to maintain records of patient consultations and any safety concerns identified:

**Document Screening**: Note in your POS system or patient file if a patient disclosed high-risk medications, potential interaction concerns, or need for physician consultation.

**Provide Written Materials**: Give patients educational materials about cannabis-medication interactions, signs of adverse effects to watch for, and instructions to consult their physician before making changes.

**Referral Documentation**: When you refer a patient to speak with their physician or pharmacist about interactions, document the referral, the specific concern raised, and any products recommended pending medical clearance.

## When to Refer Patients

Always refer patients to their healthcare providers when:

The patient is taking any blood thinner, heart medication, diabetes medication, or immunosuppressant.

The patient is taking multiple CNS depressants (opioids + benzodiazepines + cannabis creates dangerous respiratory risk).

The patient reports their doctor is unaware they''re considering medical cannabis.

The patient has experienced unusual symptoms that could indicate an interaction.

The patient is pregnant, breastfeeding, or has serious medical conditions requiring complex medication management.

The patient is elderly (65+) and taking multiple medications (polypharmacy increases interaction risk).

## Education Without Medical Advice

You can educate patients about interaction risks without practicing medicine:

**Appropriate**: "Cannabis can interact with blood thinners. It''s important to discuss this with your doctor before starting medical cannabis so they can monitor you appropriately."

**Inappropriate**: "You should stop taking your blood thinner and use cannabis instead."

**Appropriate**: "Many patients on multiple medications find it helpful to start with low doses of cannabis and increase gradually while monitoring how they feel."

**Inappropriate**: "You don''t need to tell your doctor about using cannabis—it''s natural and safe."

**Appropriate**: "Some patients report that cannabis affects their diabetes medication. Your doctor may want to adjust your insulin dose."

**Inappropriate**: "Cannabis will cure your diabetes so you won''t need medication anymore."

## Common Challenges & Solutions

**Challenge**: Patient refuses to tell their doctor about cannabis use due to stigma or fear.  
**Solution**: Empathize with their concerns, explain that physicians need complete medication information for patient safety (not judgment), emphasize that doctors are increasingly knowledgeable about cannabis, and offer to provide educational materials the patient can share with their doctor.

**Challenge**: Patient insists their doctor "doesn''t believe in medical cannabis" or dismissed their questions.  
**Solution**: Validate their experience, suggest consulting a pharmacist (often more accessible), provide contact information for cannabis-friendly physicians in Maryland, and emphasize starting with very low doses and careful self-monitoring while they work on physician communication.

**Challenge**: Patient already experiencing potential interaction symptoms (excessive drowsiness, dizziness, bleeding).  
**Solution**: Take this seriously—recommend they contact their physician immediately, do not sell additional cannabis products until medical clearance obtained, document the interaction report thoroughly, and notify your dispensary manager for quality/safety tracking.

## Conclusion

Drug interactions with cannabis are real, potentially dangerous, and frequently underappreciated by patients who view cannabis as "natural and harmless." Your role is to identify interaction risks, educate patients appropriately, and facilitate communication with their physicians and pharmacists—always staying within your scope of practice as a dispensary employee. When in doubt, err on the side of caution: refer to healthcare providers, document thoroughly, and prioritize patient safety over making a sale. Your vigilance in this area protects patients, reduces liability for your dispensary, and upholds the professional standards of Maryland''s medical cannabis program.'
WHERE module_number = 10;

UPDATE course_modules SET content = '## Overview

Understanding cannabis cultivation—from seed germination to harvest and curing—provides dispensary employees with essential product knowledge that elevates patient consultations, enables informed recommendations, and builds credibility with discerning medical cannabis consumers. While you won''t be growing plants yourself (unless working at a licensed cultivation facility), comprehending cultivation methods, growing conditions, and their impact on final product quality allows you to explain strain differences, interpret certificate of analysis results, and appreciate the craftsmanship behind premium cannabis products. This knowledge transforms you from an order-taker into a trusted advisor who understands how cannabis is produced and what makes certain products superior.

## Cannabis Plant Lifecycle

The cannabis plant progresses through distinct growth stages, each requiring specific environmental conditions:

**Germination (3-10 days)**: Seeds crack open and develop taproots when exposed to moisture and warmth. Commercial cultivators use propagation techniques (cloning from mother plants) to ensure genetic consistency rather than growing from seed.

**Seedling Stage (2-3 weeks)**: Young plants develop initial leaves and root systems. This delicate stage requires careful light, humidity, and nutrient management to establish healthy plants.

**Vegetative Stage (3-16 weeks)**: Plants focus on developing strong stems, branches, and fan leaves—building the structure needed to support heavy flowers later. Cultivators manipulate light cycles (18-24 hours of light daily) and training techniques (topping, pruning, trellising) to shape plants for optimal yield.

**Flowering Stage (8-12 weeks)**: Triggered by reducing light to 12 hours daily (mimicking autumn), female plants develop resinous flowers (buds) rich in cannabinoids and terpenes. This is when THC, CBD, and aromatic compounds are produced. Growers monitor trichome development closely to determine ideal harvest timing.

**Harvest, Drying, and Curing (2-8 weeks)**: Plants are cut, hung upside down in climate-controlled rooms to dry slowly (preventing mold while preserving terpenes), then trimmed and placed in airtight containers for curing—allowing remaining moisture to distribute evenly and chlorophyll to break down, resulting in smooth, flavorful cannabis.

## Cultivation Methods and Their Impact on Quality

Different growing methods produce cannabis with distinct characteristics:

**Indoor Cultivation**: Grows cannabis in climate-controlled environments with artificial lighting (LED, HPS, CMH). Advantages include precise environmental control (temperature, humidity, CO₂, light spectrum), year-round production, pest management ease, and consistent product quality. Indoor cannabis often has higher cannabinoid content and pristine appearance but requires significant energy investment.

**Greenhouse Cultivation**: Combines natural sunlight with supplemental lighting and environmental controls. Offers lower energy costs than indoor, some climate control benefits, and larger plant sizes—producing cannabis with balanced cannabinoid/terpene profiles at mid-range pricing.

**Outdoor Cultivation**: Plants grow in natural soil under sunlight. Advantages include lowest production costs, sustainable practices, and larger yields per plant. However, outdoor cannabis faces weather variability, pest pressure, and seasonal limitations (one harvest annually in Maryland''s climate). Outdoor products often have lower cannabinoid potency but robust terpene profiles and are priced accessibly.

**Growing Medium**: Cultivators choose between soil (traditional, produces complex flavors), soilless media like coco coir (faster growth, easier nutrient control), and hydroponic/aeroponic systems (roots suspended in nutrient solution—maximizes growth speed and yield but requires technical expertise).

## Strain Genetics and Characteristics

Cannabis strains fall into three broad categories based on genetics:

**Indica-Dominant Strains**: Historically from Afghanistan, Pakistan, and India. These plants are shorter, bushier, with broad leaves and dense flowers. Patients often report indica strains provide relaxing, sedating, body-focused effects—commonly used for pain, insomnia, and muscle tension. Terpene profiles typically include myrcene (earthy), linalool (floral), and caryophyllene (spicy).

**Sativa-Dominant Strains**: Originating from equatorial regions (Mexico, Colombia, Thailand, Africa). These plants grow tall and lanky with narrow leaves and elongated flowers. Sativa strains are often associated with energizing, cerebral, uplifting effects—used for daytime symptom management, mood enhancement, and focus. Common terpenes include limonene (citrus), pinene (pine), and terpinolene (herbal).

**Hybrid Strains**: Crosses between indica and sativa genetics, bred to combine desirable traits from both. Modern cannabis is predominantly hybrid, with breeders selecting for specific cannabinoid ratios, terpene profiles, disease resistance, and growth characteristics. Hybrids offer balanced effects tailored to specific medical applications.

**Important Note**: Recent research suggests the indica/sativa classification is oversimplified—effects are primarily determined by cannabinoid and terpene profiles, not plant structure. Educate patients to focus on lab-tested chemical composition rather than relying solely on indica/sativa labels.

## Environmental Factors Affecting Cannabis Quality

Multiple cultivation factors influence final product quality:

**Light Intensity and Spectrum**: Cannabis requires high-intensity light for robust cannabinoid and terpene production. Full-spectrum lighting (including UV wavelengths) increases resin production and potency. Inadequate lighting produces low-potency cannabis with poor bud structure.

**Temperature and Humidity**: Ideal flowering temps are 68-77°F with humidity 40-50%. Excessive heat degrades terpenes (reducing aroma and flavor), while high humidity invites mold and bud rot. Low humidity causes plants to stress, reducing yields.

**Nutrients and Feeding**: Cannabis requires nitrogen, phosphorus, potassium, and micronutrients in specific ratios that change throughout the lifecycle. Proper feeding produces vigorous growth and rich cannabinoid profiles. Overfeeding ("nutrient burn") or deficiencies cause stressed plants and poor-quality product.

**Airflow and CO₂**: Adequate air circulation prevents mold, strengthens stems, and distributes CO₂ (which plants need for photosynthesis). Enhanced CO₂ levels (1200-1500 ppm) during flowering can significantly increase yields and potency in sealed indoor environments.

## Harvesting and Post-Harvest Processing

The final stages of cultivation are critical to product quality:

**Harvest Timing**: Cultivators examine trichomes (resin glands on flowers) under magnification. Clear trichomes indicate immature cannabis; cloudy/milky trichomes signal peak THC content; amber trichomes suggest THC degrading to CBN (more sedating). Harvest timing is adjusted based on desired effects.

**Drying**: Freshly cut cannabis contains 70-80% moisture and must be dried slowly (7-14 days) in controlled environments (60°F, 50% humidity) to prevent mold while preserving terpenes. Rapid drying produces harsh, less flavorful cannabis.

**Trimming**: Excess leaves (sugar leaves with fewer trichomes) are removed by hand or machine. Hand-trimmed cannabis is considered premium (preserves trichomes, better appearance) while machine-trimmed is more cost-effective but potentially damages delicate trichomes.

**Curing**: Dried cannabis is placed in airtight containers and "burped" (opened periodically) for 2-8 weeks. Curing breaks down remaining chlorophyll (eliminating harsh "green" taste), allows moisture to redistribute evenly, and develops complex flavors and smoother smoke. Well-cured cannabis is noticeably superior to quick-dried product.

## Common Challenges & Solutions

**Challenge**: Patients ask why certain strains are priced higher than others.  
**Solution**: Explain that premium pricing reflects cultivation method (indoor vs outdoor), genetics (rare strains, difficult-to-grow cultivars), labor intensity (hand-trimmed, small-batch), curing time, and potency/terpene content verified by lab testing.

**Challenge**: Patient complains product "doesn''t look as good" as photos they''ve seen online.  
**Solution**: Educate that appearance varies by growing method, trim style, and age—reassure that lab testing (COA) is the true quality indicator. Show the COA proving potency and safety regardless of aesthetic.

**Challenge**: Patient insists outdoor cannabis is "inferior" to indoor.  
**Solution**: Explain that outdoor cannabis offers excellent value, robust terpene profiles, and sustainable cultivation—while indoor provides higher potency and visual appeal. Both are quality products for different priorities and budgets.

## Conclusion

Cannabis cultivation knowledge empowers you to provide expert-level patient consultations, justify product pricing and variety, and appreciate the skill required to produce high-quality medical cannabis. Understanding how growing methods, genetics, environmental factors, and post-harvest processing affect final product allows you to speak confidently about why certain strains are recommended for specific conditions, what makes premium cannabis worth its price, and how patients can identify quality products. This expertise elevates your professional credibility and enhances patient trust in your recommendations.'
WHERE module_number = 11;

UPDATE course_modules SET content = '## Overview

Cannabis packaging and labeling in Maryland serve dual critical functions: protecting public safety through child-resistant, tamper-evident containers that prevent accidental ingestion, and providing comprehensive product information that enables informed patient decisions while satisfying stringent regulatory compliance requirements. Every package leaving your dispensary must meet Maryland Cannabis Administration (MCA) specifications for physical container standards, label content accuracy, diversion prevention features, and tracking integration with the Metrc system. Improper packaging or labeling violations can result in product recalls, dispensary fines, license suspension, and—most seriously—patient harm from inadequate information or accidental pediatric exposure.

## Child-Resistant Packaging Requirements

COMAR 10.62.32 mandates that all medical cannabis products sold to patients must be in child-resistant packaging as defined by the Poison Prevention Packaging Act (16 CFR 1700.20). This means packaging must be:

**Significantly difficult for children under 5 years old to open within a reasonable time**, while not being difficult for adults to use properly. Packaging is tested by having groups of children attempt to open containers—qualifying packaging must resist opening by 85% of tested children.

**Reclosable for products not intended for single use**: Multi-dose products like flower jars, edible packages, and concentrate containers must remain child-resistant after each opening and closing. Zip-lock bags and simple plastic containers do NOT qualify.

**Certified by accredited testing labs**: Your dispensary must only use packaging certified as meeting CPSC child-resistant standards. Containers should have certification documentation available for MCA inspection.

Common certified child-resistant packaging types include:
- Push-and-turn vials (pharmacy-style bottles for flower and edibles)
- Squeeze-and-slide containers (certain concentrate jars)
- Child-resistant exit bags (secondary packaging when patients purchase multiple items)

**Critical**: Single-serving edibles (e.g., one infused mint) may be in non-child-resistant primary packaging IF the dispensary places it in a child-resistant exit bag before the patient leaves—but many dispensaries require child-resistant packaging for all products regardless of size to eliminate any risk.

## Tamper-Evident Features

In addition to child resistance, all cannabis product packaging must include tamper-evident features that clearly show if the package has been opened or compromised after leaving the cultivation/processing facility:

**Seals and Shrink Bands**: Breakable stickers, heat-sealed shrink bands, or tear strips that are destroyed upon first opening. Once broken, they cannot be resealed invisibly.

**Purpose**: Tamper-evident packaging protects patients from product contamination, substitution, or adulteration between production and purchase. It also prevents employee theft or tampering with inventory.

**Inspection Requirement**: Dispensary staff must visually inspect every product''s tamper-evident seal before placing it on the shelf and again before selling to a patient. If a seal is broken, missing, or appears compromised, quarantine the product immediately and report to management for investigation.

## Mandatory Label Information

Maryland regulations require cannabis product labels to include specific information in clear, legible text. Every product label must display:

**Dispensary Information**: Dispensary name and license number, dispensary address and phone number. This identifies the legal seller and provides patient contact information for questions or concerns.

**Product Details**: Product name/strain name, product type (flower, concentrate, edible, topical, etc.), net weight or volume (e.g., "3.5 grams" or "100mg total"), batch/lot number (for traceability to cultivation/processing).

**Cannabinoid Content**: THC percentage or milligrams, CBD percentage or milligrams, total cannabinoid content (if applicable), and testing date. For edibles, both per-serving and per-package cannabinoid content must be clearly stated (e.g., "10mg THC per piece, 100mg THC total per package").

**Health and Safety Warnings** (must include specific language):
- "For Medical Use Only"
- "Keep out of reach of children and pets"
- "This product may impair the ability to drive or operate machinery. Use caution."
- "Women should not use cannabis products during pregnancy or while breastfeeding"
- Allergen information (if applicable—e.g., "Contains tree nuts")

**Metrc UID Tag**: Products must have the state-issued Metrc tracking tag attached or printed on the label, linking the product to Maryland''s seed-to-sale system. This unique identifier allows instant tracing from production to sale.

**Expiration or "Packaged On" Date**: Indicates product freshness and shelf life. Dispensaries should rotate inventory using FIFO (first in, first out) to ensure oldest products sell before expiration.

## Prohibited Label Content

Maryland prohibits certain content on cannabis product labels and packaging to prevent appeal to children and avoid unsubstantiated medical claims:

**Prohibited**:
- Cartoon characters, mascots, or images appealing to children
- Bright colors or designs that mimic popular candy brands
- Health claims ("cures cancer," "treats all pain," "FDA-approved")—cannabis is not FDA-approved for any condition
- False or misleading statements about effects, potency, or safety
- Images depicting cannabis consumption

**Required Restraint**: Packaging and labels should be professional, medical in appearance, and focused on accurate product information—not marketing hype. The goal is to look like medicine, not recreational candy.

## Diversion Prevention Through Packaging

Proper packaging plays a critical role in preventing diversion (illegal redistribution) of medical cannabis:

**Exit Bags**: When patients purchase products, place all items in an opaque, child-resistant exit bag before they leave the dispensary. This prevents public visibility of cannabis products and adds an additional child-resistant barrier.

**No Bulk Quantities**: Maryland limits patients to specific purchase amounts (typically one ounce of flower or equivalent per transaction). Packaging in smaller units (1/8 oz, 1/4 oz, 1/2 oz, 1 oz) helps enforce these limits and prevents dispensaries from inadvertently selling excessive quantities.

**Serialized Packaging**: Some dispensaries use numbered or barcoded exit bags that are recorded in the POS system, creating traceability for each patient''s purchase. This helps identify diversion if packages are discovered in illegal markets.

**Patient Education**: Remind patients during checkout to store their cannabis in the original packaging, keep it locked away from children and unauthorized individuals, and never share or sell their medicine to others (a felony offense).

## Labeling Accuracy and Compliance Checks

Dispensaries must verify label accuracy before selling products:

**Batch Verification**: Compare the product''s batch number on the label against the Certificate of Analysis (COA) from the testing lab. Confirm cannabinoid potency matches between label and COA. Any discrepancy indicates mislabeling and requires immediate quarantine.

**Expiration Date Monitoring**: Remove expired products from shelves immediately. Never sell expired cannabis—it may have degraded potency, mold growth, or safety concerns.

**Label Legibility**: Ensure all required information is clearly readable (not faded, smudged, or obscured). Replace damaged labels or packaging as needed.

**Metrc Tag Integrity**: Check that Metrc tags are securely attached and scannable. Loose or missing tags create compliance violations and break the chain of custody.

## Common Challenges & Solutions

**Challenge**: Product arrives from cultivator with damaged or missing tamper-evident seals.  
**Solution**: Quarantine the product immediately, document the issue with photos, notify the cultivator and your dispensary manager, and do not sell until the cultivator provides replacement product or resolves the issue.

**Challenge**: Patient requests to transfer product into their own container for convenience.  
**Solution**: Politely decline—Maryland law requires cannabis to remain in its original, labeled, child-resistant packaging at all times. Removing products from compliant packaging creates diversion risk and eliminates traceability.

**Challenge**: Label shows 20% THC but COA shows 18% THC for the same batch.  
**Solution**: This is a significant compliance violation. Quarantine the product, alert management immediately, notify the cultivator/processor, and report the discrepancy to MCA if required by your facility''s SOPs. Do not sell mislabeled products.

**Challenge**: Patient complains packaging is "too difficult to open" due to arthritis or disability.  
**Solution**: Empathize with their challenge and offer to open the package for them at the dispensary (while they''re present), then reseal in a compliant exit bag. Suggest they ask a trusted caregiver to assist with opening at home. Never provide non-compliant packaging as an alternative.

## Conclusion

Cannabis packaging and labeling requirements exist to protect public health—particularly children—while ensuring product quality, traceability, and informed patient decision-making. As a dispensary employee, your attention to packaging integrity, label accuracy, and compliance with child-resistant standards is essential to dispensary operations and patient safety. Always inspect packaging before sale, never compromise on child-resistant requirements, verify label accuracy against COAs, and educate patients about proper storage and handling. Your diligence in these areas prevents tragedies, protects your dispensary''s license, and upholds Maryland''s medical cannabis program standards.'
WHERE module_number = 12;

UPDATE course_modules SET content = '## Overview

Cash handling in the cannabis industry presents unique challenges due to federal banking restrictions that prevent most dispensaries from accessing traditional financial services. Despite cannabis being legal under Maryland state law, it remains a Schedule I controlled substance under federal law—meaning most banks, credit unions, and payment processors refuse to work with cannabis businesses to avoid potential federal prosecution or regulatory penalties. This forces Maryland dispensaries to operate as predominantly cash businesses, creating complex security risks, operational challenges, and stringent internal controls to prevent theft, fraud, and errors. Every dispensary employee handling cash must master precise cash management procedures to protect themselves, their colleagues, and the business.

## Federal Banking Restrictions and Cannabis

Understanding why cannabis businesses struggle with banking is critical:

**Federal Law Conflict**: Under the Controlled Substances Act, marijuana is federally illegal (Schedule I), making banks that serve cannabis businesses potentially liable for money laundering charges under the Bank Secrecy Act. Federal regulators can penalize financial institutions for processing "proceeds of illegal activity."

**SAFE Banking Act**: Federal legislation that would protect banks serving legal cannabis businesses has been proposed repeatedly but has not passed Congress as of 2024. Until federal banking protections become law, most cannabis businesses remain unbanked or underbanked.

**Limited Banking Access**: Some regional credit unions and small banks offer cannabis banking services but charge substantial fees (often 3-10% of deposits) and impose extensive compliance requirements. Even dispensaries with bank accounts typically cannot access credit cards, merchant services, or business loans—making cash the primary medium for customer transactions, vendor payments, and employee payroll.

**Consequences**: Dispensaries must maintain large amounts of cash on-site, increasing armed robbery risk, require expensive security systems and armored car services, face challenges paying taxes and business expenses in cash, and create logistical complexity for daily operations.

## Cash Handling Security Protocols

Dispensaries implement rigorous security measures to protect cash:

**Limited Cash Access**: Only authorized employees can access tills, safes, and cash counting areas. Many dispensaries use locked cash drawers that require manager keys, biometric access controls, and video surveillance of all cash handling areas. Never share cash access codes or keys with unauthorized individuals.

**Dual Control Procedures**: High-value cash operations (opening/closing safes, preparing deposits, large cash counts) require two employees to be present simultaneously. This prevents internal theft and provides witness verification of cash accuracy. One employee counts while the second observes and confirms—both sign documentation.

**Minimal Cash on Sales Floor**: Individual budtender tills contain only enough cash for making change during a shift (typically $200-$500 starting bank). Excess cash is removed regularly ("skimming") throughout the day and secured in the dispensary safe, minimizing loss if a robbery occurs.

**Concealed Cash Storage**: Cash is never left visible from outside the dispensary. Safes are located in secure back-of-house areas with reinforced walls, limited access, and extensive camera coverage. End-of-day deposits are prepared in private offices away from public view.

**Armored Car Services**: Most dispensaries contract with armored car companies (e.g., Garda, Loomis, Brinks) to transport cash deposits to banks or secure vaults. Armored car pickups are scheduled at varying times and never announced publicly to prevent targeted robberies.

## Till Management and Reconciliation

Each budtender operates an individual cash till during their shift:

**Opening Till Procedures**: At the start of your shift, count your starting cash bank (bills and coins by denomination) in the presence of a manager or witness, verify the amount matches the documented starting bank (e.g., $250.00), sign the till assignment sheet documenting your acceptance of the starting amount, and never accept a till if the starting cash doesn''t match expected amounts—report discrepancies immediately.

**During-Shift Cash Handling**: Accept only U.S. currency (no foreign bills, although some dispensaries accept cryptocurrency), verify bills are not counterfeit using UV lamps or counterfeit detection pens, provide accurate change to customers, and never leave your till unattended or allow others to access it. If you need to step away, lock your till and take the key with you.

**Closing Till Procedures**: At shift end or close of business, count all cash in your till by denomination (hundreds, fifties, twenties, tens, fives, ones, coins), complete a till reconciliation worksheet, compare your actual cash total against the POS system''s expected cash total (starting bank + cash sales - change given), calculate any overage (excess cash) or shortage (missing cash), and have a manager verify your count and sign off on the reconciliation.

**Expected Variances**: Small discrepancies (under $5) can occur due to counting errors or incorrect change given. Repeated shortages or large discrepancies trigger investigations for theft or procedural violations. Overages indicate you gave customers incorrect change (shortchanged them)—equally problematic.

## Counterfeit Detection

Dispensaries are targets for counterfeit currency due to high cash volumes:

**Visual Inspection**: Examine bills for proper color, texture (real currency has a distinct cotton-linen texture), clear portraits and borders, and embedded security threads (visible when held to light).

**UV Light Detection**: Real U.S. currency has UV-reactive security features. Under a UV lamp (blacklight), genuine bills display specific glowing patterns. Counterfeit bills typically glow entirely or lack proper UV features.

**Counterfeit Pens**: Iodine-based pens mark genuine currency one color and counterfeit (printed on regular paper) another. However, sophisticated counterfeiters use treated paper to defeat pens—UV detection is more reliable.

**Procedure if Counterfeit Detected**: If you suspect a bill is counterfeit, politely request an alternative payment method without accusing the customer ("I''m sorry, this bill isn''t passing our verification system. Do you have another form of payment?"), immediately notify your manager, set the suspected bill aside (don''t return it to the customer), and document the incident. Your dispensary may contact police if counterfeiting is suspected intentional.

## Deposit Preparation and Security

End-of-day cash deposits require meticulous procedures:

**Counting Environment**: Deposits are counted in a secure back office with camera coverage and limited access. Two employees are present (dual control). Doors are locked during counting.

**Denomination Organization**: Sort bills by denomination (hundreds, fifties, twenties, etc.), band each denomination in standard bank straps ($100 straps for twenties, $500 straps for hundreds), and organize coins in rolled tubes (standard bank rolls).

**Deposit Documentation**: Complete a detailed deposit slip listing bill counts by denomination and total, create a deposit receipt for business records, and prepare a sealed tamper-evident deposit bag. Both employees sign documentation attesting to the accuracy of the count and seal the bag.

**Armored Car Procedures**: When the armored car arrives, verify the guards'' credentials (ID badges, company uniforms), obtain a receipt for the deposit pickup, and never open the door unless you''ve confirmed the pickup schedule with dispatch. Some dispensaries use time-delay safes that armored car personnel access independently using coded combinations.

**Security During Deposit**: If your dispensary doesn''t use armored car service, two employees transport deposits to the bank together in an unmarked vehicle during business hours—never at predictable times, never alone, and never in a marked company vehicle. Avoid discussing deposit schedules or amounts in public.

## Internal Theft Prevention

Unfortunately, internal theft (employee stealing) is a significant risk in cash-intensive businesses:

**Signs of Potential Theft**: Cash shortages in specific employees'' tills repeatedly, employees living beyond their means suddenly, requests to work alone or unsupervised, reluctance to take time off or vacations (fear of detection during absence), and defensive behavior when questioned about discrepancies.

**Prevention Controls**: Random till audits mid-shift, covert surveillance systems, background checks for all employees handling cash, mandatory vacation policies (so someone else covers their duties, potentially revealing irregularities), and anonymous tip reporting systems.

**If Theft is Suspected**: Report concerns to management immediately (not to coworkers), document specific observations objectively without accusations, cooperate with internal investigations, and never confront suspected individuals directly—management and law enforcement handle investigations.

## Common Challenges & Solutions

**Challenge**: Customer becomes angry when you check their bills for counterfeits.  
**Solution**: Apologize politely and explain: "I apologize for the inconvenience—we''re required to verify all bills for security. We do this for every customer." Stay calm and professional. Most customers understand.

**Challenge**: Your till is $20 short at the end of the day.  
**Solution**: Recount carefully to confirm the shortage, immediately notify your manager (don''t try to cover it from your own pocket—that creates worse problems), document the shortage honestly on your reconciliation sheet, and reflect on potential errors (incorrect change, missed transaction). Repeated shortages may result in disciplinary action or retraining.

**Challenge**: You discover your till has an extra $50 (overage).  
**Solution**: Never pocket overages—report them immediately. An overage means you likely shortchanged a customer, and it''s ethically wrong to keep their money. Management may attempt to identify the affected customer and return the funds.

**Challenge**: Armored car pickup is delayed, and closing managers need to leave with a large amount of cash.  
**Solution**: Follow your dispensary''s contingency procedures (may involve placing cash in time-delay safe, calling a backup armored service, or manager staying until pickup arrives). Never leave large amounts of cash unsecured overnight.

## Conclusion

Cash handling in cannabis dispensaries demands extreme precision, unwavering honesty, and rigorous adherence to security protocols. Every dollar you handle is tracked, verified, and reconciled multiple times—creating accountability that protects you from false accusations and protects the business from losses. Master your till management procedures, count cash meticulously, detect counterfeits vigilantly, and always follow dual-control requirements. The unusual banking challenges facing the cannabis industry make your cash handling skills critical to dispensary sustainability and security. Your integrity and attention to detail in this area directly impact your dispensary''s financial health and reputation.'
WHERE module_number = 13;