import React from 'react';
import { OnboardingWizard } from './OnboardingWizard';
import { UserPlus, Ticket, Activity, MessageCircle, BookOpen } from 'lucide-react';

const steps = [
  {
    id: 'understanding-role',
    title: 'Your Role as Training Coordinator',
    description: 'Bridge between management and employees',
    content: (
      <div className="space-y-4">
        <div className="bg-primary/10 p-6 rounded-lg">
          <UserPlus className="h-12 w-12 text-primary mb-4" />
          <h3 className="font-semibold text-lg mb-2">You're the Training Champion!</h3>
          <p className="text-muted-foreground">
            As a Training Coordinator, you ensure employees complete their required training 
            and maintain compliance. You're the first point of contact for training questions.
          </p>
        </div>
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <h4 className="font-semibold">Your Key Responsibilities:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Invite new employees and assign training seats</li>
            <li>Monitor progress through all 18 modules</li>
            <li>Send reminders to keep employees on track</li>
            <li>Generate compliance reports for management</li>
            <li>Answer training-related questions</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'seat-allocation',
    title: 'Understanding Training Seats',
    description: 'How seat management works',
    content: (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Ticket className="h-8 w-8 text-primary mt-1" />
          <div>
            <h4 className="font-semibold mb-2">What Are Training Seats?</h4>
            <p className="text-muted-foreground text-sm">
              A "seat" is a training license that allows one employee to access the 
              18-module cannabis course. Your manager purchases seats, and you assign them.
            </p>
          </div>
        </div>
        <div className="grid gap-3">
          <div className="p-3 border-l-4 border-green-500 bg-green-50 rounded">
            <h5 className="font-semibold text-sm text-green-800">Available Seats</h5>
            <p className="text-xs text-green-700">Purchased but not yet assigned - ready to use</p>
          </div>
          <div className="p-3 border-l-4 border-blue-500 bg-blue-50 rounded">
            <h5 className="font-semibold text-sm text-blue-800">Assigned Seats</h5>
            <p className="text-xs text-blue-700">Given to a specific employee - they can now access training</p>
          </div>
          <div className="p-3 border-l-4 border-gray-500 bg-gray-50 rounded">
            <h5 className="font-semibold text-sm text-gray-800">Used Seats</h5>
            <p className="text-xs text-gray-700">Employee has started/completed training - cannot be reassigned</p>
          </div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <p className="text-sm font-semibold text-yellow-800">⚠️ Important</p>
          <p className="text-sm text-yellow-700">
            Once a seat is used, it cannot be given to someone else. Monitor your 
            available seat count and request more from your manager when needed.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'inviting-employees',
    title: 'Inviting Your First Employee',
    description: 'Step-by-step onboarding process',
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          There are two ways to onboard employees. Email invitation is recommended 
          for a professional, trackable process.
        </p>
        <div className="bg-muted p-4 rounded-lg space-y-3">
          <h4 className="font-semibold">Method 1: Email Invitation (Recommended)</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Go to the "Invite Employees" tab on your dashboard</li>
            <li>Enter the employee's email address</li>
            <li>Click "Send Invitation"</li>
            <li>Employee receives email with registration link</li>
            <li>Once they register, a seat is automatically assigned</li>
          </ol>
        </div>
        <div className="bg-muted p-4 rounded-lg space-y-3">
          <h4 className="font-semibold">Method 2: Share Access Key</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Get your organization's access key from your manager</li>
            <li>Share the key with employees (via text, email, or in person)</li>
            <li>Employees enter the key during registration</li>
            <li>Seat is automatically assigned when they register</li>
          </ol>
        </div>
        <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded">
          <p className="text-sm font-semibold text-blue-800">💡 Pro Tip</p>
          <p className="text-sm text-blue-700">
            Send invitations 2-3 days before the employee's start date so they 
            can begin training immediately on their first day.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'progress-monitoring',
    title: 'Tracking Employee Progress',
    description: 'Keep everyone on track',
    content: (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Activity className="h-8 w-8 text-primary mt-1" />
          <div>
            <h4 className="font-semibold mb-2">Dashboard Overview</h4>
            <p className="text-muted-foreground text-sm">
              Your dashboard shows real-time progress for all employees. Use this to 
              identify who needs support and who's excelling.
            </p>
          </div>
        </div>
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <h4 className="font-semibold text-sm">Progress Indicators:</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span><strong>0-33%:</strong> Red - Needs immediate attention</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span><strong>34-66%:</strong> Yellow - Making progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span><strong>67-100%:</strong> Green - On track!</span>
            </div>
          </div>
        </div>
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">At-Risk Employees</h4>
          <p className="text-sm text-muted-foreground">
            Your dashboard highlights employees who are:<br/>
            • Below 50% progress with deadline approaching<br/>
            • Inactive for 7+ days<br/>
            • Failed the final exam<br/>
            • Stuck on the same module
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-green-700">
            <strong>Action Step:</strong> Click "Send Reminder" next to any at-risk employee 
            to automatically send an encouraging email with their next steps.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'messaging',
    title: 'Communication Tools',
    description: 'Stay connected with your team',
    content: (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <MessageCircle className="h-8 w-8 text-primary mt-1" />
          <div>
            <h4 className="font-semibold mb-2">Built-In Messaging</h4>
            <p className="text-muted-foreground text-sm">
              Use the Communication Hub to send direct messages to employees or 
              coordinate with your Dispensary Manager.
            </p>
          </div>
        </div>
        <div className="grid gap-3">
          <div className="p-3 border rounded-lg">
            <h5 className="font-semibold text-sm mb-1">Quick Check-Ins</h5>
            <p className="text-xs text-muted-foreground">"How's your training going? Need any help?"</p>
          </div>
          <div className="p-3 border rounded-lg">
            <h5 className="font-semibold text-sm mb-1">Support Offers</h5>
            <p className="text-xs text-muted-foreground">"I see you're on Module 8. Great progress! Can I help with anything?"</p>
          </div>
          <div className="p-3 border rounded-lg">
            <h5 className="font-semibold text-sm mb-1">Celebrations</h5>
            <p className="text-xs text-muted-foreground">"Congrats on completing the Green Tier! Keep up the great work! 🎉"</p>
          </div>
          <div className="p-3 border rounded-lg">
            <h5 className="font-semibold text-sm mb-1">Deadline Reminders</h5>
            <p className="text-xs text-muted-foreground">"Just a friendly reminder - your deadline is in 5 days. You've got this!"</p>
          </div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm font-semibold text-purple-800 mb-1">📧 Automatic Reminders</p>
          <p className="text-sm text-purple-700">
            The system automatically sends reminder emails to employees who haven't 
            logged in recently. You can also send personalized messages anytime.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'getting-help',
    title: 'Resources & Support',
    description: 'Help is always available',
    content: (
      <div className="space-y-4">
        <div className="bg-primary/10 p-6 rounded-lg text-center">
          <BookOpen className="h-12 w-12 text-primary mx-auto mb-3" />
          <h3 className="font-semibold text-lg mb-2">You're Not Alone!</h3>
          <p className="text-muted-foreground text-sm">
            We've created comprehensive resources to help you succeed in your role.
          </p>
        </div>
        <div className="space-y-3">
          <div className="p-4 border rounded-lg">
            <h5 className="font-semibold mb-1">📚 Training Coordinator Guide</h5>
            <p className="text-sm text-muted-foreground">
              Complete manual with step-by-step instructions for every task. 
              Access it anytime from your dashboard.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h5 className="font-semibold mb-1">🎥 Video Tutorials</h5>
            <p className="text-sm text-muted-foreground">
              Watch short videos showing exactly how to invite employees, assign seats, 
              and monitor progress.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h5 className="font-semibold mb-1">❓ Help Center</h5>
            <p className="text-sm text-muted-foreground">
              Searchable FAQ and knowledge base with answers to common questions.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h5 className="font-semibold mb-1">👤 Your Manager</h5>
            <p className="text-sm text-muted-foreground">
              Your Dispensary Manager is your first point of contact for 
              organizational questions or seat purchases.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h5 className="font-semibold mb-1">✉️ Technical Support</h5>
            <p className="text-sm text-muted-foreground">
              Email support@procannedu.com for platform issues (24hr response time).
            </p>
          </div>
        </div>
        <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg text-center">
          <p className="text-sm font-semibold mb-1">🎉 You're Ready!</p>
          <p className="text-sm text-muted-foreground">
            You now understand your role and have all the tools you need. 
            Let's get started building a culture of training excellence!
          </p>
        </div>
      </div>
    )
  }
];

interface CoordinatorOnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const CoordinatorOnboarding: React.FC<CoordinatorOnboardingProps> = ({ onComplete, onSkip }) => {
  return (
    <OnboardingWizard
      steps={steps}
      onComplete={onComplete}
      onSkip={onSkip}
      storageKey="onboarding_completed_coordinator"
    />
  );
};
