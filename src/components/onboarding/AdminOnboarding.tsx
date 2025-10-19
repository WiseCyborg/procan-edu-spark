import React from 'react';
import { OnboardingWizard } from './OnboardingWizard';
import { Shield, Users, FileCheck, Lock, BarChart3 } from 'lucide-react';

const steps = [
  {
    id: 'dashboard',
    title: 'Welcome to Admin Dashboard',
    description: 'Your central hub for managing the entire platform',
    content: (
      <div className="space-y-4">
        <div className="bg-primary/10 p-6 rounded-lg">
          <Shield className="h-12 w-12 text-primary mb-4" />
          <h3 className="font-semibold text-lg mb-2">You're in Control</h3>
          <p className="text-muted-foreground">
            As an administrator, you have the highest level of access. You can manage users, 
            approve organizations, monitor security, and oversee all platform operations.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <Users className="h-6 w-6 text-primary mb-2" />
            <h4 className="font-semibold">User Management</h4>
            <p className="text-sm text-muted-foreground">Add, edit, or remove users</p>
          </div>
          <div className="p-4 border rounded-lg">
            <FileCheck className="h-6 w-6 text-primary mb-2" />
            <h4 className="font-semibold">Applications</h4>
            <p className="text-sm text-muted-foreground">Review dispensary requests</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'user-management',
    title: 'Managing Users',
    description: 'Create, edit, and manage user accounts',
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          The User Management section allows you to view all registered users, 
          edit their roles, and manage their access.
        </p>
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <h4 className="font-semibold">Key Features:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Search and filter users by role, organization, or status</li>
            <li>Edit user profiles and contact information</li>
            <li>Assign or revoke roles (Admin, Manager, Coordinator, Student)</li>
            <li>View user activity and progress</li>
            <li>Suspend or reactivate accounts</li>
          </ul>
        </div>
        <div className="border-l-4 border-yellow-500 bg-yellow-50 p-4 rounded">
          <p className="text-sm font-semibold text-yellow-800">⚠️ Important</p>
          <p className="text-sm text-yellow-700">
            Role changes take effect immediately. Always verify before assigning admin roles.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'applications',
    title: 'Reviewing Applications',
    description: 'Approve or reject dispensary registration requests',
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Dispensaries must apply for access. You'll review their information and 
          decide whether to approve or reject their application.
        </p>
        <div className="bg-muted p-4 rounded-lg space-y-3">
          <h4 className="font-semibold">Review Process:</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Navigate to "Application Management" tab</li>
            <li>Click on a pending application to view details</li>
            <li>Verify organization name, license number, and contact info</li>
            <li>Click "Approve" to generate an access key</li>
            <li>Or click "Reject" and provide a reason</li>
          </ol>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm font-semibold text-green-800 mb-1">✅ After Approval</p>
          <p className="text-sm text-green-700">
            The organization receives an email with their unique access key. 
            They can use this to register a Dispensary Manager account.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'security',
    title: 'Security Monitoring',
    description: 'Keep the platform secure',
    content: (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Lock className="h-8 w-8 text-primary mt-1" />
          <div>
            <h4 className="font-semibold mb-2">Your Security Responsibilities</h4>
            <p className="text-muted-foreground text-sm">
              Monitor audit logs for suspicious activity, review security alerts, 
              and ensure all users follow proper authentication procedures.
            </p>
          </div>
        </div>
        <div className="grid gap-3">
          <div className="p-3 border rounded-lg">
            <h5 className="font-semibold text-sm mb-1">Audit Logs</h5>
            <p className="text-xs text-muted-foreground">Track all administrative actions and sensitive operations</p>
          </div>
          <div className="p-3 border rounded-lg">
            <h5 className="font-semibold text-sm mb-1">Role Changes</h5>
            <p className="text-xs text-muted-foreground">Every role modification is logged with timestamps</p>
          </div>
          <div className="p-3 border rounded-lg">
            <h5 className="font-semibold text-sm mb-1">Certificate Events</h5>
            <p className="text-xs text-muted-foreground">Monitor certificate issuance and verification attempts</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'reports',
    title: 'Analytics & Reports',
    description: 'Track platform usage and compliance',
    content: (
      <div className="space-y-4">
        <div className="bg-primary/10 p-6 rounded-lg text-center">
          <BarChart3 className="h-12 w-12 text-primary mx-auto mb-3" />
          <h3 className="font-semibold text-lg mb-2">Data-Driven Decisions</h3>
          <p className="text-muted-foreground text-sm">
            Access comprehensive analytics about platform usage, completion rates, 
            and organizational performance.
          </p>
        </div>
        <div className="space-y-2">
          <h4 className="font-semibold">Available Reports:</h4>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
              <span><strong>User Activity:</strong> Track logins, progress, and engagement</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
              <span><strong>Completion Rates:</strong> Monitor course and exam performance</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
              <span><strong>Organization Stats:</strong> Compare dispensary performance</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
              <span><strong>Certificate Issuance:</strong> Track credentialing trends</span>
            </li>
          </ul>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm font-semibold text-blue-800 mb-1">🎉 You're All Set!</p>
          <p className="text-sm text-blue-700">
            You now know the basics of the admin dashboard. Explore each section to learn more, 
            and check the Admin Guide for detailed procedures.
          </p>
        </div>
      </div>
    )
  }
];

interface AdminOnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const AdminOnboarding: React.FC<AdminOnboardingProps> = ({ onComplete, onSkip }) => {
  return (
    <OnboardingWizard
      steps={steps}
      onComplete={onComplete}
      onSkip={onSkip}
      storageKey="onboarding_completed_admin"
    />
  );
};
