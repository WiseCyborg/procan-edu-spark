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
      <p>The training is organized into 18 modules using the ProCann Stoplight Standard:</p>
      <ul>
        <li><strong>🟢 Green Tier (Modules 1-6):</strong> Foundational knowledge and compliance basics</li>
        <li><strong>🟡 Yellow Tier (Modules 7-12):</strong> Intermediate operations and product knowledge</li>
        <li><strong>🔴 Red Tier (Modules 13-18):</strong> Advanced topics and specialized training</li>
      </ul>
      
      <h4>Certification Requirements</h4>
      <p>To earn your MCA Dispensary Agent Certificate, you must:</p>
      <ul>
        <li>Complete all 18 modules with 80% or higher on each quiz</li>
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
        options: ['12 modules', '15 modules', '18 modules', 'Any 10 modules'],
        correctAnswer: '18 modules',
        explanation: 'All 18 modules must be completed successfully before you can access the comprehensive final exam.',
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
        description: 'Ready-to-use templates for common dispensary operations',
        url: '/documents/sop-templates.pdf',
        type: 'pdf',
        size: '1.8 MB',
        required: true
      },
      {
        id: 'sop-checklist',
        title: 'SOP Compliance Checklist',
        description: 'Verification checklist for SOP implementation',
        url: '/documents/sop-checklist.pdf',
        type: 'pdf',
        size: '0.5 MB',
        required: false
      }
    ],
    readingMaterial: `
      <h3>Standard Operating Procedures (SOPs)</h3>
      <p>SOPs are detailed, written instructions to achieve uniformity in the performance of specific functions. They are essential for compliance and operational excellence.</p>
      
      <h4>Key SOP Areas</h4>
      <ul>
        <li>Product receiving and inventory</li>
        <li>Customer verification and sales</li>
        <li>Security protocols</li>
        <li>Record keeping and reporting</li>
        <li>Emergency procedures</li>
      </ul>
      
      <h4>SOP Best Practices</h4>
      <ul>
        <li>Clear, step-by-step instructions</li>
        <li>Regular review and updates</li>
        <li>Staff training and acknowledgment</li>
        <li>Documentation of deviations</li>
      </ul>
    `,
    quiz: [
      {
        id: 'q1',
        question: 'What must SOPs include per COMAR?',
        options: ['General guidelines', 'Detailed operational steps', 'Employee names'],
        correctAnswer: 'Detailed operational steps',
        explanation: 'COMAR requires SOPs to contain detailed, step-by-step operational procedures to ensure consistency and compliance.',
        points: 10
      },
      {
        id: 'q2',
        question: 'How often should SOPs be reviewed?',
        options: ['Monthly', 'Annually', 'Every 5 years'],
        correctAnswer: 'Annually',
        explanation: 'SOPs should be reviewed at least annually to ensure they remain current with regulations and best practices.',
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
              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: module.readingMaterial || '' }}
              />
              <div className="mt-6">
                <Button 
                  onClick={() => setReadingCompleted(true)}
                  disabled={readingCompleted}
                  className="w-full"
                >
                  {readingCompleted ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Reading Completed
                    </>
                  ) : (
                    'Mark Reading as Complete'
                  )}
                </Button>
              </div>
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