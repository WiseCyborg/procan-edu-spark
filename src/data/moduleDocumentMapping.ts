/**
 * Module-Document Mapping
 * Maps each of the 23 modules to their relevant reference documents
 */

export const moduleDocumentMapping: Record<string, string[]> = {
  // Module 1: Introduction to Maryland Cannabis Laws
  'part0': [
    'md-laws-guide',
    'responsible-vendor',
    'qualifying-conditions'
  ],
  
  // Module 2: Federal vs State Laws
  'part1': [
    'md-laws-guide',
    'compliance-framework'
  ],
  
  // Module 3: Age Verification and ID Checking
  'part2': [
    'id-verification-guide',
    'sop-manual'
  ],
  
  // Module 4: Product Knowledge - Flower
  'part3': [
    'product-guide',
    'consumption-methods',
    'lab-testing-guide'
  ],
  
  // Module 5: Product Knowledge - Concentrates
  'part4': [
    'product-guide',
    'consumption-methods',
    'coa-interpretation'
  ],
  
  // Module 6: Product Knowledge - Edibles
  'part5': [
    'product-guide',
    'dosing-guidelines',
    'effects-safety-sheet'
  ],
  
  // Module 7: Customer Service Excellence
  'part6': [
    'customer-service-handbook',
    'needs-assessment-tool',
    'product-selection-guide'
  ],
  
  // Module 8: Medical vs Adult-Use
  'part7': [
    'medical-program-guide',
    'qualifying-conditions',
    'patient-guidance'
  ],
  
  // Module 9: Cannabis Pharmacology
  'part8': [
    'pharmacology-guide',
    'dosing-guidelines',
    'effects-safety-sheet'
  ],
  
  // Module 10: Safe Consumption Guidance
  'part9': [
    'dosing-guidelines',
    'effects-safety-sheet',
    'adverse-reaction-protocol'
  ],
  
  // Module 11: METRC Track-and-Trace
  'part10': [
    'metrc-guide',
    'inventory-sop',
    'record-keeping-templates'
  ],
  
  // Module 12: Inventory Management
  'part11': [
    'inventory-sop',
    'metrc-guide',
    'security-protocols'
  ],
  
  // Module 13: Security Protocols
  'part12': [
    'security-protocols',
    'sop-manual',
    'emergency-response-procedures'
  ],
  
  // Module 14: Cash Handling
  'part13': [
    'sop-manual',
    'security-protocols',
    'record-keeping-templates'
  ],
  
  // Module 15: Packaging and Labeling
  'part14': [
    'packaging-labeling-standards',
    'label-checklist',
    'coa-interpretation'
  ],
  
  // Module 16: Record Keeping and Compliance
  'part15': [
    'record-keeping-templates',
    'retention-schedule',
    'audit-guide'
  ],
  
  // Module 17: Inspections and Audits
  'part16': [
    'inspection-checklist',
    'audit-guide',
    'record-keeping-templates'
  ],
  
  // Module 18: Emergency Procedures
  'part17': [
    'emergency-response-procedures',
    'adverse-reaction-protocol',
    'incident-report-forms'
  ],
  
  // Module 19: Recognizing Substance Use Disorders
  'part18': [
    'substance-disorders',
    'patient-guidance',
    'adverse-reaction-protocol'
  ],
  
  // Module 20: Quality Assurance
  'part19': [
    'lab-testing-guide',
    'coa-interpretation',
    'quality-standards'
  ],
  
  // Module 21: Advanced Compliance
  'part20': [
    'audit-guide',
    'inspection-checklist',
    'retention-schedule'
  ],
  
  // Module 22: Team Leadership
  'part21': [
    'sop-manual',
    'customer-service-handbook',
    'incident-report-forms'
  ],
  
  // Module 23: Final Review
  'part22': [
    'responsible-vendor',
    'md-laws-guide',
    'audit-guide'
  ]
};

/**
 * Get documents for a specific module
 */
export function getModuleDocuments(moduleId: string): string[] {
  return moduleDocumentMapping[moduleId] || [];
}

/**
 * Get all unique document IDs across all modules
 */
export function getAllDocumentIds(): string[] {
  const allIds = Object.values(moduleDocumentMapping).flat();
  return Array.from(new Set(allIds));
}
