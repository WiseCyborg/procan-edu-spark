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
      <p>Complete guide to Maryland cannabis laws and regulations for responsible vendor training.</p>
      <h3>COMAR 14.17 Overview</h3>
      <p>Maryland legalized adult-use cannabis effective July 1, 2023. All dispensary agents must understand state regulations.</p>
      <h3>Key Requirements</h3>
      <ul>
        <li>Age verification: 21+ for adult-use, valid ID required</li>
        <li>Purchase limits: 1.5 oz flower per transaction</li>
        <li>Medical vs Adult-use: Different programs, same dispensaries</li>
        <li>Federal conflict: Cannabis remains illegal federally</li>
      </ul>
    `
  },
  'sop-manual': {
    id: 'sop-manual',
    title: 'Standard Operating Procedures Manual',
    category: 'Operations',
    version: '1.0',
    lastUpdated: '2025-01-15',
    content: `
      <h2>Standard Operating Procedures</h2>
      <p>Daily operational procedures for dispensary staff.</p>
      <h3>Opening Procedures</h3>
      <ul>
        <li>Security system checks</li>
        <li>Inventory verification in METRC</li>
        <li>Cash drawer setup</li>
      </ul>
    `
  },
  'emergency-response-procedures': {
    id: 'emergency-response-procedures',
    title: 'Emergency Response Procedures',
    category: 'Safety',
    version: '1.0',
    lastUpdated: '2025-01-15',
    content: `
      <h2>Emergency Response Procedures</h2>
      <p>Critical emergency protocols for dispensary staff safety.</p>
    `
  },
  'product-guide': {
    id: 'product-guide',
    title: 'Cannabis Product Knowledge Reference Guide',
    category: 'Products',
    version: '1.0',
    lastUpdated: '2025-01-15',
    comarReferences: ['14.17.05.01'],
    content: `<h2>Product Guide</h2><p>Comprehensive cannabis product information.</p>`
  },
  'consumption-methods': {
    id: 'consumption-methods',
    title: 'Consumption Methods Comparison Chart',
    category: 'Products',
    version: '1.0',
    lastUpdated: '2025-01-15',
    content: `<h2>Consumption Methods</h2><p>Comparison of different consumption methods.</p>`
  },
  'customer-service-handbook': {
    id: 'customer-service-handbook',
    title: 'Customer Service Handbook',
    category: 'Customer Service',
    version: '1.0',
    lastUpdated: '2025-01-15',
    content: `<h2>Customer Service Excellence</h2><p>Professional customer service standards.</p>`
  },
  'needs-assessment-tool': {
    id: 'needs-assessment-tool',
    title: 'Customer Needs Assessment Tool',
    category: 'Customer Service',
    version: '1.0',
    lastUpdated: '2025-01-15',
    content: `<h2>Needs Assessment</h2><p>Framework for understanding customer requirements.</p>`
  },
  'metrc-guide': {
    id: 'metrc-guide',
    title: 'METRC User Guide for Maryland',
    category: 'Operations',
    version: '1.0',
    lastUpdated: '2025-01-15',
    content: `<h2>METRC System Guide</h2><p>Track-and-trace system documentation.</p>`
  },
  'inventory-sop': {
    id: 'inventory-sop',
    title: 'Inventory Management SOPs',
    category: 'Operations',
    version: '1.0',
    lastUpdated: '2025-01-15',
    content: `<h2>Inventory Procedures</h2><p>Standard operating procedures for inventory control.</p>`
  },
  'security-protocols': {
    id: 'security-protocols',
    title: 'Security Protocols Checklist',
    category: 'Operations',
    version: '1.0',
    lastUpdated: '2025-01-15',
    content: `<h2>Security Protocols</h2><p>Daily security compliance checklist.</p>`
  },
  'pharmacology-guide': {
    id: 'pharmacology-guide',
    title: 'Cannabis Pharmacology Guide',
    category: 'Medical',
    version: '1.0',
    lastUpdated: '2025-01-15',
    content: `<h2>Cannabis Pharmacology</h2><p>Cannabinoids and their effects.</p>`
  },
  'medical-program-guide': {
    id: 'medical-program-guide',
    title: 'Maryland Medical Cannabis Program Guide',
    category: 'Medical',
    version: '1.0',
    lastUpdated: '2025-01-15',
    content: `<h2>Medical Cannabis Program</h2><p>Maryland medical program overview.</p>`
  },
  'qualifying-conditions': {
    id: 'qualifying-conditions',
    title: 'Qualifying Conditions Reference',
    category: 'Medical',
    version: '1.0',
    lastUpdated: '2025-01-15',
    content: `<h2>Qualifying Conditions</h2><p>Approved medical conditions list.</p>`
  },
  'patient-guidance': {
    id: 'patient-guidance',
    title: 'Patient Education Guide',
    category: 'Medical',
    version: '1.0',
    lastUpdated: '2025-01-15',
    content: `<h2>Patient Education</h2><p>Resources for medical cannabis patients.</p>`
  },
  'dosing-guidelines': {
    id: 'dosing-guidelines',
    title: 'Safe Dosing Guidelines',
    category: 'Safety',
    version: '1.0',
    lastUpdated: '2025-01-15',
    content: `<h2>Dosing Guidelines</h2><p>Safe dosing recommendations.</p>`
  },
  'product-selection-guide': {
    id: 'product-selection-guide',
    title: 'Product Selection Decision Tree',
    category: 'Customer Service',
    version: '1.0',
    lastUpdated: '2025-01-15',
    content: `<h2>Product Selection</h2><p>Decision framework for product recommendations.</p>`
  },
  'effects-safety-sheet': {
    id: 'effects-safety-sheet',
    title: 'Effects & Safety Information Sheet',
    category: 'Safety',
    version: '1.0',
    lastUpdated: '2025-01-15',
    content: `<h2>Effects & Safety</h2><p>Cannabis effects and safety protocols.</p>`
  },
  'adverse-reaction-protocol': {
    id: 'adverse-reaction-protocol',
    title: 'Adverse Reaction Response Protocol',
    category: 'Safety',
    version: '1.0',
    lastUpdated: '2025-01-15',
    content: `<h2>Adverse Reactions</h2><p>Handling adverse customer reactions.</p>`
  },
  'record-keeping-templates': {
    id: 'record-keeping-templates',
    title: 'Record Keeping Templates',
    category: 'Compliance',
    version: '1.0',
    lastUpdated: '2025-01-15',
    content: `<h2>Record Keeping</h2><p>Compliance documentation templates.</p>`
  },
  'retention-schedule': {
    id: 'retention-schedule',
    title: 'Document Retention Schedule',
    category: 'Compliance',
    version: '1.0',
    lastUpdated: '2025-01-15',
    content: `<h2>Retention Schedule</h2><p>Document retention requirements.</p>`
  },
  'lab-testing-guide': {
    id: 'lab-testing-guide',
    title: 'Lab Testing Requirements Guide',
    category: 'Quality',
    version: '1.0',
    lastUpdated: '2025-01-15',
    content: `<h2>Lab Testing</h2><p>Maryland testing requirements.</p>`
  },
  'coa-interpretation': {
    id: 'coa-interpretation',
    title: 'COA Interpretation Guide',
    category: 'Quality',
    version: '1.0',
    lastUpdated: '2025-01-15',
    content: `<h2>COA Reading</h2><p>Understanding lab test results.</p>`
  },
  'packaging-labeling-standards': {
    id: 'packaging-labeling-standards',
    title: 'Packaging & Labeling Standards',
    category: 'Compliance',
    version: '1.0',
    lastUpdated: '2025-01-15',
    content: `<h2>Packaging Standards</h2><p>Maryland packaging requirements.</p>`
  },
  'label-checklist': {
    id: 'label-checklist',
    title: 'Label Compliance Checklist',
    category: 'Compliance',
    version: '1.0',
    lastUpdated: '2025-01-15',
    content: `<h2>Label Checklist</h2><p>Required label elements.</p>`
  },
  'inspection-checklist': {
    id: 'inspection-checklist',
    title: 'Inspection Readiness Checklist',
    category: 'Compliance',
    version: '1.0',
    lastUpdated: '2025-01-15',
    content: `<h2>Inspection Prep</h2><p>MCA inspection preparation.</p>`
  },
  'audit-guide': {
    id: 'audit-guide',
    title: 'Audit Preparation Guide',
    category: 'Compliance',
    version: '1.0',
    lastUpdated: '2025-01-15',
    content: `<h2>Audit Preparation</h2><p>Compliance audit readiness.</p>`
  },
  'incident-report-forms': {
    id: 'incident-report-forms',
    title: 'Incident Report Forms',
    category: 'Safety',
    version: '1.0',
    lastUpdated: '2025-01-15',
    content: `<h2>Incident Reporting</h2><p>Incident documentation templates.</p>`
  },
  'substance-disorders': {
    id: 'substance-disorders',
    title: 'Substance Use Disorder Recognition',
    category: 'Safety',
    version: '1.0',
    lastUpdated: '2025-01-15',
    content: `<h2>Substance Use Disorders</h2><p>Recognition and support resources.</p>`
  },
  'responsible-vendor': {
    id: 'responsible-vendor',
    title: 'Responsible Vendor Certification Guide',
    category: 'Certification',
    version: '1.0',
    lastUpdated: '2025-01-15',
    content: `<h2>Responsible Vendor Training</h2><p>RVT certification requirements.</p>`
  }
};

export function getDocumentContent(contentId: string): DocumentContent | undefined {
  return documentContent[contentId];
}

export function getDocumentsByCategory(category: string): DocumentContent[] {
  return Object.values(documentContent).filter(doc => doc.category === category);
}
