/**
 * Module-Document Mapping
 * Maps each of the 24 modules (0-23) to their relevant reference documents
 */

export const moduleDocumentMapping: Record<string, string[]> = {
  // Module 0: Welcome & Platform Orientation
  'part0': [
    'md-laws-guide',
    'responsible-vendor'
  ],
  
  // Module 1: Introduction to Maryland Cannabis Laws
  'part1': [
    'md-laws-guide',
    'responsible-vendor',
    'qualifying-conditions'
  ],
  
  // Module 2: Federal vs State Laws
  'part2': [
    'md-laws-guide',
    'compliance-framework'
  ],
  
  // Module 3: Age Verification and ID Checking
  'part3': [
    'id-verification-guide',
    'sop-manual'
  ],
  
  // Module 4: Product Knowledge - Flower
  'part4': [
    'product-guide',
    'consumption-methods',
    'lab-testing-guide'
  ],
  
  // Module 5: Product Knowledge - Concentrates
  'part5': [
    'product-guide',
    'consumption-methods',
    'coa-interpretation'
  ],
  
  // Module 6: Product Knowledge - Edibles
  'part6': [
    'product-guide',
    'dosing-guidelines',
    'effects-safety-sheet'
  ],
  
  // Module 7: Customer Service Excellence
  'part7': [
    'customer-service-handbook',
    'needs-assessment-tool',
    'product-selection-guide'
  ],
  
  // Module 8: Medical vs Adult-Use
  'part8': [
    'medical-program-guide',
    'qualifying-conditions',
    'patient-guidance'
  ],
  
  // Module 9: Cannabis Pharmacology
  'part9': [
    'pharmacology-guide',
    'dosing-guidelines',
    'effects-safety-sheet'
  ],
  
  // Module 10: Safe Consumption Guidance
  'part10': [
    'dosing-guidelines',
    'effects-safety-sheet',
    'adverse-reaction-protocol'
  ],
  
  // Module 11: METRC Track-and-Trace
  'part11': [
    'metrc-guide',
    'inventory-sop',
    'record-keeping-templates'
  ],
  
  // Module 12: Inventory Management
  'part12': [
    'inventory-sop',
    'metrc-guide',
    'security-protocols'
  ],
  
  // Module 13: Security Protocols
  'part13': [
    'security-protocols',
    'sop-manual',
    'emergency-response-procedures'
  ],
  
  // Module 14: Cash Handling
  'part14': [
    'sop-manual',
    'security-protocols',
    'record-keeping-templates'
  ],
  
  // Module 15: Packaging and Labeling
  'part15': [
    'packaging-labeling-standards',
    'label-checklist',
    'coa-interpretation'
  ],
  
  // Module 16: Record Keeping and Compliance
  'part16': [
    'record-keeping-templates',
    'retention-schedule',
    'audit-guide'
  ],
  
  // Module 17: Inspections and Audits
  'part17': [
    'inspection-checklist',
    'audit-guide',
    'record-keeping-templates'
  ],
  
  // Module 18: Emergency Procedures
  'part18': [
    'emergency-response-procedures',
    'adverse-reaction-protocol',
    'incident-report-forms'
  ],
  
  // Module 19: Recognizing Substance Use Disorders
  'part19': [
    'substance-disorders',
    'patient-guidance',
    'adverse-reaction-protocol'
  ],
  
  // Module 20: Quality Assurance
  'part20': [
    'lab-testing-guide',
    'coa-interpretation',
    'quality-standards'
  ],
  
  // Module 21: Advanced Compliance
  'part21': [
    'audit-guide',
    'inspection-checklist',
    'retention-schedule'
  ],
  
  // Module 22: Team Leadership
  'part22': [
    'sop-manual',
    'customer-service-handbook',
    'incident-report-forms'
  ],
  
  // Module 23: Final Review
  'part23': [
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
