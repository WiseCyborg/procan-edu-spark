import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, FileText, Video, BookOpen, Clock } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useUserProgress } from '@/hooks/useUserProgress';
import { VideoPlayer } from './VideoPlayer';
import { DocumentViewer } from './DocumentViewer';
import { InteractiveQuiz } from './InteractiveQuiz';
import CourseContent from './CourseContent';

interface ModuleContent {
  id: string;
  title: string;
  description: string;
  videoUrl?: string;
  stoplight_tier?: 'green' | 'yellow' | 'red';
  documents: Array<{
    id: string;
    title: string;
    description?: string;
    url: string;
    type: 'pdf' | 'doc' | 'image' | 'link';
    size?: string;
    required?: boolean;
  }>;
  readingMaterial?: string;
  quiz: Array<{
    id: string;
    question: string;
    options: string[];
    correctAnswer: string;
    explanation?: string;
    points?: number;
  }>;
  estimatedTime: number; // in minutes
  learningObjectives: string[];
}

const moduleContent: {[key: string]: ModuleContent} = {
  part0: {
    id: 'part0',
    title: 'Welcome & Course Orientation',
    description: 'Introduction to the MCA Dispensary Agent Training Program',
    videoUrl: 'https://vimeo.com/1096146284/e90b8e5dfc',
    stoplight_tier: 'green',
    documents: [
      {
        id: 'course-overview',
        title: 'Course Overview',
        description: 'Complete guide to the training program',
        url: '/training-handbook',
        type: 'link',
        required: true
      }
    ],
    readingMaterial: `
      <h3>Welcome to ProCann MCA Training</h3>
      <p>Welcome to the Maryland Cannabis Administration (MCA) Dispensary Agent Training Program. This comprehensive course is designed to prepare you for a successful career in Maryland's cannabis industry.</p>
      
      <h4>What You'll Learn</h4>
      <ul>
        <li><strong>Legal Compliance:</strong> Federal and Maryland cannabis laws (COMAR 14.17.05)</li>
        <li><strong>Operations & Safety:</strong> Standard operating procedures and emergency response</li>
        <li><strong>Product Knowledge:</strong> Cannabis pharmacology and therapeutic applications</li>
        <li><strong>Customer Care:</strong> Responsible vendor practices and customer safety</li>
        <li><strong>Professional Excellence:</strong> Ethics, compliance, and industry best practices</li>
      </ul>
      
      <h4>Course Structure</h4>
      <p>The training is organized into 23 modules using the ProCann Stoplight Standard:</p>
      <ul>
        <li><strong>🟢 Green Tier (Modules 1-6):</strong> Foundational knowledge and compliance basics</li>
        <li><strong>🟡 Yellow Tier (Modules 7-12):</strong> Intermediate operations and product knowledge</li>
        <li><strong>🔴 Red Tier (Modules 13-18):</strong> Advanced topics and specialized training</li>
      </ul>
      
      <h4>Certification Requirements</h4>
      <p>To earn your MCA Dispensary Agent Certificate, you must:</p>
      <ul>
        <li>Complete all 23 modules with 80% or higher on each quiz</li>
        <li>Pass the comprehensive final exam (36 questions, 80% required)</li>
        <li>Complete photo verification and identity confirmation</li>
        <li>Maintain compliance with all MCA training requirements</li>
      </ul>
    `,
    quiz: [
      {
        id: 'q1',
        question: 'What is the minimum passing score for each module quiz?',
        options: ['70%', '75%', '80%', '90%'],
        correctAnswer: '80%',
        explanation: 'All module quizzes and the final exam require an 80% score to pass and demonstrate competency.',
        points: 10
      },
      {
        id: 'q2',
        question: 'How many modules must be completed before taking the final exam?',
        options: ['12 modules', '15 modules', '23 modules', 'Any 10 modules'],
        correctAnswer: '23 modules',
        explanation: 'All 23 modules must be completed successfully before you can access the comprehensive final exam.',
        points: 10
      }
    ],
    estimatedTime: 15,
    learningObjectives: [
      'Understand the overall structure and requirements of MCA training',
      'Learn about the Stoplight Standard tier system',
      'Identify the key topics covered in the certification program',
      'Recognize the steps needed to earn your dispensary agent certificate'
    ]
  },
  part1: {
    id: 'part1',
    title: 'Legal and Regulatory Foundations',
    description: 'Federal and Maryland cannabis laws - COMAR 14.17.05.A(1)',
    videoUrl: 'https://vimeo.com/1073070281',
    stoplight_tier: 'green',
    documents: [
      {
        id: 'md-laws-guide',
        title: 'Maryland Cannabis Laws Guide',
        description: 'Comprehensive guide to Maryland cannabis regulations',
        url: '/documents/maryland-cannabis-laws.pdf',
        type: 'pdf',
        size: '2.3 MB',
        required: true
      },
      {
        id: 'mca-website',
        title: 'Maryland Cannabis Administration',
        description: 'Official MCA website',
        url: 'https://mmcc.maryland.gov/',
        type: 'link',
        required: true
      }
    ],
    readingMaterial: `
      <h3>Maryland Cannabis Legal Framework</h3>
      <p>Maryland legalized adult-use cannabis in 2023, building upon its established medical cannabis program. Understanding the regulatory framework is crucial for responsible vendor operations.</p>
      
      <h4>Key Regulatory Bodies</h4>
      <ul>
        <li><strong>Maryland Cannabis Administration (MCA):</strong> Primary regulatory authority</li>
        <li><strong>State Police:</strong> Enforcement and compliance monitoring</li>
        <li><strong>Local Authorities:</strong> Zoning and local regulations</li>
      </ul>
      
      <h4>Possession Limits</h4>
      <ul>
        <li>Personal use: 1.5 oz of flower or equivalent</li>
        <li>Home cultivation: Up to 2 plants per adult (4 per household)</li>
        <li>Public consumption restrictions apply</li>
      </ul>
    `,
    quiz: [
      {
        id: 'q1',
        question: 'Which federal law classifies cannabis as a Schedule I drug?',
        options: ['Controlled Substances Act', 'Food and Drug Act', 'Tax Code'],
        correctAnswer: 'Controlled Substances Act',
        explanation: 'The Controlled Substances Act of 1970 placed cannabis in Schedule I, indicating high abuse potential and no accepted medical use at the federal level.',
        points: 10
      },
      {
        id: 'q2',
        question: "What is Maryland's legal possession limit for personal cannabis use?",
        options: ['1 oz', '1.5 oz', '2 oz'],
        correctAnswer: '1.5 oz',
        explanation: 'Maryland allows adults 21+ to possess up to 1.5 ounces of cannabis flower or equivalent amounts of other products.',
        points: 10
      },
      {
        id: 'q3',
        question: 'How often must dispensary agents complete RVT?',
        options: ['Every 6 months', 'Every 12 months', 'Every 2 years'],
        correctAnswer: 'Every 12 months',
        explanation: 'Responsible Vendor Training must be completed annually to maintain compliance with Maryland regulations.',
        points: 10
      }
    ],
    estimatedTime: 45,
    learningObjectives: [
      'Understand Maryland cannabis legal framework',
      'Identify key regulatory bodies and their roles',
      'Know possession limits and restrictions',
      'Recognize compliance requirements for vendors'
    ]
  },
  part2: {
    id: 'part2',
    title: 'Operational and Safety Procedures',
    description: 'Standard operating procedures and emergency response - COMAR 14.17.05.A(2)-(6)',
    videoUrl: 'https://vimeo.com/1073072061',
    stoplight_tier: 'green',
    documents: [
      {
        id: 'sop-template',
        title: 'SOP Template Library',
        url: '/documents/sop-templates.pdf',
        type: 'pdf',
        required: true
      }
    ],
    readingMaterial: `
      <h3>Standard Operating Procedures (SOPs)</h3>
      <p>SOPs are essential for compliance and operational excellence in cannabis dispensaries.</p>
      
      <h4>Key SOP Areas</h4>
      <ul>
        <li>Product receiving and inventory management</li>
        <li>Customer verification and sales protocols</li>
        <li>Security and access control procedures</li>
        <li>Record keeping and regulatory reporting</li>
        <li>Emergency response procedures</li>
      </ul>
    `,
    quiz: [
      {
        id: 'q1',
        question: 'What must SOPs include per COMAR?',
        options: ['General guidelines', 'Detailed operational steps', 'Employee names'],
        correctAnswer: 'Detailed operational steps',
        explanation: 'COMAR requires detailed, step-by-step procedures for consistency.',
        points: 10
      }
    ],
    estimatedTime: 40,
    learningObjectives: [
      'Understand the purpose and importance of SOPs',
      'Identify key areas requiring SOPs',
      'Learn SOP development best practices',
      'Know review and update requirements'
    ]
  },
  part3: {
    id: 'part3',
    title: 'Cannabis Products & Forms',
    description: 'Understanding product types and consumption methods',
    videoUrl: 'https://vimeo.com/1073072065',
    stoplight_tier: 'green',
    documents: [
      {
        id: 'product-guide',
        title: 'Product Knowledge Reference Guide',
        description: 'Complete guide to cannabis product types and their characteristics',
        url: '/documents/product-knowledge-guide.pdf',
        type: 'pdf',
        size: '2.8 MB',
        required: true
      },
      {
        id: 'consumption-methods',
        title: 'Consumption Methods Comparison Chart',
        description: 'Visual comparison of onset times, duration, and effects by method',
        url: '/documents/consumption-methods-chart.pdf',
        type: 'pdf',
        size: '1.2 MB',
        required: false
      }
    ],
    readingMaterial: `
      <h3>Cannabis Product Categories</h3>
      <p>Dispensaries offer various product forms to meet different customer needs and preferences.</p>
      
      <h4>Flower Products</h4>
      <ul>
        <li>Dried cannabis buds for smoking or vaporization</li>
        <li>Pre-rolls for convenience</li>
        <li>Different strains: Indica, Sativa, Hybrid</li>
      </ul>
      
      <h4>Concentrates</h4>
      <ul>
        <li>Oils, wax, shatter, live resin</li>
        <li>Higher potency than flower</li>
        <li>Used with vaporizers or dab rigs</li>
      </ul>
      
      <h4>Edibles & Ingestibles</h4>
      <ul>
        <li>Gummies, chocolates, baked goods</li>
        <li>Beverages and tinctures</li>
        <li>Delayed onset, longer duration</li>
      </ul>
      
      <h4>Topicals</h4>
      <ul>
        <li>Lotions, balms, patches</li>
        <li>Localized relief without psychoactive effects</li>
      </ul>
    `,
    quiz: [
      {
        id: 'q1',
        question: 'Which product type typically has the longest-lasting effects?',
        options: ['Flower', 'Edibles', 'Topicals', 'Vaporizers'],
        correctAnswer: 'Edibles',
        explanation: 'Edibles are metabolized slowly through the digestive system, resulting in effects that last 4-8 hours compared to 1-3 hours for inhaled products.',
        points: 10
      },
      {
        id: 'q2',
        question: 'What is the primary difference between Indica and Sativa strains?',
        options: ['Indica is energizing, Sativa is relaxing', 'Sativa is energizing, Indica is relaxing', 'They are exactly the same', 'Only color differs'],
        correctAnswer: 'Sativa is energizing, Indica is relaxing',
        explanation: 'Sativa strains typically provide energizing, uplifting effects, while Indica strains are associated with relaxing, sedating effects.',
        points: 10
      },
      {
        id: 'q3',
        question: 'Which consumption method has the fastest onset of effects?',
        options: ['Edibles', 'Tinctures', 'Inhalation (smoking/vaping)', 'Topicals'],
        correctAnswer: 'Inhalation (smoking/vaping)',
        explanation: 'Inhalation provides the fastest onset, with effects felt within 2-10 minutes as cannabinoids enter the bloodstream through the lungs.',
        points: 10
      },
      {
        id: 'q4',
        question: 'What are concentrates?',
        options: ['Diluted cannabis extracts', 'High-potency cannabis extracts', 'Low-THC products only', 'Synthetic cannabis'],
        correctAnswer: 'High-potency cannabis extracts',
        explanation: 'Concentrates are high-potency extracts that contain concentrated amounts of cannabinoids, typically 60-90% THC or CBD.',
        points: 10
      },
      {
        id: 'q5',
        question: 'Do topical cannabis products produce psychoactive effects?',
        options: ['Yes, always', 'No, they are absorbed locally', 'Only if applied to large areas', 'Only high-THC topicals do'],
        correctAnswer: 'No, they are absorbed locally',
        explanation: 'Topicals are absorbed through the skin and work locally without entering the bloodstream, so they do not produce psychoactive effects.',
        points: 10
      },
      {
        id: 'q6',
        question: 'Which product form is recommended for precise dosing control?',
        options: ['Pre-rolls', 'Tinctures', 'Flower', 'Smoking'],
        correctAnswer: 'Tinctures',
        explanation: 'Tinctures allow for precise dosing with measured droppers, making them ideal for consistent, controlled consumption.',
        points: 10
      }
    ],
    estimatedTime: 35,
    learningObjectives: [
      'Identify major cannabis product categories',
      'Understand consumption methods and their characteristics',
      'Learn about onset times and duration differences',
      'Know how to guide customers to appropriate products'
    ]
  },
  part4: {
    id: 'part4',
    title: 'Customer Service Excellence',
    description: 'Professional customer interactions and service standards',
    stoplight_tier: 'green',
    documents: [
      {
        id: 'customer-service-handbook',
        title: 'Customer Service Handbook',
        description: 'Best practices for professional customer interactions',
        url: '/documents/customer-service-handbook.pdf',
        type: 'pdf',
        size: '1.8 MB',
        required: true
      },
      {
        id: 'needs-assessment-tool',
        title: 'Customer Needs Assessment Tool',
        description: 'Structured approach to understanding customer requirements',
        url: '/documents/needs-assessment-tool.pdf',
        type: 'pdf',
        size: '800 KB',
        required: false
      }
    ],
    readingMaterial: `
      <h3>Professional Customer Service in Cannabis Retail</h3>
      <p>Exceptional customer service builds trust and ensures safe, responsible cannabis use.</p>
      
      <h4>First Impressions</h4>
      <ul>
        <li>Greet every customer warmly and professionally</li>
        <li>Assess experience level through respectful questions</li>
        <li>Create a welcoming, judgment-free environment</li>
      </ul>
      
      <h4>Needs Assessment</h4>
      <ul>
        <li>Ask about desired effects and experience level</li>
        <li>Understand any medical conditions or concerns</li>
        <li>Identify time of day and setting for use</li>
      </ul>
      
      <h4>Product Recommendations</h4>
      <ul>
        <li>Start low and go slow for new users</li>
        <li>Explain potency, onset times, and duration</li>
        <li>Provide clear dosing instructions</li>
        <li>Suggest appropriate consumption methods</li>
      </ul>
      
      <h4>Professional Boundaries</h4>
      <ul>
        <li>Do not provide medical advice</li>
        <li>Recommend consulting healthcare providers for medical questions</li>
        <li>Stay within your knowledge and training</li>
        <li>Know when to involve a manager or supervisor</li>
      </ul>
    `,
    quiz: [
      {
        id: 'q1',
        question: 'What is the recommended approach for new cannabis users?',
        options: ['Start high to feel effects', 'Start low and go slow', 'Try everything at once', 'Maximum dose for best experience'],
        correctAnswer: 'Start low and go slow',
        explanation: 'New users should start with low doses and increase gradually to avoid adverse effects and find their optimal dose.',
        points: 10
      },
      {
        id: 'q2',
        question: 'What should you do if a customer asks for medical advice?',
        options: ['Give your best guess', 'Recommend they consult a healthcare provider', 'Suggest the highest-rated product', 'Tell them cannabis cures everything'],
        correctAnswer: 'Recommend they consult a healthcare provider',
        explanation: 'Dispensary agents must not provide medical advice; customers should consult qualified healthcare professionals for medical guidance.',
        points: 10
      },
      {
        id: 'q3',
        question: 'What is the first step in a proper needs assessment?',
        options: ['Recommend the most expensive product', 'Ask about experience level and desired effects', 'Show them everything', 'Skip to checkout'],
        correctAnswer: 'Ask about experience level and desired effects',
        explanation: 'Understanding the customer\'s experience and goals allows you to provide appropriate, personalized recommendations.',
        points: 10
      },
      {
        id: 'q4',
        question: 'How should you handle a customer who appears intoxicated?',
        options: ['Serve them quickly', 'Refuse service politely', 'Give them extra products', 'Ignore the situation'],
        correctAnswer: 'Refuse service politely',
        explanation: 'Maryland law prohibits selling cannabis to visibly intoxicated individuals. Politely refuse service to ensure safety and compliance.',
        points: 10
      },
      {
        id: 'q5',
        question: 'What creates a welcoming customer experience?',
        options: ['Judgment and criticism', 'Rushing customers', 'Professional, respectful engagement', 'Ignoring questions'],
        correctAnswer: 'Professional, respectful engagement',
        explanation: 'A judgment-free, professional environment where customers feel comfortable asking questions creates the best experience.',
        points: 10
      },
      {
        id: 'q6',
        question: 'When should you involve a manager?',
        options: ['Never', 'For questions beyond your training or difficult situations', 'Only during emergencies', 'For every customer'],
        correctAnswer: 'For questions beyond your training or difficult situations',
        explanation: 'Know your limits and involve managers for complex medical questions, compliance issues, or challenging customer situations.',
        points: 10
      },
      {
        id: 'q7',
        question: 'What information should you gather during needs assessment?',
        options: ['Only payment method', 'Desired effects, experience level, and use context', 'Just their name', 'Nothing specific'],
        correctAnswer: 'Desired effects, experience level, and use context',
        explanation: 'Comprehensive needs assessment includes understanding desired effects, experience level, timing, and context to make appropriate recommendations.',
        points: 10
      }
    ],
    estimatedTime: 30,
    learningObjectives: [
      'Master professional customer greeting and needs assessment',
      'Learn to recommend appropriate products based on customer needs',
      'Understand professional boundaries and when to refer to healthcare providers',
      'Develop skills in creating a welcoming, educational customer experience'
    ]
  },
  part5: {
    id: 'part5',
    title: 'Inventory Management & Security',
    description: 'Track-and-trace systems and security protocols',
    stoplight_tier: 'green',
    documents: [
      {
        id: 'metrc-guide',
        title: 'METRC User Guide for Maryland',
        description: 'Complete guide to Maryland\'s track-and-trace system',
        url: '/documents/metrc-user-guide.pdf',
        type: 'pdf',
        size: '4.2 MB',
        required: true
      },
      {
        id: 'inventory-sop',
        title: 'Inventory Management SOP',
        description: 'Standard operating procedures for inventory control',
        url: '/documents/inventory-management-sop.pdf',
        type: 'pdf',
        size: '1.5 MB',
        required: true
      },
      {
        id: 'security-protocols',
        title: 'Security Protocols Checklist',
        description: 'Daily security compliance checklist',
        url: '/documents/security-protocols-checklist.pdf',
        type: 'pdf',
        size: '600 KB',
        required: false
      }
    ],
    readingMaterial: `
      <h3>Inventory Management in Cannabis Dispensaries</h3>
      <p>Proper inventory management ensures compliance with Maryland regulations and prevents diversion.</p>
      
      <h4>Track-and-Trace Requirements</h4>
      <ul>
        <li>Maryland uses METRC (Marijuana Enforcement Tracking Reporting Compliance)</li>
        <li>All products must be tracked from cultivation to sale</li>
        <li>Real-time inventory updates required</li>
        <li>Tag each package with unique RFID identifier</li>
      </ul>
      
      <h4>Receiving Procedures</h4>
      <ul>
        <li>Verify transport manifest matches delivery</li>
        <li>Inspect products for quality and compliance</li>
        <li>Update inventory system immediately</li>
        <li>Secure products in limited-access areas</li>
      </ul>
      
      <h4>Security Protocols</h4>
      <ul>
        <li>24/7 video surveillance with 90-day retention</li>
        <li>Limited access to inventory areas</li>
        <li>Alarm systems on all entry points</li>
        <li>Safe or vault for currency and high-value products</li>
        <li>Regular audits and inventory reconciliation</li>
      </ul>
      
      <h4>Reporting Discrepancies</h4>
      <ul>
        <li>Report theft or diversion to MCA within 24 hours</li>
        <li>Document all inventory discrepancies</li>
        <li>Investigate and correct errors promptly</li>
        <li>Maintain detailed records for inspections</li>
      </ul>
    `,
    quiz: [
      {
        id: 'q1',
        question: 'What tracking system does Maryland use for cannabis products?',
        options: ['BioTrack', 'METRC', 'Leafly', 'Weedmaps'],
        correctAnswer: 'METRC',
        explanation: 'Maryland uses METRC (Marijuana Enforcement Tracking Reporting Compliance) for seed-to-sale tracking of all cannabis products.',
        points: 10
      },
      {
        id: 'q2',
        question: 'How long must video surveillance be retained?',
        options: ['30 days', '60 days', '90 days', '1 year'],
        correctAnswer: '90 days',
        explanation: 'Maryland regulations require dispensaries to retain video surveillance footage for a minimum of 90 days.',
        points: 10
      },
      {
        id: 'q3',
        question: 'Within what timeframe must theft or diversion be reported to MCA?',
        options: ['12 hours', '24 hours', '48 hours', '1 week'],
        correctAnswer: '24 hours',
        explanation: 'Any theft, loss, or diversion of cannabis products must be reported to the Maryland Cannabis Administration within 24 hours.',
        points: 10
      },
      {
        id: 'q4',
        question: 'What must be done immediately upon receiving cannabis products?',
        options: ['Place on shelves', 'Update inventory system', 'Wait for manager', 'Leave in receiving area'],
        correctAnswer: 'Update inventory system',
        explanation: 'Inventory systems must be updated immediately upon receiving products to maintain accurate, real-time tracking.',
        points: 10
      },
      {
        id: 'q5',
        question: 'What type of identifier is used in METRC tracking?',
        options: ['Barcode only', 'RFID tag', 'Handwritten labels', 'Color codes'],
        correctAnswer: 'RFID tag',
        explanation: 'METRC uses RFID (Radio Frequency Identification) tags to uniquely identify and track each cannabis package.',
        points: 10
      },
      {
        id: 'q6',
        question: 'Where must cannabis inventory be stored?',
        options: ['Anywhere in the dispensary', 'Limited-access areas only', 'Customer-accessible areas', 'Unlocked storage rooms'],
        correctAnswer: 'Limited-access areas only',
        explanation: 'Cannabis inventory must be stored in limited-access areas with restricted entry to prevent theft and ensure security.',
        points: 10
      },
      {
        id: 'q7',
        question: 'What is required for receiving shipments?',
        options: ['Accept without checking', 'Verify manifest matches delivery', 'Sign and store immediately', 'Call police'],
        correctAnswer: 'Verify manifest matches delivery',
        explanation: 'All incoming shipments must be verified against the transport manifest to ensure accuracy and compliance before acceptance.',
        points: 10
      }
    ],
    estimatedTime: 40,
    learningObjectives: [
      'Understand Maryland\'s track-and-trace requirements using METRC',
      'Learn proper receiving and inventory management procedures',
      'Know security protocols including surveillance and access control',
      'Recognize reporting requirements for discrepancies and theft'
    ]
  },
  part6: {
    id: 'part6',
    title: 'Cannabis Pharmacology and Therapeutics',
    description: 'Active components, dosage forms, and therapeutic applications - COMAR 14.17.05 Topics 2-5',
    videoUrl: 'https://vimeo.com/1073072073',
    stoplight_tier: 'yellow',
    documents: [
      {
        id: 'pharmacology-guide',
        title: 'Cannabis Pharmacology Guide',
        description: 'Comprehensive guide to cannabinoids and their effects',
        url: '/documents/cannabis-pharmacology.pdf',
        type: 'pdf',
        size: '3.1 MB',
        required: true
      }
    ],
    readingMaterial: `
      <h3>Cannabis Pharmacology Fundamentals</h3>
      <p>Understanding the pharmacology of cannabis is essential for providing informed guidance to customers about product selection and use.</p>
      
      <h4>Active Components</h4>
      <ul>
        <li><strong>THC (Tetrahydrocannabinol):</strong> Primary psychoactive compound, responsible for the "high"</li>
        <li><strong>CBD (Cannabidiol):</strong> Non-intoxicating, potential therapeutic benefits</li>
        <li><strong>Minor Cannabinoids:</strong> CBG, CBN, CBC - emerging research on therapeutic effects</li>
        <li><strong>Terpenes:</strong> Aromatic compounds that influence effects and flavor profiles</li>
      </ul>
      
      <h4>Dosage Forms</h4>
      <ul>
        <li><strong>Flower:</strong> Inhalation, fast onset (minutes), 1-3 hour duration</li>
        <li><strong>Edibles:</strong> Oral ingestion, slow onset (30-120 min), 4-8 hour duration</li>
        <li><strong>Tinctures:</strong> Sublingual absorption, medium onset (15-45 min)</li>
        <li><strong>Topicals:</strong> Localized application, no psychoactive effects</li>
        <li><strong>Concentrates:</strong> High potency, various consumption methods</li>
      </ul>
      
      <h4>Potential Drug Interactions</h4>
      <p>Cannabis can interact with various medications including blood thinners, sedatives, and certain antidepressants. Always advise customers to consult healthcare providers.</p>
    `,
    quiz: [
      {
        id: 'q1',
        question: 'Which cannabinoid is primarily responsible for psychoactive effects?',
        options: ['CBD', 'THC', 'CBG', 'CBN'],
        correctAnswer: 'THC',
        explanation: 'THC (Tetrahydrocannabinol) is the primary psychoactive compound in cannabis that produces the "high" effect.',
        points: 10
      },
      {
        id: 'q2',
        question: 'Which dosage form typically has the slowest onset but longest duration?',
        options: ['Flower', 'Edibles', 'Tinctures', 'Vaporizers'],
        correctAnswer: 'Edibles',
        explanation: 'Edibles have a slow onset (30-120 minutes) due to digestive processing but can last 4-8 hours, much longer than other forms.',
        points: 10
      },
      {
        id: 'q3',
        question: 'What is CBD?',
        options: ['A psychoactive cannabinoid', 'A non-intoxicating cannabinoid', 'A type of terpene', 'A synthetic compound'],
        correctAnswer: 'A non-intoxicating cannabinoid',
        explanation: 'CBD (Cannabidiol) is a non-intoxicating cannabinoid that does not produce a "high" but may offer therapeutic benefits.',
        points: 10
      },
      {
        id: 'q4',
        question: 'What are terpenes?',
        options: ['Types of cannabinoids', 'Aromatic compounds that influence effects', 'Synthetic additives', 'Packaging materials'],
        correctAnswer: 'Aromatic compounds that influence effects',
        explanation: 'Terpenes are aromatic compounds found in cannabis that contribute to flavor, aroma, and can influence the overall effects.',
        points: 10
      },
      {
        id: 'q5',
        question: 'Which medication class can interact with cannabis?',
        options: ['Blood thinners', 'Vitamins only', 'Over-the-counter pain relievers only', 'None'],
        correctAnswer: 'Blood thinners',
        explanation: 'Cannabis can interact with blood thinners, sedatives, and other medications. Patients should consult healthcare providers.',
        points: 10
      },
      {
        id: 'q6',
        question: 'What is sublingual absorption?',
        options: ['Inhaling', 'Absorption under the tongue', 'Digesting', 'Topical application'],
        correctAnswer: 'Absorption under the tongue',
        explanation: 'Sublingual absorption occurs when tinctures are placed under the tongue, allowing cannabinoids to enter the bloodstream faster than digestion.',
        points: 10
      },
      {
        id: 'q7',
        question: 'What should customers be advised about drug interactions?',
        options: ['Ignore all concerns', 'Consult healthcare providers', 'Only worry about illegal drugs', 'Cannabis has no interactions'],
        correctAnswer: 'Consult healthcare providers',
        explanation: 'Customers taking medications should consult their healthcare providers about potential interactions with cannabis.',
        points: 10
      }
    ],
    estimatedTime: 45,
    learningObjectives: [
      'Identify major cannabinoids and their effects',
      'Understand different cannabis dosage forms and their characteristics',
      'Recognize potential therapeutic benefits and adverse effects',
      'Be aware of potential drug interactions and safety concerns'
    ]
  },
  part7: {
    id: 'part7',
    title: 'Medical Cannabis Fundamentals',
    description: 'Medical cannabis program, patient qualifications, and therapeutic applications',
    stoplight_tier: 'yellow',
    documents: [
      {
        id: 'medical-program-guide',
        title: 'Maryland Medical Cannabis Program Guide',
        description: 'Complete overview of the medical cannabis program',
        url: '/documents/medical-cannabis-program.pdf',
        type: 'pdf',
        size: '2.5 MB',
        required: true
      },
      {
        id: 'qualifying-conditions',
        title: 'Qualifying Conditions Reference',
        description: 'List of approved medical conditions and requirements',
        url: '/documents/qualifying-conditions.pdf',
        type: 'pdf',
        size: '1.1 MB',
        required: true
      },
      {
        id: 'patient-guidance',
        title: 'Patient Education Guide',
        description: 'Resource for educating medical cannabis patients',
        url: '/documents/patient-education-guide.pdf',
        type: 'pdf',
        size: '1.8 MB',
        required: false
      }
    ],
    readingMaterial: `
      <h3>Maryland Medical Cannabis Program</h3>
      <p>Maryland's medical cannabis program serves patients with qualifying conditions under physician supervision.</p>
      
      <h4>Qualifying Conditions</h4>
      <ul>
        <li>Chronic or severe pain</li>
        <li>Nausea and wasting syndrome</li>
        <li>Seizures and epilepsy</li>
        <li>Severe or persistent muscle spasms</li>
        <li>PTSD and anxiety disorders</li>
        <li>Glaucoma</li>
        <li>Cachexia or wasting syndrome</li>
        <li>Any other chronic or debilitating condition approved by MCA</li>
      </ul>
      
      <h4>Patient Registration</h4>
      <ul>
        <li>Must have Maryland medical cannabis ID card</li>
        <li>Written certification from registered physician</li>
        <li>Annual renewal required</li>
        <li>Caregiver registration for patients unable to visit dispensaries</li>
      </ul>
      
      <h4>Therapeutic Applications</h4>
      <ul>
        <li>Pain management - CBD and THC combinations</li>
        <li>Sleep disorders - indica-dominant strains</li>
        <li>Appetite stimulation - THC-rich products</li>
        <li>Anxiety relief - CBD-dominant or balanced products</li>
      </ul>
    `,
    quiz: [
      {
        id: 'q1',
        question: 'Which is a qualifying condition for Maryland medical cannabis?',
        options: ['Common cold', 'Chronic pain', 'Seasonal allergies', 'Minor headache'],
        correctAnswer: 'Chronic pain',
        explanation: 'Chronic or severe pain is one of the qualifying conditions under Maryland medical cannabis law.',
        points: 10
      },
      {
        id: 'q2',
        question: 'What is required for patients to access medical cannabis?',
        options: ['Just cash', 'Maryland medical cannabis ID card', 'Out-of-state ID', 'Nothing specific'],
        correctAnswer: 'Maryland medical cannabis ID card',
        explanation: 'Patients must have a Maryland medical cannabis ID card and written certification from a registered physician.',
        points: 10
      },
      {
        id: 'q3',
        question: 'How often must medical cannabis registration be renewed?',
        options: ['Every 6 months', 'Annually', 'Every 2 years', 'Never'],
        correctAnswer: 'Annually',
        explanation: 'Maryland medical cannabis patient registration must be renewed annually to maintain active status.',
        points: 10
      },
      {
        id: 'q4',
        question: 'What is a caregiver in the medical cannabis program?',
        options: ['A doctor', 'Someone who can purchase for patients unable to visit', 'A dispensary manager', 'A delivery driver'],
        correctAnswer: 'Someone who can purchase for patients unable to visit',
        explanation: 'Caregivers are registered individuals authorized to purchase medical cannabis on behalf of patients who cannot visit dispensaries.',
        points: 10
      },
      {
        id: 'q5',
        question: 'Which condition qualifies for medical cannabis?',
        options: ['Insomnia', 'PTSD', 'Common headache', 'Stress'],
        correctAnswer: 'PTSD',
        explanation: 'PTSD (Post-Traumatic Stress Disorder) is an approved qualifying condition for Maryland\'s medical cannabis program.',
        points: 10
      },
      {
        id: 'q6',
        question: 'What type of products are recommended for sleep disorders?',
        options: ['High-sativa strains', 'Indica-dominant strains', 'CBD-only products', 'Topicals'],
        correctAnswer: 'Indica-dominant strains',
        explanation: 'Indica-dominant strains are typically recommended for sleep disorders due to their relaxing, sedating effects.',
        points: 10
      }
    ],
    estimatedTime: 40,
    learningObjectives: [
      'Understand Maryland medical cannabis qualifying conditions',
      'Learn patient and caregiver registration requirements',
      'Recognize therapeutic applications for different conditions',
      'Know the difference between medical and adult-use programs'
    ]
  },
  part8: {
    id: 'part8',
    title: 'Dosing & Product Selection',
    description: 'Evidence-based dosing guidelines and personalized recommendations',
    stoplight_tier: 'yellow',
    documents: [
      {
        id: 'dosing-guidelines',
        title: 'Safe Dosing Guidelines Card',
        description: 'Quick reference for dosing recommendations',
        url: '/documents/dosing-guidelines.pdf',
        type: 'pdf',
        size: '900 KB',
        required: true
      },
      {
        id: 'product-selection-guide',
        title: 'Product Selection Decision Tree',
        description: 'Flow chart for helping customers choose appropriate products',
        url: '/documents/product-selection-guide.pdf',
        type: 'pdf',
        size: '1.4 MB',
        required: true
      }
    ],
    readingMaterial: `
      <h3>Cannabis Dosing Principles</h3>
      <p>Proper dosing is essential for safe and effective cannabis use.</p>
      
      <h4>Start Low, Go Slow</h4>
      <ul>
        <li>Begin with lowest effective dose (2.5-5mg THC)</li>
        <li>Wait 2-4 hours before additional edible doses</li>
        <li>Increase gradually by 2.5mg increments</li>
        <li>Individual tolerance varies significantly</li>
      </ul>
      
      <h4>Dosing by Product Type</h4>
      <ul>
        <li><strong>Flower:</strong> 0.25-0.5g for beginners, effects within minutes</li>
        <li><strong>Edibles:</strong> 2.5-5mg THC to start, 30-120 min onset</li>
        <li><strong>Tinctures:</strong> 2.5-5mg THC sublingually, 15-45 min onset</li>
        <li><strong>Topicals:</strong> Apply as needed, no psychoactive effects</li>
      </ul>
      
      <h4>Factors Affecting Response</h4>
      <ul>
        <li>Body weight and metabolism</li>
        <li>Tolerance and experience level</li>
        <li>Empty vs. full stomach (for edibles)</li>
        <li>THC:CBD ratio</li>
        <li>Individual endocannabinoid system</li>
      </ul>
    `,
    quiz: [
      {
        id: 'q1',
        question: 'What is the recommended starting dose for THC edibles?',
        options: ['1mg', '2.5-5mg', '10mg', '20mg'],
        correctAnswer: '2.5-5mg',
        explanation: 'The recommended starting dose for THC edibles is 2.5-5mg to minimize risk of adverse effects while finding effective dose.',
        points: 10
      },
      {
        id: 'q2',
        question: 'How long should customers wait before taking an additional edible dose?',
        options: ['30 minutes', '1 hour', '2-4 hours', '10 minutes'],
        correctAnswer: '2-4 hours',
        explanation: 'Edibles take 30-120 minutes to take effect. Waiting 2-4 hours prevents overconsumption from stacking doses.',
        points: 10
      },
      {
        id: 'q3',
        question: 'What does "start low, go slow" mean?',
        options: ['Use maximum dose immediately', 'Begin with lowest dose and increase gradually', 'Take breaks from cannabis', 'Only use once per month'],
        correctAnswer: 'Begin with lowest dose and increase gradually',
        explanation: '"Start low, go slow" means beginning with the lowest effective dose and increasing gradually to find the optimal amount.',
        points: 10
      },
      {
        id: 'q4',
        question: 'What factor affects how someone responds to cannabis?',
        options: ['Only age', 'Body weight, metabolism, and tolerance', 'Hair color', 'Time of year'],
        correctAnswer: 'Body weight, metabolism, and tolerance',
        explanation: 'Individual response varies based on body weight, metabolism, tolerance, endocannabinoid system, and other physiological factors.',
        points: 10
      },
      {
        id: 'q5',
        question: 'What is the recommended starting dose for flower?',
        options: ['1 gram', '0.25-0.5 grams', '2 grams', '5 grams'],
        correctAnswer: '0.25-0.5 grams',
        explanation: 'Beginners should start with 0.25-0.5 grams of flower to assess tolerance and avoid overconsumption.',
        points: 10
      },
      {
        id: 'q6',
        question: 'Does food intake affect edible absorption?',
        options: ['No effect', 'Yes, empty stomach speeds absorption', 'Only affects topicals', 'Only affects flower'],
        correctAnswer: 'Yes, empty stomach speeds absorption',
        explanation: 'Taking edibles on an empty stomach can speed absorption and intensify effects, while food can slow absorption.',
        points: 10
      },
      {
        id: 'q7',
        question: 'What should customers do if initial dose is ineffective?',
        options: ['Triple the dose immediately', 'Increase gradually in small increments', 'Give up on cannabis', 'Switch products randomly'],
        correctAnswer: 'Increase gradually in small increments',
        explanation: 'If initial dose is ineffective, increase gradually by 2.5mg increments over multiple sessions to find the effective dose.',
        points: 10
      }
    ],
    estimatedTime: 35,
    learningObjectives: [
      'Apply "start low, go slow" dosing principles',
      'Understand dosing guidelines for different product types',
      'Recognize factors that affect individual response',
      'Guide customers to appropriate starting doses based on experience'
    ]
  },
  part9: {
    id: 'part9',
    title: 'Effects & Adverse Reactions',
    description: 'Understanding desired effects, side effects, and managing adverse reactions',
    stoplight_tier: 'yellow',
    documents: [
      {
        id: 'effects-safety-sheet',
        title: 'Effects & Safety Information Sheet',
        description: 'Comprehensive guide to effects and safety protocols',
        url: '/documents/effects-safety-sheet.pdf',
        type: 'pdf',
        size: '1.6 MB',
        required: true
      },
      {
        id: 'adverse-reaction-protocol',
        title: 'Adverse Reaction Response Protocol',
        description: 'Step-by-step guide for handling customer adverse reactions',
        url: '/documents/adverse-reaction-protocol.pdf',
        type: 'pdf',
        size: '1.1 MB',
        required: true
      }
    ],
    readingMaterial: `
      <h3>Cannabis Effects and Safety</h3>
      <p>Understanding both therapeutic and adverse effects is crucial for customer safety.</p>
      
      <h4>Desired Therapeutic Effects</h4>
      <ul>
        <li>Pain relief and anti-inflammatory effects</li>
        <li>Relaxation and stress reduction</li>
        <li>Improved sleep quality</li>
        <li>Appetite stimulation</li>
        <li>Mood enhancement</li>
      </ul>
      
      <h4>Common Side Effects</h4>
      <ul>
        <li>Dry mouth (cottonmouth)</li>
        <li>Red or bloodshot eyes</li>
        <li>Increased appetite ("munchies")</li>
        <li>Mild drowsiness or fatigue</li>
        <li>Short-term memory impairment</li>
      </ul>
      
      <h4>Adverse Reactions</h4>
      <ul>
        <li><strong>Anxiety or Paranoia:</strong> Often from high-THC products</li>
        <li><strong>Rapid Heart Rate:</strong> Usually temporary, concerning for heart conditions</li>
        <li><strong>Dizziness or Lightheadedness:</strong> Sit or lie down, stay hydrated</li>
        <li><strong>Nausea:</strong> Can occur with overconsumption</li>
        <li><strong>Impaired Coordination:</strong> Do not drive or operate machinery</li>
      </ul>
      
      <h4>Managing Overconsumption</h4>
      <ul>
        <li>Stay calm - effects are temporary</li>
        <li>Find a comfortable, safe environment</li>
        <li>Hydrate with water</li>
        <li>Try CBD to counteract THC effects</li>
        <li>Seek medical attention if severe symptoms persist</li>
      </ul>
    `,
    quiz: [
      {
        id: 'q1',
        question: 'What should a customer do if they experience anxiety from cannabis?',
        options: ['Take more cannabis', 'Stay calm and wait for effects to pass', 'Drive home immediately', 'Ignore it completely'],
        correctAnswer: 'Stay calm and wait for effects to pass',
        explanation: 'Anxiety from cannabis is temporary; staying calm in a safe, comfortable environment helps the effects pass safely.',
        points: 10
      },
      {
        id: 'q2',
        question: 'What is a common side effect of cannabis use?',
        options: ['Increased saliva', 'Dry mouth', 'Improved vision', 'Permanent memory loss'],
        correctAnswer: 'Dry mouth',
        explanation: 'Dry mouth (cottonmouth) is one of the most common side effects of cannabis use and can be managed by staying hydrated.',
        points: 10
      },
      {
        id: 'q3',
        question: 'What can help counteract excessive THC effects?',
        options: ['More THC', 'CBD', 'Alcohol', 'Caffeine'],
        correctAnswer: 'CBD',
        explanation: 'CBD can help counteract the psychoactive effects of THC and reduce anxiety or paranoia from overconsumption.',
        points: 10
      },
      {
        id: 'q4',
        question: 'When should a customer seek medical attention?',
        options: ['For any dry mouth', 'If severe symptoms persist', 'Never necessary', 'After every use'],
        correctAnswer: 'If severe symptoms persist',
        explanation: 'While most cannabis effects are temporary, customers should seek medical attention if severe symptoms like rapid heart rate or extreme anxiety persist.',
        points: 10
      },
      {
        id: 'q5',
        question: 'What causes anxiety or paranoia from cannabis?',
        options: ['Low-CBD products', 'High-THC products', 'Topical use', 'CBD-only products'],
        correctAnswer: 'High-THC products',
        explanation: 'Anxiety and paranoia are typically associated with high-THC products, especially in sensitive individuals or with overconsumption.',
        points: 10
      },
      {
        id: 'q6',
        question: 'What should customers avoid after using cannabis?',
        options: ['Hydrating', 'Driving or operating machinery', 'Sitting down', 'Eating food'],
        correctAnswer: 'Driving or operating machinery',
        explanation: 'Cannabis impairs coordination and reaction time. Customers must not drive or operate machinery while under the influence.',
        points: 10
      },
      {
        id: 'q7',
        question: 'What is the "munchies"?',
        options: ['Nausea from cannabis', 'Increased appetite', 'Dry mouth', 'Dizziness'],
        correctAnswer: 'Increased appetite',
        explanation: 'The "munchies" refers to increased appetite, a common effect of THC that can be therapeutic for patients with appetite loss.',
        points: 10
      }
    ],
    estimatedTime: 40,
    learningObjectives: [
      'Identify desired therapeutic effects of cannabis',
      'Recognize common side effects and adverse reactions',
      'Know how to advise customers experiencing adverse effects',
      'Understand when to seek medical attention'
    ]
  },
  part10: {
    id: 'part10',
    title: 'Record Keeping & Documentation',
    description: 'Compliance documentation, transaction records, and regulatory reporting',
    stoplight_tier: 'yellow',
    documents: [
      {
        id: 'record-keeping-templates',
        title: 'Record Keeping Templates',
        description: 'Standard templates for compliance documentation',
        url: '/documents/record-keeping-templates.pdf',
        type: 'pdf',
        size: '2.2 MB',
        required: true
      },
      {
        id: 'retention-schedule',
        title: 'Document Retention Schedule',
        description: 'Retention requirements by document type',
        url: '/documents/retention-schedule.pdf',
        type: 'pdf',
        size: '900 KB',
        required: true
      }
    ],
    readingMaterial: `
      <h3>Record Keeping Requirements</h3>
      <p>Accurate documentation is essential for regulatory compliance and business operations.</p>
      
      <h4>Transaction Records</h4>
      <ul>
        <li>Customer ID verification logs</li>
        <li>Product purchased, quantity, and price</li>
        <li>Date, time, and transaction ID</li>
        <li>Agent who completed the sale</li>
        <li>METRC package tracking numbers</li>
      </ul>
      
      <h4>Inventory Documentation</h4>
      <ul>
        <li>Daily reconciliation of physical vs. system inventory</li>
        <li>Receive and transfer manifests</li>
        <li>Waste disposal logs</li>
        <li>Product returns and adjustments</li>
      </ul>
      
      <h4>Training & Personnel Records</h4>
      <ul>
        <li>Employee training completion certificates</li>
        <li>Annual RVT renewals</li>
        <li>Job descriptions and responsibilities</li>
        <li>Background check documentation</li>
      </ul>
      
      <h4>Retention Requirements</h4>
      <ul>
        <li>All records: minimum 4 years</li>
        <li>Video surveillance: 90 days</li>
        <li>Financial records: 7 years (IRS requirement)</li>
        <li>Readily accessible for MCA inspections</li>
      </ul>
    `,
    quiz: [
      {
        id: 'q1',
        question: 'How long must most dispensary records be retained?',
        options: ['1 year', '2 years', '4 years', '10 years'],
        correctAnswer: '4 years',
        explanation: 'Maryland requires most dispensary records to be retained for a minimum of 4 years to ensure compliance and audit readiness.',
        points: 10
      },
      {
        id: 'q2',
        question: 'What information must be recorded for each transaction?',
        options: ['Just the total amount', 'Only product names', 'ID verification, products, quantities, date/time, agent, tracking numbers', 'Only customer name'],
        correctAnswer: 'ID verification, products, quantities, date/time, agent, tracking numbers',
        explanation: 'Complete transaction records must include ID verification logs, products sold, quantities, date/time, responsible agent, and METRC tracking numbers.',
        points: 10
      },
      {
        id: 'q3',
        question: 'How long must financial records be retained?',
        options: ['4 years', '5 years', '7 years', '2 years'],
        correctAnswer: '7 years',
        explanation: 'Financial records must be retained for 7 years to comply with IRS requirements.',
        points: 10
      },
      {
        id: 'q4',
        question: 'What must be documented daily?',
        options: ['Only sales', 'Inventory reconciliation of physical vs. system', 'Only employee hours', 'Nothing daily'],
        correctAnswer: 'Inventory reconciliation of physical vs. system',
        explanation: 'Daily inventory reconciliation comparing physical counts to system records is required to identify discrepancies promptly.',
        points: 10
      },
      {
        id: 'q5',
        question: 'What training records must be maintained?',
        options: ['None required', 'Only manager training', 'All employee training certificates and annual RVT renewals', 'Only initial training'],
        correctAnswer: 'All employee training certificates and annual RVT renewals',
        explanation: 'Dispensaries must maintain training completion certificates and annual RVT renewals for all agents as proof of compliance.',
        points: 10
      },
      {
        id: 'q6',
        question: 'How must records be maintained for MCA inspections?',
        options: ['Digital only', 'Paper only', 'Readily accessible and organized', 'Off-site storage'],
        correctAnswer: 'Readily accessible and organized',
        explanation: 'Records must be readily accessible, well-organized, and immediately available for MCA inspections.',
        points: 10
      }
    ],
    estimatedTime: 35,
    learningObjectives: [
      'Understand transaction record requirements',
      'Know inventory documentation procedures',
      'Learn training and personnel record retention',
      'Recognize inspection readiness requirements'
    ]
  },
  part11: {
    id: 'part11',
    title: 'Quality Assurance & Testing',
    description: 'Product testing requirements, lab results interpretation, and quality control',
    stoplight_tier: 'yellow',
    documents: [
      {
        id: 'lab-testing-guide',
        title: 'Lab Testing Requirements Guide',
        description: 'Complete guide to Maryland testing requirements',
        url: '/documents/lab-testing-guide.pdf',
        type: 'pdf',
        size: '2.4 MB',
        required: true
      },
      {
        id: 'coa-interpretation',
        title: 'Certificate of Analysis (COA) Interpretation',
        description: 'How to read and understand lab test results',
        url: '/documents/coa-interpretation-guide.pdf',
        type: 'pdf',
        size: '1.7 MB',
        required: true
      }
    ],
    readingMaterial: `
      <h3>Cannabis Product Testing</h3>
      <p>Maryland requires comprehensive testing to ensure product safety and quality.</p>
      
      <h4>Required Tests</h4>
      <ul>
        <li><strong>Cannabinoid Potency:</strong> THC, CBD, and other cannabinoid levels</li>
        <li><strong>Microbial Contamination:</strong> Bacteria, mold, and fungus</li>
        <li><strong>Pesticide Residues:</strong> Ensure below action levels</li>
        <li><strong>Heavy Metals:</strong> Lead, arsenic, cadmium, mercury</li>
        <li><strong>Residual Solvents:</strong> For concentrates and extracts</li>
        <li><strong>Mycotoxins:</strong> Aflatoxins and other toxins</li>
      </ul>
      
      <h4>Understanding Lab Results</h4>
      <ul>
        <li>Total THC vs. Delta-9 THC</li>
        <li>CBD and minor cannabinoid levels</li>
        <li>Terpene profiles</li>
        <li>Pass/fail status for safety tests</li>
        <li>Batch and lot numbers</li>
      </ul>
      
      <h4>Failed Test Protocols</h4>
      <ul>
        <li>Products failing tests cannot be sold</li>
        <li>Must be destroyed under MCA supervision</li>
        <li>Notify MCA within 24 hours</li>
        <li>Investigate root cause</li>
      </ul>
    `,
    quiz: [
      {
        id: 'q1',
        question: 'What happens to products that fail required safety tests?',
        options: ['Can be sold at discount', 'Must be destroyed', 'Can be retested only', 'Returned to grower'],
        correctAnswer: 'Must be destroyed',
        explanation: 'Products failing safety tests must be destroyed under MCA supervision and cannot be sold to consumers under any circumstances.',
        points: 10
      },
      {
        id: 'q2',
        question: 'Which of the following is a required test for cannabis products?',
        options: ['Color analysis', 'Microbial contamination', 'Taste testing', 'Package weight'],
        correctAnswer: 'Microbial contamination',
        explanation: 'Microbial contamination testing for bacteria, mold, and fungus is a required safety test for all cannabis products in Maryland.',
        points: 10
      },
      {
        id: 'q3',
        question: 'What is the difference between Total THC and Delta-9 THC?',
        options: ['No difference', 'Total THC includes THCA that converts when heated', 'Delta-9 is synthetic', 'Total THC is less potent'],
        correctAnswer: 'Total THC includes THCA that converts when heated',
        explanation: 'Total THC includes both Delta-9 THC and THCA (which converts to THC when heated), representing the total potential psychoactive content.',
        points: 10
      },
      {
        id: 'q4',
        question: 'Within what timeframe must MCA be notified of failed test results?',
        options: ['Immediately', '24 hours', '1 week', '30 days'],
        correctAnswer: '24 hours',
        explanation: 'The MCA must be notified within 24 hours of receiving failed test results for any product batch.',
        points: 10
      },
      {
        id: 'q5',
        question: 'What does a Certificate of Analysis (COA) show?',
        options: ['Only THC levels', 'Comprehensive test results including potency and safety', 'Just the batch number', 'Only expiration date'],
        correctAnswer: 'Comprehensive test results including potency and safety',
        explanation: 'A COA provides comprehensive test results including cannabinoid potency, terpene profiles, and all required safety tests.',
        points: 10
      },
      {
        id: 'q6',
        question: 'Which heavy metals are tested for?',
        options: ['Only lead', 'Lead, arsenic, cadmium, mercury', 'Iron and zinc', 'No heavy metals testing'],
        correctAnswer: 'Lead, arsenic, cadmium, mercury',
        explanation: 'Maryland requires testing for four specific heavy metals: lead, arsenic, cadmium, and mercury to ensure product safety.',
        points: 10
      },
      {
        id: 'q7',
        question: 'What is tested on concentrates that is not required for flower?',
        options: ['Potency', 'Residual solvents', 'Microbial contamination', 'Heavy metals'],
        correctAnswer: 'Residual solvents',
        explanation: 'Concentrates and extracts require additional testing for residual solvents used in the extraction process.',
        points: 10
      }
    ],
    estimatedTime: 35,
    learningObjectives: [
      'Identify required product testing categories',
      'Understand how to read and interpret lab results',
      'Know protocols for failed test batches',
      'Explain potency and safety testing to customers'
    ]
  },
  part12: {
    id: 'part12',
    title: 'Packaging & Labeling Compliance',
    description: 'State-mandated packaging requirements, labeling standards, and child safety',
    stoplight_tier: 'yellow',
    documents: [
      {
        id: 'packaging-labeling-standards',
        title: 'Packaging & Labeling Standards Manual',
        description: 'Complete guide to Maryland packaging and labeling requirements',
        url: '/documents/packaging-labeling-standards.pdf',
        type: 'pdf',
        size: '2.6 MB',
        required: true
      },
      {
        id: 'label-checklist',
        title: 'Label Compliance Checklist',
        description: 'Quick reference checklist for required label elements',
        url: '/documents/label-compliance-checklist.pdf',
        type: 'pdf',
        size: '700 KB',
        required: false
      }
    ],
    readingMaterial: `
      <h3>Packaging and Labeling Requirements</h3>
      <p>Proper packaging and labeling protect consumers and ensure regulatory compliance.</p>
      
      <h4>Child-Resistant Packaging</h4>
      <ul>
        <li>All cannabis products must be in certified child-resistant containers</li>
        <li>Opaque or not easily readable from outside</li>
        <li>Resealable for multiple-use products</li>
        <li>Tested to CPSC standards</li>
      </ul>
      
      <h4>Required Label Information</h4>
      <ul>
        <li>Product name and type</li>
        <li>THC and CBD content in mg</li>
        <li>Net weight or volume</li>
        <li>Batch or lot number</li>
        <li>Harvest/manufacturing date</li>
        <li>Expiration or "best by" date</li>
        <li>List of ingredients (edibles)</li>
        <li>Allergen warnings</li>
        <li>Licensed dispensary name and license number</li>
      </ul>
      
      <h4>Required Warnings</h4>
      <ul>
        <li>"This product contains cannabis and is intended for adults 21+"</li>
        <li>"For use only by the person named on the label"</li>
        <li>"Do not drive or operate machinery"</li>
        <li>"Keep out of reach of children"</li>
        <li>"Women should not use during pregnancy or breastfeeding"</li>
      </ul>
      
      <h4>Prohibited Content</h4>
      <ul>
        <li>No false or misleading statements</li>
        <li>No health or therapeutic claims without FDA approval</li>
        <li>No cartoon characters or images appealing to children</li>
        <li>No resemblance to FDA-approved medications</li>
      </ul>
    `,
    quiz: [
      {
        id: 'q1',
        question: 'What type of packaging is required for all cannabis products?',
        options: ['Clear plastic bags', 'Child-resistant containers', 'Paper bags', 'Any sealed container'],
        correctAnswer: 'Child-resistant containers',
        explanation: 'All cannabis products must be sold in certified child-resistant packaging that meets CPSC standards.',
        points: 10
      },
      {
        id: 'q2',
        question: 'What information is NOT required on product labels?',
        options: ['THC content', 'Batch number', 'Customer name', 'Expiration date'],
        correctAnswer: 'Customer name',
        explanation: 'Customer names are not required on product labels. Required info includes potency, batch number, dates, ingredients, and warnings.',
        points: 10
      },
      {
        id: 'q3',
        question: 'Which warning statement is required on all cannabis products?',
        options: ['"This product is organic"', '"Keep out of reach of children"', '"Best product available"', '"FDA approved"'],
        correctAnswer: '"Keep out of reach of children"',
        explanation: 'All cannabis products must include the warning "Keep out of reach of children" along with other mandatory safety warnings.',
        points: 10
      },
      {
        id: 'q4',
        question: 'What is prohibited on cannabis product labels?',
        options: ['THC content', 'Cartoon characters', 'Batch numbers', 'Expiration dates'],
        correctAnswer: 'Cartoon characters',
        explanation: 'Cartoon characters and images appealing to children are strictly prohibited on cannabis product packaging and labels.',
        points: 10
      },
      {
        id: 'q5',
        question: 'What must edible product labels include?',
        options: ['Only THC content', 'Ingredients list and allergen warnings', 'Just the price', 'Only expiration date'],
        correctAnswer: 'Ingredients list and allergen warnings',
        explanation: 'Edible products must include a complete ingredients list and allergen warnings in addition to standard cannabis labeling requirements.',
        points: 10
      },
      {
        id: 'q6',
        question: 'Can health claims be made on cannabis product labels?',
        options: ['Yes, any claims', 'No, unless FDA approved', 'Yes, if they sound good', 'Only for medical products'],
        correctAnswer: 'No, unless FDA approved',
        explanation: 'Health or therapeutic claims cannot be made on cannabis labels without FDA approval. False or misleading statements are prohibited.',
        points: 10
      },
      {
        id: 'q7',
        question: 'What standard must child-resistant packaging meet?',
        options: ['None required', 'CPSC standards', 'FDA standards', 'State standards only'],
        correctAnswer: 'CPSC standards',
        explanation: 'Child-resistant packaging must be tested and certified to meet CPSC (Consumer Product Safety Commission) standards.',
        points: 10
      }
    ],
    estimatedTime: 35,
    learningObjectives: [
      'Understand child-resistant packaging requirements',
      'Identify all required label information',
      'Know mandatory warning statements',
      'Recognize prohibited labeling content'
    ]
  },
  part13: {
    id: 'part13',
    title: 'Compliance Inspections & Audits',
    description: 'Preparing for regulatory inspections, audit procedures, and violation consequences',
    stoplight_tier: 'red',
    documents: [
      {
        id: 'inspection-checklist',
        title: 'Inspection Readiness Checklist',
        description: 'Comprehensive checklist to prepare for MCA inspections',
        url: '/documents/inspection-readiness-checklist.pdf',
        type: 'pdf',
        size: '1.4 MB',
        required: true
      },
      {
        id: 'audit-guide',
        title: 'Compliance Audit Preparation Guide',
        description: 'Step-by-step guide for audit preparation and response',
        url: '/documents/audit-preparation-guide.pdf',
        type: 'pdf',
        size: '2.1 MB',
        required: true
      }
    ],
    readingMaterial: `
      <h3>MCA Compliance Inspections</h3>
      <p>The Maryland Cannabis Administration conducts regular and unannounced inspections to ensure compliance.</p>
      
      <h4>Types of Inspections</h4>
      <ul>
        <li><strong>Routine Inspections:</strong> Scheduled annual compliance reviews</li>
        <li><strong>Unannounced Inspections:</strong> Random compliance checks</li>
        <li><strong>Complaint Investigations:</strong> Response to specific allegations</li>
        <li><strong>License Renewal Inspections:</strong> Pre-renewal compliance verification</li>
      </ul>
      
      <h4>What Inspectors Review</h4>
      <ul>
        <li>Security systems and surveillance</li>
        <li>Inventory tracking and METRC compliance</li>
        <li>Product storage and handling</li>
        <li>Employee training records</li>
        <li>Transaction logs and sales records</li>
        <li>ID verification procedures</li>
        <li>Packaging and labeling compliance</li>
      </ul>
      
      <h4>Inspection Best Practices</h4>
      <ul>
        <li>Remain professional and cooperative</li>
        <li>Do not interfere with inspector activities</li>
        <li>Provide requested documents promptly</li>
        <li>Take notes during the inspection</li>
        <li>Ask for clarification if needed</li>
        <li>Do not sign anything without reviewing carefully</li>
      </ul>
      
      <h4>Violation Consequences</h4>
      <ul>
        <li><strong>Minor Violations:</strong> Warning letter, corrective action plan</li>
        <li><strong>Moderate Violations:</strong> Fines, license suspension</li>
        <li><strong>Serious Violations:</strong> License revocation, criminal charges</li>
        <li>All violations become part of public record</li>
      </ul>
    `,
    quiz: [
      {
        id: 'q1',
        question: 'What should you do during an MCA inspection?',
        options: ['Refuse entry', 'Be professional and cooperative', 'Hide problem areas', 'Delay the inspector'],
        correctAnswer: 'Be professional and cooperative',
        explanation: 'Always remain professional and cooperative during inspections, providing requested documents promptly while respecting the inspection process.',
        points: 10
      },
      {
        id: 'q2',
        question: 'What type of inspection can happen without notice?',
        options: ['Routine inspections only', 'Unannounced inspections', 'License renewal inspections', 'None without notice'],
        correctAnswer: 'Unannounced inspections',
        explanation: 'The MCA can conduct unannounced inspections at any time as part of random compliance checks.',
        points: 10
      },
      {
        id: 'q3',
        question: 'Which area do inspectors typically review?',
        options: ['Only front desk', 'Security systems, inventory, records, training docs', 'Just product displays', 'Only financial records'],
        correctAnswer: 'Security systems, inventory, records, training docs',
        explanation: 'Inspectors comprehensively review security, inventory tracking (METRC), employee training, transaction records, and product handling.',
        points: 10
      },
      {
        id: 'q4',
        question: 'What is the consequence of serious violations?',
        options: ['Just a warning', 'License revocation or criminal charges', 'Small fine only', 'No consequences'],
        correctAnswer: 'License revocation or criminal charges',
        explanation: 'Serious violations can result in license revocation, criminal charges, and become part of public record.',
        points: 10
      },
      {
        id: 'q5',
        question: 'Should you sign inspection documents without reading them?',
        options: ['Yes, always sign immediately', 'No, review carefully before signing', 'Only sign if manager approves', 'Never sign anything'],
        correctAnswer: 'No, review carefully before signing',
        explanation: 'Never sign inspection documents without carefully reviewing them. Take time to understand what you\'re acknowledging.',
        points: 10
      },
      {
        id: 'q6',
        question: 'What should you do if you don\'t understand an inspector\'s question?',
        options: ['Guess the answer', 'Ask for clarification', 'Stay silent', 'Make something up'],
        correctAnswer: 'Ask for clarification',
        explanation: 'Always ask for clarification if you don\'t understand a question. Accuracy is more important than quick responses.',
        points: 10
      },
      {
        id: 'q7',
        question: 'What happens to minor violations?',
        options: ['License suspension immediately', 'Warning letter and corrective action plan', 'Criminal charges', 'Nothing happens'],
        correctAnswer: 'Warning letter and corrective action plan',
        explanation: 'Minor violations typically result in a warning letter and requirement to submit a corrective action plan.',
        points: 10
      }
    ],
    estimatedTime: 40,
    learningObjectives: [
      'Understand different types of compliance inspections',
      'Know what areas inspectors review',
      'Learn best practices during inspections',
      'Recognize violation consequences and corrective actions'
    ]
  },
  part14: {
    id: 'part14',
    title: 'Emergency Procedures & Incident Response',
    description: 'Emergency protocols, security incidents, and crisis management',
    stoplight_tier: 'red',
    documents: [
      {
        id: 'emergency-protocol',
        title: 'Emergency Response Protocol Manual',
        description: 'Comprehensive emergency response procedures',
        url: '/documents/emergency-response-protocol.pdf',
        type: 'pdf',
        size: '2.3 MB',
        required: true
      },
      {
        id: 'incident-report-forms',
        title: 'Incident Report Forms',
        description: 'Templates for documenting various incident types',
        url: '/documents/incident-report-forms.pdf',
        type: 'pdf',
        size: '1.2 MB',
        required: true
      }
    ],
    readingMaterial: `
      <h3>Emergency Procedures</h3>
      <p>Proper emergency response protects staff, customers, and cannabis inventory.</p>
      
      <h4>Security Incidents</h4>
      <ul>
        <li><strong>Robbery/Theft:</strong> Prioritize safety, do not resist, activate silent alarm</li>
        <li><strong>Suspicious Activity:</strong> Observe and report, do not confront</li>
        <li><strong>Trespassing:</strong> Request departure, call law enforcement if needed</li>
        <li><strong>Diversion Attempt:</strong> Deny transaction, document incident</li>
      </ul>
      
      <h4>Medical Emergencies</h4>
      <ul>
        <li>Call 911 immediately for serious conditions</li>
        <li>Provide first aid if trained and safe to do so</li>
        <li>Document the incident thoroughly</li>
        <li>Notify management</li>
        <li>Cannabis overconsumption: stay calm, monitor vital signs, seek medical help if severe</li>
      </ul>
      
      <h4>Fire and Natural Disasters</h4>
      <ul>
        <li>Evacuate building following posted routes</li>
        <li>Call 911 from safe location</li>
        <li>Account for all staff at assembly point</li>
        <li>Do not re-enter building</li>
        <li>Secure inventory if time and safety permit</li>
      </ul>
      
      <h4>Inventory Loss or Diversion</h4>
      <ul>
        <li>Report to MCA within 24 hours</li>
        <li>File police report</li>
        <li>Document circumstances thoroughly</li>
        <li>Update METRC system</li>
        <li>Conduct internal investigation</li>
      </ul>
    `,
    quiz: [
      {
        id: 'q1',
        question: 'What is the first priority during a robbery?',
        options: ['Protect inventory', 'Staff and customer safety', 'Call police', 'Lock doors'],
        correctAnswer: 'Staff and customer safety',
        explanation: 'Safety of people always comes first during security incidents. Do not resist robbery attempts - compliance keeps everyone safe.',
        points: 10
      },
      {
        id: 'q2',
        question: 'What should you do if you witness suspicious activity?',
        options: ['Confront the person', 'Observe and report', 'Ignore it', 'Chase them outside'],
        correctAnswer: 'Observe and report',
        explanation: 'Observe suspicious activity from a safe distance and report it to management and/or law enforcement. Do not confront.',
        points: 10
      },
      {
        id: 'q3',
        question: 'When should you call 911 for a medical emergency?',
        options: ['Never', 'Immediately for serious conditions', 'After trying everything else', 'Only if customer requests'],
        correctAnswer: 'Immediately for serious conditions',
        explanation: 'Call 911 immediately for any serious medical condition. Time is critical in medical emergencies.',
        points: 10
      },
      {
        id: 'q4',
        question: 'What is the proper response during a fire?',
        options: ['Fight the fire yourself', 'Evacuate following posted routes', 'Save inventory first', 'Wait for instructions'],
        correctAnswer: 'Evacuate following posted routes',
        explanation: 'During a fire, evacuate the building immediately using posted routes, call 911 from a safe location, and account for all staff.',
        points: 10
      },
      {
        id: 'q5',
        question: 'Within what timeframe must inventory theft be reported to MCA?',
        options: ['1 week', '24 hours', '72 hours', '30 days'],
        correctAnswer: '24 hours',
        explanation: 'Inventory loss, theft, or diversion must be reported to the MCA within 24 hours along with filing a police report.',
        points: 10
      },
      {
        id: 'q6',
        question: 'What should you do if a customer experiences cannabis overconsumption?',
        options: ['Sell them more product', 'Stay calm, monitor vital signs, seek help if severe', 'Tell them to go home', 'Ignore the situation'],
        correctAnswer: 'Stay calm, monitor vital signs, seek help if severe',
        explanation: 'For cannabis overconsumption, stay calm, monitor the person\'s vital signs, provide a safe environment, and seek medical help if symptoms are severe.',
        points: 10
      },
      {
        id: 'q7',
        question: 'Should you re-enter a building after evacuation?',
        options: ['Yes, to get personal items', 'No, never until cleared by authorities', 'Yes, to check on inventory', 'Only if the fire looks small'],
        correctAnswer: 'No, never until cleared by authorities',
        explanation: 'Never re-enter an evacuated building until it has been cleared as safe by fire department or other authorities.',
        points: 10
      }
    ],
    estimatedTime: 40,
    learningObjectives: [
      'Know proper response to security incidents',
      'Understand medical emergency protocols',
      'Learn evacuation and disaster procedures',
      'Recognize reporting requirements for incidents'
    ]
  },
  part15: {
    id: 'part15',
    title: 'Substance Use and Customer Safety',
    description: 'Recognizing substance use disorders and ensuring customer safety - COMAR 14.17.05 Topic 6',
    videoUrl: 'https://vimeo.com/1073072091',
    stoplight_tier: 'red',
    documents: [
      {
        id: 'substance-disorders',
        title: 'Substance Use Disorder Recognition',
        description: 'Guide to identifying symptoms and providing appropriate support',
        url: '/documents/substance-use-disorders.pdf',
        type: 'pdf',
        size: '2.8 MB',
        required: true
      }
    ],
    readingMaterial: `
      <h3>Substance Use Disorders and Customer Safety</h3>
      <p>As a dispensary agent, you play a critical role in promoting responsible cannabis use and recognizing when customers may need additional support or when a sale should be declined.</p>
      
      <h4>Signs of Substance Use Disorder</h4>
      <ul>
        <li>Increased tolerance - needing more product to achieve same effects</li>
        <li>Withdrawal symptoms when not using</li>
        <li>Failed attempts to cut down or control use</li>
        <li>Continued use despite negative consequences</li>
        <li>Spending excessive time obtaining, using, or recovering from use</li>
      </ul>
      
      <h4>Acute Intoxication Recognition</h4>
      <ul>
        <li>Impaired coordination and motor skills</li>
        <li>Slurred or confused speech</li>
        <li>Bloodshot eyes and dilated pupils</li>
        <li>Unusual behavior or decision-making</li>
        <li>Strong odor of cannabis</li>
      </ul>
      
      <h4>Appropriate Responses</h4>
      <ul>
        <li><strong>Limit Sales:</strong> Decline sales to visibly intoxicated individuals</li>
        <li><strong>Provide Resources:</strong> Offer information about treatment and support services</li>
        <li><strong>Educate:</strong> Share harm reduction strategies and safe use guidelines</li>
        <li><strong>Document:</strong> Keep records of declined sales and concerning interactions</li>
        <li><strong>Report:</strong> Follow company protocols for escalation when needed</li>
      </ul>
      
      <h4>Maryland Resources</h4>
      <ul>
        <li>SAMHSA National Helpline: 1-800-662-4357</li>
        <li>Maryland Department of Health Substance Abuse Services</li>
        <li>Local treatment facility referrals</li>
      </ul>
    `,
    quiz: [
      {
        id: 'q1',
        question: 'What should you do if a customer appears visibly intoxicated?',
        options: [
          'Proceed with the sale as normal',
          'Decline the sale and offer support resources',
          'Sell them a smaller amount',
          'Ignore it if they have a valid ID'
        ],
        correctAnswer: 'Decline the sale and offer support resources',
        explanation: 'You must decline sales to visibly intoxicated individuals to maintain safety and compliance, and should offer support resources.',
        points: 10
      },
      {
        id: 'q2',
        question: 'Which is a sign of potential substance use disorder?',
        options: [
          'First-time customer asking questions',
          'Increased tolerance requiring more product',
          'Purchasing different product types',
          'Shopping at multiple dispensaries'
        ],
        correctAnswer: 'Increased tolerance requiring more product',
        explanation: 'Increased tolerance - needing more product to achieve the same effects - is a key warning sign of substance use disorder.',
        points: 10
      },
      {
        id: 'q3',
        question: 'What is a sign of acute intoxication?',
        options: ['Clear speech', 'Impaired coordination and slurred speech', 'Normal behavior', 'Sharp focus'],
        correctAnswer: 'Impaired coordination and slurred speech',
        explanation: 'Acute intoxication signs include impaired coordination, slurred or confused speech, unusual behavior, and strong cannabis odor.',
        points: 10
      },
      {
        id: 'q4',
        question: 'What should you do if you recognize signs of substance use disorder in a customer?',
        options: ['Ignore it', 'Provide resources and educate on harm reduction', 'Ban them from the dispensary', 'Lecture them'],
        correctAnswer: 'Provide resources and educate on harm reduction',
        explanation: 'Offer information about treatment and support services, share harm reduction strategies, and maintain a supportive, non-judgmental approach.',
        points: 10
      },
      {
        id: 'q5',
        question: 'What is SAMHSA\'s National Helpline number?',
        options: ['911', '1-800-662-4357', '311', '1-888-555-1212'],
        correctAnswer: '1-800-662-4357',
        explanation: 'The SAMHSA National Helpline (1-800-662-4357) provides 24/7 free, confidential treatment referral and information services.',
        points: 10
      },
      {
        id: 'q6',
        question: 'Should you document interactions when you decline a sale due to intoxication?',
        options: ['No, not necessary', 'Yes, keep records of declined sales', 'Only if police are called', 'Only tell your manager verbally'],
        correctAnswer: 'Yes, keep records of declined sales',
        explanation: 'Document all declined sales and concerning interactions to maintain compliance records and protect the dispensary.',
        points: 10
      }
    ],
    estimatedTime: 50,
    learningObjectives: [
      'Recognize symptoms of substance use disorders',
      'Identify signs of acute intoxication in customers',
      'Know appropriate responses when concerns arise',
      'Understand when to decline sales and offer resources',
      'Be familiar with Maryland substance abuse support services'
    ]
  },
  part17: {
    id: 'part17',
    title: 'Responsible Vendor Training Program',
    description: 'Advanced customer service, ethics, and regulatory compliance - COMAR 14.17.05.C',
    videoUrl: 'https://vimeo.com/1073072103',
    stoplight_tier: 'red',
    documents: [
      {
        id: 'responsible-vendor',
        title: 'Responsible Vendor Certification Guide',
        description: 'Complete guide to responsible vendor practices and certification',
        url: '/documents/responsible-vendor-guide.pdf',
        type: 'pdf',
        size: '2.5 MB',
        required: true
      }
    ],
    readingMaterial: `
      <h3>Responsible Vendor Training Program</h3>
      <p>The Responsible Vendor Training Program, mandated by COMAR 14.17.05.C and Maryland's Alcoholic Beverages and Cannabis Article §§36-1001—36-1003, represents the highest standard of professional excellence for dispensary agents.</p>
      
      <h4>Program Components</h4>
      <ul>
        <li><strong>Advanced Customer Service:</strong> Exceptional communication and customer care</li>
        <li><strong>Sales Ethics:</strong> Responsible sales practices and refusal protocols</li>
        <li><strong>Regulatory Mastery:</strong> Deep understanding of MCA requirements</li>
        <li><strong>Product Expertise:</strong> Comprehensive knowledge for informed recommendations</li>
        <li><strong>Compliance Excellence:</strong> Record-keeping and reporting best practices</li>
      </ul>
      
      <h4>Certification Requirements</h4>
      <p>ProCann's Responsible Vendor Training Program is approved by the MCA for three years (COMAR 14.17.05.E(3)) and meets all minimum educational standards.</p>
      <ul>
        <li>Complete all required training modules</li>
        <li>Pass comprehensive assessments with 80% or higher</li>
        <li>Demonstrate competency in all program areas</li>
        <li>Maintain certification through annual renewal training</li>
      </ul>
      
      <h4>Record Retention</h4>
      <p>ProCann maintains all training records for four years as required by MCA regulations, ensuring seamless compliance for both you and your employer.</p>
      
      <h4>Professional Standards</h4>
      <ul>
        <li>Always verify customer age and ID authenticity</li>
        <li>Refuse sales when appropriate without hesitation</li>
        <li>Provide accurate product information and guidance</li>
        <li>Maintain customer confidentiality and privacy</li>
        <li>Report compliance concerns through proper channels</li>
        <li>Continue professional development and education</li>
      </ul>
    `,
    quiz: [
      {
        id: 'q1',
        question: 'How long is ProCann\'s Responsible Vendor Training Program approved by the MCA?',
        options: ['1 year', '2 years', '3 years', '5 years'],
        correctAnswer: '3 years',
        explanation: 'ProCann\'s program is approved by the MCA for three years as specified in COMAR 14.17.05.E(3).',
        points: 10
      },
      {
        id: 'q2',
        question: 'How long must training records be maintained?',
        options: ['1 year', '2 years', '3 years', '4 years'],
        correctAnswer: '4 years',
        explanation: 'Training records must be maintained for four years as required by MCA regulations.',
        points: 10
      }
    ],
    estimatedTime: 55,
    learningObjectives: [
      'Understand the Responsible Vendor Training Program requirements',
      'Master advanced customer service and sales ethics',
      'Demonstrate comprehensive regulatory knowledge',
      'Apply professional standards in all interactions',
      'Maintain compliance with certification and record-keeping requirements'
    ]
  },
  part16: {
    id: 'part16',
    title: 'Ethics & Professional Conduct',
    description: 'Professional ethics, customer privacy, and responsible business practices',
    stoplight_tier: 'red',
    documents: [],
    readingMaterial: `
      <h3>Professional Ethics in Cannabis Retail</h3>
      <p>Ethical conduct builds trust and maintains the integrity of Maryland's cannabis program.</p>
      
      <h4>Core Ethical Principles</h4>
      <ul>
        <li><strong>Integrity:</strong> Honest dealings with customers, colleagues, and regulators</li>
        <li><strong>Responsibility:</strong> Prioritize customer safety and community well-being</li>
        <li><strong>Respect:</strong> Treat all customers and colleagues with dignity</li>
        <li><strong>Compliance:</strong> Follow all laws and regulations without exception</li>
        <li><strong>Confidentiality:</strong> Protect customer and business information</li>
      </ul>
      
      <h4>Customer Privacy</h4>
      <ul>
        <li>HIPAA applies to medical cannabis patient information</li>
        <li>Do not discuss customer purchases publicly</li>
        <li>Secure storage of customer data</li>
        <li>Proper disposal of documents with personal information</li>
        <li>Limit data sharing to required regulatory reporting</li>
      </ul>
      
      <h4>Conflicts of Interest</h4>
      <ul>
        <li>Do not accept gifts or kickbacks from vendors</li>
        <li>Disclose personal interests in competing businesses</li>
        <li>Avoid self-dealing or preferential treatment</li>
        <li>Report suspected unethical conduct</li>
      </ul>
      
      <h4>Workplace Conduct</h4>
      <ul>
        <li>Never work under the influence of cannabis</li>
        <li>Report to work on time and properly attired</li>
        <li>Respect workplace diversity and inclusion</li>
        <li>Follow all company policies and procedures</li>
        <li>Maintain professional boundaries with customers and colleagues</li>
      </ul>
    `,
    quiz: [
      {
        id: 'q1',
        question: 'Which law protects medical cannabis patient information?',
        options: ['GDPR', 'HIPAA', 'FERPA', 'ADA'],
        correctAnswer: 'HIPAA',
        explanation: 'HIPAA (Health Insurance Portability and Accountability Act) protects medical cannabis patient information.',
        points: 10
      }
    ],
    estimatedTime: 35,
    learningObjectives: [
      'Understand core ethical principles for dispensary agents',
      'Learn customer privacy and HIPAA requirements',
      'Recognize conflicts of interest and how to avoid them',
      'Demonstrate professional workplace conduct'
    ]
  },
  part18: {
    id: 'part18',
    title: 'Final Exam Preparation & Review',
    description: 'Comprehensive review of all training topics and exam preparation',
    stoplight_tier: 'red',
    documents: [],
    readingMaterial: `
      <h3>Final Exam Overview</h3>
      <p>The comprehensive final exam tests your mastery of all 18 training modules and readiness to serve as a certified Maryland dispensary agent.</p>
      
      <h4>Exam Format</h4>
      <ul>
        <li>36 multiple-choice questions (2 from each module)</li>
        <li>80% passing score required (29 correct answers)</li>
        <li>90 minutes time limit</li>
        <li>Open upon completion of all 23 modules</li>
        <li>Photo verification required before starting</li>
      </ul>
      
      <h4>Key Topics to Review</h4>
      <ul>
        <li><strong>Legal & Regulatory (Modules 1-2):</strong> Maryland laws, COMAR regulations, MCA compliance</li>
        <li><strong>Operations (Modules 3-5):</strong> SOPs, products, customer service, inventory, security</li>
        <li><strong>Product Knowledge (Modules 6-9):</strong> Pharmacology, dosing, effects, medical cannabis</li>
        <li><strong>Compliance (Modules 10-14):</strong> Documentation, testing, packaging, inspections, emergencies</li>
        <li><strong>Professional Standards (Modules 15-17):</strong> Customer safety, responsible vendor, ethics</li>
      </ul>
      
      <h4>Study Tips</h4>
      <ul>
        <li>Review module summaries and learning objectives</li>
        <li>Retake module quizzes to identify weak areas</li>
        <li>Focus on Maryland-specific regulations and requirements</li>
        <li>Understand "why" behind rules, not just memorization</li>
        <li>Practice dose calculations and product recommendations</li>
      </ul>
      
      <h4>Certification Upon Passing</h4>
      <ul>
        <li>Immediate digital certificate with QR code verification</li>
        <li>Certificate includes your photo and MCA-approved stamp</li>
        <li>Valid for 12 months from issue date</li>
        <li>Employer receives notification of completion</li>
        <li>Certificate accessible in your student dashboard</li>
      </ul>
      
      <h4>If You Don't Pass</h4>
      <ul>
        <li>Review your results to identify areas needing improvement</li>
        <li>Retake relevant modules and quizzes</li>
        <li>Wait 24 hours before retaking exam</li>
        <li>Unlimited attempts to achieve passing score</li>
      </ul>
    `,
    quiz: [
      {
        id: 'q1',
        question: 'What percentage is required to pass the final exam?',
        options: ['70%', '75%', '80%', '90%'],
        correctAnswer: '80%',
        explanation: 'A score of 80% (29 out of 36 questions) is required to pass the final exam and earn certification.',
        points: 10
      },
      {
        id: 'q2',
        question: 'How long is the RVT certification valid?',
        options: ['6 months', '12 months', '2 years', 'Lifetime'],
        correctAnswer: '12 months',
        explanation: 'RVT certification is valid for 12 months and must be renewed annually.',
        points: 10
      }
    ],
    estimatedTime: 45,
    learningObjectives: [
      'Understand final exam format and requirements',
      'Review all key training topics comprehensively',
      'Apply effective study strategies for exam preparation',
      'Know certification process and validity period'
    ]
  }
};

