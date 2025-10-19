import React from 'react';
import { OnboardingWizard } from './OnboardingWizard';
import { Building2, CreditCard, Users, BarChart, MessageSquare } from 'lucide-react';

const steps = [
  {
    id: 'portal-overview',
    title: 'Welcome to Your Portal',
    description: 'Manage your organization\'s training and compliance',
    content: (
      <div className="space-y-4">
        <div className="bg-primary/10 p-6 rounded-lg">
          <Building2 className="h-12 w-12 text-primary mb-4" />
          <h3 className="font-semibold text-lg mb-2">Your Dispensary Command Center</h3>
          <p className="text-muted-foreground">
            As a Dispensary Manager, you oversee training for your entire organization. 
            Purchase seats, monitor employee progress, and ensure compliance.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 border rounded-lg">
            <CreditCard className="h-5 w-5 text-primary mb-2" />
            <h4 className="font-semibold text-sm">Purchase Seats</h4>
            <p className="text-xs text-muted-foreground">Buy training licenses</p>
          </div>
          <div className="p-3 border rounded-lg">
            <Users className="h-5 w-5 text-primary mb-2" />
            <h4 className="font-semibold text-sm">View Employees</h4>
            <p className="text-xs text-muted-foreground">Track team progress</p>
          </div>
          <div className="p-3 border rounded-lg">
            <BarChart className="h-5 w-5 text-primary mb-2" />
            <h4 className="font-semibold text-sm">Analytics</h4>
            <p className="text-xs text-muted-foreground">Compliance reports</p>
          </div>
          <div className="p-3 border rounded-lg">
            <MessageSquare className="h-5 w-5 text-primary mb-2" />
            <h4 className="font-semibold text-sm">Communication</h4>
            <p className="text-xs text-muted-foreground">Message your team</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'viewing-employees',
    title: 'Monitoring Your Team',
    description: 'Track employee training progress',
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          The Employee Overview shows all staff members, their progress through the 
          18-module course, and their compliance status.
        </p>
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <h4 className="font-semibold">What You'll See:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li><strong>Progress Bars:</strong> Visual completion percentage (0-100%)</li>
            <li><strong>Tier Badges:</strong> Green, Yellow, Red tier achievements</li>
            <li><strong>Last Activity:</strong> When they last accessed training</li>
            <li><strong>Certificate Status:</strong> Completed vs. in progress</li>
            <li><strong>At-Risk Indicators:</strong> Employees falling behind</li>
          </ul>
        </div>
        <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded">
          <p className="text-sm font-semibold text-blue-800">💡 Pro Tip</p>
          <p className="text-sm text-blue-700">
            Click on any employee's name to see detailed module-by-module progress 
            and quiz scores.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'downloading-reports',
    title: 'Compliance Reports',
    description: 'Export data for audits and reviews',
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Generate reports to track your organization's training compliance, 
          perfect for regulatory audits or internal reviews.
        </p>
        <div className="space-y-3">
          <div className="p-3 bg-muted rounded-lg">
            <h5 className="font-semibold text-sm mb-1">📊 Progress Report</h5>
            <p className="text-xs text-muted-foreground">
              Shows each employee's completion percentage, current tier, and last activity date
            </p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <h5 className="font-semibold text-sm mb-1">🎓 Certificate Report</h5>
            <p className="text-xs text-muted-foreground">
              Lists all issued certificates with numbers, dates, and expiration info
            </p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <h5 className="font-semibold text-sm mb-1">💺 Seat Utilization Report</h5>
            <p className="text-xs text-muted-foreground">
              Tracks purchased, available, assigned, and used training seats
            </p>
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-green-700">
            <strong>How to Download:</strong> Navigate to the Analytics tab, 
            select your report type, choose date range, and click "Download Report". 
            Files are exported as CSV for easy spreadsheet analysis.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'communication',
    title: 'Team Communication',
    description: 'Stay connected with your staff',
    content: (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <MessageSquare className="h-8 w-8 text-primary mt-1" />
          <div>
            <h4 className="font-semibold mb-2">Built-In Messaging</h4>
            <p className="text-muted-foreground text-sm">
              Use the Communication Hub to send messages to your Training Coordinator 
              or individual employees. All conversations are tracked and searchable.
            </p>
          </div>
        </div>
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <h4 className="font-semibold text-sm">Common Messages:</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• Send reminders to employees behind schedule</li>
            <li>• Congratulate employees on tier completions</li>
            <li>• Coordinate with your Training Coordinator</li>
            <li>• Answer questions about course content or deadlines</li>
            <li>• Share organizational updates</li>
          </ul>
        </div>
        <div className="border-l-4 border-purple-500 bg-purple-50 p-4 rounded">
          <p className="text-sm font-semibold text-purple-800">📧 Email Notifications</p>
          <p className="text-sm text-purple-700">
            You'll receive automatic alerts when: employees complete the course, 
            fail the final exam, or when training seats are running low.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'support-resources',
    title: 'Getting Help',
    description: 'Support resources available to you',
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          You're not alone! We provide comprehensive support to ensure your success 
          as a Dispensary Manager.
        </p>
        <div className="grid gap-3">
          <div className="p-4 border rounded-lg">
            <h5 className="font-semibold mb-1">📚 Dispensary Manager Guide</h5>
            <p className="text-sm text-muted-foreground">
              Complete documentation with step-by-step instructions for all tasks
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h5 className="font-semibold mb-1">🎥 Video Tutorials</h5>
            <p className="text-sm text-muted-foreground">
              Watch walkthroughs of common workflows like purchasing seats and viewing reports
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h5 className="font-semibold mb-1">❓ FAQ & Help Center</h5>
            <p className="text-sm text-muted-foreground">
              Searchable knowledge base with answers to frequently asked questions
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h5 className="font-semibold mb-1">✉️ Email Support</h5>
            <p className="text-sm text-muted-foreground">
              Contact support@procannedu.com for technical assistance (24hr response)
            </p>
          </div>
        </div>
        <div className="bg-primary/10 p-4 rounded-lg text-center">
          <p className="text-sm font-semibold mb-1">🎉 Ready to Get Started!</p>
          <p className="text-sm text-muted-foreground">
            You now have everything you need to manage your organization's training effectively. 
            Click "Complete" to begin!
          </p>
        </div>
      </div>
    )
  }
];

interface ManagerOnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const ManagerOnboarding: React.FC<ManagerOnboardingProps> = ({ onComplete, onSkip }) => {
  return (
    <OnboardingWizard
      steps={steps}
      onComplete={onComplete}
      onSkip={onSkip}
      storageKey="onboarding_completed_manager"
    />
  );
};
