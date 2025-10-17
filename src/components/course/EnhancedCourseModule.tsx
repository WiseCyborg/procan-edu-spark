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
  part1: {
    id: 'part1',
    title: 'Maryland Cannabis Laws & Regulations Overview',
    description: 'Understanding the legal framework governing cannabis in Maryland',
    videoUrl: '/videos/maryland-laws-overview.mp4',
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
    title: 'Standard Operating Procedures (SOPs)',
    description: 'Developing and implementing comprehensive SOPs for compliance',
    videoUrl: '/videos/sop-best-practices.mp4',
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
  }
  // Add more modules as needed...
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