const COURSE_ID = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b';

const EnhancedCourseModule: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [videoWatched, setVideoWatched] = useState(false);
  const [documentsViewed, setDocumentsViewed] = useState<string[]>([]);
  const [readingCompleted, setReadingCompleted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [moduleProgress, setModuleProgress] = useState(0);

  const { updateProgress, isModuleCompleted, getModuleProgress } = useUserProgress(COURSE_ID);
  
  const module = moduleId ? moduleContent[moduleId] : null;
  
  useEffect(() => {
    if (!module) {
      toast({
        title: "Module not found",
        description: "The requested module does not exist.",
        variant: "destructive",
      });
      navigate('/course');
      return;
    }

    // Calculate initial progress
    updateModuleProgress();
  }, [moduleId, videoWatched, documentsViewed, readingCompleted, quizCompleted]);

  const updateModuleProgress = () => {
    if (!module) return;

    let progress = 0;
    const totalSteps = 4; // video, documents, reading, quiz

    if (videoWatched || !module.videoUrl) progress += 25;
    if (documentsViewed.length >= module.documents.filter(d => d.required).length) progress += 25;
    if (readingCompleted) progress += 25;
    if (quizCompleted) progress += 25;

    setModuleProgress(progress);
  };

  const handleVideoComplete = () => {
    setVideoWatched(true);
    toast({
      title: "Video Complete",
      description: "You've watched the required portion of the video.",
    });
  };

  const handleDocumentView = (documentId: string) => {
    if (!documentsViewed.includes(documentId)) {
      setDocumentsViewed(prev => [...prev, documentId]);
    }
  };

  const handleQuizComplete = async (score: number, passed: boolean, timeSpent: number) => {
    setQuizCompleted(passed);
    
    try {
      await updateProgress(COURSE_ID, moduleId!, passed, score, timeSpent);
      
      if (passed) {
        toast({
          title: "Congratulations!",
          description: `Module completed with ${score}%!`,
        });
      } else {
        toast({
          title: "Quiz Not Passed",
          description: `You scored ${score}%. Try again to pass this module.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving progress:', error);
      toast({
        title: "Error",
        description: "Failed to save progress. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!module) {
    return <div>Module not found</div>;
  }

  const requiredDocuments = module.documents.filter(d => d.required);
  const allRequiredDocumentsViewed = requiredDocuments.every(d => documentsViewed.includes(d.id));
  const canTakeQuiz = (videoWatched || !module.videoUrl) && allRequiredDocumentsViewed && readingCompleted;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Module Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{module.title}</CardTitle>
              <p className="text-muted-foreground mt-2">{module.description}</p>
            </div>
            <div className="text-right">
              <div className="flex gap-2 mb-2">
                {module.stoplight_tier && (
                  <Badge 
                    className={`
                      ${module.stoplight_tier === 'green' && 'bg-stoplight-green text-white'} 
                      ${module.stoplight_tier === 'yellow' && 'bg-stoplight-yellow text-white'} 
                      ${module.stoplight_tier === 'red' && 'bg-stoplight-red text-white'}
                    `}
                  >
                    {module.stoplight_tier === 'green' && '🟢 Green Tier'}
                    {module.stoplight_tier === 'yellow' && '🟡 Yellow Tier'}
                    {module.stoplight_tier === 'red' && '🔴 Red Tier'}
                  </Badge>
                )}
                <Badge variant={isModuleCompleted(moduleId!) ? "default" : "secondary"}>
                  {isModuleCompleted(moduleId!) ? 'Completed' : 'In Progress'}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm text-muted-foreground">{module.estimatedTime} min</span>
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Module Progress</span>
              <span>{moduleProgress}%</span>
            </div>
            <Progress value={moduleProgress} />
          </div>
        </CardHeader>
      </Card>

      {/* Learning Objectives */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Learning Objectives</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {module.learningObjectives.map((objective, index) => (
              <li key={index} className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{objective}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Module Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="video" disabled={!module.videoUrl}>
            <Video className="w-4 h-4 mr-1" />
            Video
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="w-4 h-4 mr-1" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="quiz" disabled={!canTakeQuiz}>
            <BookOpen className="w-4 h-4 mr-1" />
            Quiz
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <CourseContent 
                content={module.readingMaterial || ''} 
                learningObjectives={module.learningObjectives}
                estimatedTime={module.estimatedTime}
                tier={module.stoplight_tier}
                onComplete={() => setReadingCompleted(true)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="video">
          {module.videoUrl && (
            <VideoPlayer
              videoUrl={module.videoUrl}
              title={module.title}
              onComplete={handleVideoComplete}
              requiredWatchPercentage={80}
            />
          )}
        </TabsContent>

        <TabsContent value="documents">
          <DocumentViewer
            documents={module.documents}
            onDocumentView={handleDocumentView}
            viewedDocuments={documentsViewed}
          />
        </TabsContent>

        <TabsContent value="quiz">
          <InteractiveQuiz
            questions={module.quiz}
            title={`${module.title} - Quiz`}
            timeLimit={30}
            passingScore={80}
            onQuizComplete={handleQuizComplete}
            allowRetry={true}
          />
        </TabsContent>
      </Tabs>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => navigate('/course')}>
          Back to Course
        </Button>
        
        {moduleProgress === 100 && (
          <Button onClick={() => navigate('/course')}>
            Return to Course Overview
          </Button>
        )}
      </div>
    </div>
  );
};

export default EnhancedCourseModule;