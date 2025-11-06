import React from 'react';
import { OnboardingWizard } from './OnboardingWizard';
import { BookOpen, Award, FileCheck, GraduationCap, Trophy } from 'lucide-react';

const steps = [
  {
    id: 'welcome',
    title: 'Welcome to ProCann Edu!',
    description: 'Your journey to cannabis industry certification',
    content: (
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-green-50 to-blue-50 p-6 rounded-lg text-center">
          <GraduationCap className="h-12 w-12 text-primary mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">Get Ready to Learn!</h3>
          <p className="text-muted-foreground">
            You're about to begin a comprehensive training program covering everything 
            you need to know about working in Maryland's cannabis industry.
          </p>
        </div>
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold mb-2">What You'll Learn:</h4>
          <ul className="space-y-1 text-sm">
            <li>✅ Cannabis fundamentals and product types</li>
            <li>✅ Maryland legal requirements and regulations</li>
            <li>✅ Customer service and responsible sales</li>
            <li>✅ Security and compliance procedures</li>
            <li>✅ Inventory management and METRC</li>
            <li>✅ Crisis management and safety protocols</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'course-structure',
    title: 'Understanding the Course',
    description: '18 modules organized in three tiers',
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          The course is divided into 18 modules, organized into three color-coded tiers. 
          You must complete all modules within each tier before advancing to the next.
        </p>
        <div className="space-y-3">
          <div className="p-4 border-l-4 border-green-500 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <h4 className="font-semibold text-green-800">Green Tier (Modules 0-5)</h4>
            </div>
            <p className="text-sm text-green-700">
              Foundation: Cannabis basics, legal framework, product types, and customer service
            </p>
          </div>
          <div className="p-4 border-l-4 border-yellow-500 bg-yellow-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <h4 className="font-semibold text-yellow-800">Yellow Tier (Modules 6-11)</h4>
            </div>
            <p className="text-sm text-yellow-700">
              Compliance: Security procedures, inventory management, and customer verification
            </p>
          </div>
          <div className="p-4 border-l-4 border-red-500 bg-red-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <h4 className="font-semibold text-red-800">Red Tier (Modules 12-17)</h4>
            </div>
            <p className="text-sm text-red-700">
              Advanced: Crisis management, METRC system, and advanced compliance
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'modules',
    title: 'How Modules Work',
    description: 'Reading material, videos, and quizzes',
    content: (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <BookOpen className="h-8 w-8 text-primary mt-1" />
          <div>
            <h4 className="font-semibold mb-2">Each Module Contains:</h4>
            <p className="text-muted-foreground text-sm">
              Comprehensive reading material, optional video lessons, and a quiz 
              to test your understanding.
            </p>
          </div>
        </div>
        <div className="bg-muted p-4 rounded-lg space-y-3">
          <h4 className="font-semibold text-sm">Typical Module Flow:</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li><strong>Read the Content:</strong> Review detailed explanations and examples</li>
            <li><strong>Watch Videos:</strong> Some modules include supplementary videos</li>
            <li><strong>Take the Quiz:</strong> Answer 5-10 questions to demonstrate understanding</li>
            <li><strong>Pass to Continue:</strong> Must score 70% or higher to progress</li>
          </ol>
        </div>
        <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded">
          <p className="text-sm font-semibold text-blue-800">💡 Pro Tip</p>
          <p className="text-sm text-blue-700">
            You can retake quizzes as many times as needed. Use incorrect answers 
            as learning opportunities!
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'final-exam',
    title: 'The Final Exam',
    description: 'Your path to certification',
    content: (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <FileCheck className="h-8 w-8 text-primary mt-1" />
          <div>
            <h4 className="font-semibold mb-2">Earning Your Certificate</h4>
            <p className="text-muted-foreground text-sm">
              After completing all 23 modules, you'll take a comprehensive final exam 
              covering key concepts from across the entire course.
            </p>
          </div>
        </div>
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <h4 className="font-semibold">Exam Details:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li><strong>Questions:</strong> 40-50 multiple choice questions</li>
            <li><strong>Passing Score:</strong> 70% or higher</li>
            <li><strong>Time Limit:</strong> 90 minutes</li>
            <li><strong>Attempts:</strong> Can retake if needed (24hr wait between attempts)</li>
            <li><strong>Proctoring:</strong> Webcam monitoring required for integrity</li>
          </ul>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <p className="text-sm font-semibold text-yellow-800">📝 Exam Tips</p>
          <p className="text-sm text-yellow-700">
            Review module content before taking the exam. Focus on key regulations, 
            procedures, and best practices. Take your time and read questions carefully.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'certificate',
    title: 'Your Certificate',
    description: 'Official credential for employment',
    content: (
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-lg text-center">
          <Award className="h-12 w-12 text-primary mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">Official Certification</h3>
          <p className="text-muted-foreground">
            Upon passing the final exam, you'll receive an official certificate 
            proving your completion of this training program.
          </p>
        </div>
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <h4 className="font-semibold">Your Certificate Includes:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Unique certificate number for verification</li>
            <li>Your name and completion date</li>
            <li>Course name and certification type</li>
            <li>QR code for instant verification</li>
            <li>Issue and expiration dates</li>
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 border rounded-lg text-center">
            <Trophy className="h-6 w-6 text-primary mx-auto mb-2" />
            <h5 className="font-semibold text-sm">Downloadable PDF</h5>
            <p className="text-xs text-muted-foreground">Print or save digitally</p>
          </div>
          <div className="p-3 border rounded-lg text-center">
            <FileCheck className="h-6 w-6 text-primary mx-auto mb-2" />
            <h5 className="font-semibold text-sm">Publicly Verifiable</h5>
            <p className="text-xs text-muted-foreground">Employers can verify authenticity</p>
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-green-700">
            <strong>Email Delivery:</strong> Your certificate will be emailed to you immediately 
            after passing the exam. It will also be available for download in your dashboard.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'success-tips',
    title: 'Tips for Success',
    description: 'Make the most of your training',
    content: (
      <div className="space-y-4">
        <div className="bg-primary/10 p-6 rounded-lg">
          <h3 className="font-semibold text-lg mb-3">Study Smart, Not Just Hard</h3>
          <p className="text-muted-foreground text-sm">
            Follow these proven strategies to maximize your learning and complete 
            the course efficiently.
          </p>
        </div>
        <div className="space-y-3">
          <div className="p-3 bg-muted rounded-lg">
            <h5 className="font-semibold text-sm mb-1">⏰ Set a Schedule</h5>
            <p className="text-xs text-muted-foreground">
              Complete 2-3 modules per day. Most students finish in 5-7 days.
            </p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <h5 className="font-semibold text-sm mb-1">📖 Read Carefully</h5>
            <p className="text-xs text-muted-foreground">
              Don't rush through content. Understanding concepts makes quizzes easier.
            </p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <h5 className="font-semibold text-sm mb-1">📝 Take Notes</h5>
            <p className="text-xs text-muted-foreground">
              Write down key regulations, procedures, and terms. Useful for exam review.
            </p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <h5 className="font-semibold text-sm mb-1">🎥 Watch Videos</h5>
            <p className="text-xs text-muted-foreground">
              Video content reinforces reading material and provides visual examples.
            </p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <h5 className="font-semibold text-sm mb-1">❓ Ask Questions</h5>
            <p className="text-xs text-muted-foreground">
              Contact your Training Coordinator if you're stuck or confused about anything.
            </p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <h5 className="font-semibold text-sm mb-1">🏆 Celebrate Progress</h5>
            <p className="text-xs text-muted-foreground">
              Reward yourself after completing each tier. You're doing great!
            </p>
          </div>
        </div>
        <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg text-center">
          <p className="text-sm font-semibold mb-1">🎯 Ready to Begin!</p>
          <p className="text-sm text-muted-foreground">
            You're all set! Head to your dashboard and start with Module 0. 
            Good luck on your training journey!
          </p>
        </div>
      </div>
    )
  }
];

interface StudentOnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const StudentOnboarding: React.FC<StudentOnboardingProps> = ({ onComplete, onSkip }) => {
  return (
    <OnboardingWizard
      steps={steps}
      onComplete={onComplete}
      onSkip={onSkip}
      storageKey="onboarding_completed_student"
    />
  );
};
