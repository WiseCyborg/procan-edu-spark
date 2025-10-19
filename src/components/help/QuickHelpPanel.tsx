import React, { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Book, Video, MessageCircle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QuickHelpPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole?: 'admin' | 'dispensary_manager' | 'training_coordinator' | 'student';
}

export const QuickHelpPanel: React.FC<QuickHelpPanelProps> = ({
  open,
  onOpenChange,
  userRole = 'student'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const roleSpecificHelp = {
    admin: {
      guide: '/admin-guide',
      guideName: 'Admin Guide',
      topics: [
        { title: 'User Management', description: 'Add, edit, or remove users', link: '/admin-guide#user-management' },
        { title: 'Application Review', description: 'Approve dispensary requests', link: '/admin-guide#applications' },
        { title: 'Security Monitoring', description: 'Review audit logs', link: '/admin-guide#security' },
        { title: 'System Reports', description: 'Generate analytics', link: '/admin-guide#reports' }
      ]
    },
    dispensary_manager: {
      guide: '/dispensary-manager-guide',
      guideName: 'Manager Guide',
      topics: [
        { title: 'Purchasing Seats', description: 'Buy training licenses', link: '/dispensary-manager-guide#purchasing' },
        { title: 'Viewing Employees', description: 'Track team progress', link: '/dispensary-manager-guide#employees' },
        { title: 'Compliance Reports', description: 'Download audit data', link: '/dispensary-manager-guide#reports' },
        { title: 'Communication', description: 'Message your team', link: '/dispensary-manager-guide#communication' }
      ]
    },
    training_coordinator: {
      guide: '/training-coordinator-guide',
      guideName: 'Coordinator Guide',
      topics: [
        { title: 'Inviting Employees', description: 'Send email invitations', link: '/training-coordinator-guide#inviting' },
        { title: 'Assigning Seats', description: 'Allocate training licenses', link: '/training-coordinator-guide#seats' },
        { title: 'Monitoring Progress', description: 'Track employee completion', link: '/training-coordinator-guide#monitoring' },
        { title: 'Sending Reminders', description: 'Engage at-risk employees', link: '/training-coordinator-guide#reminders' }
      ]
    },
    student: {
      guide: '/training-handbook',
      guideName: 'Training Handbook',
      topics: [
        { title: 'Course Structure', description: 'Understanding tiers and modules', link: '/training-handbook#structure' },
        { title: 'Taking Quizzes', description: 'How to pass module quizzes', link: '/training-handbook#quizzes' },
        { title: 'Final Exam', description: 'Certification exam guide', link: '/training-handbook#exam' },
        { title: 'Getting Your Certificate', description: 'Download and verify', link: '/training-handbook#certificate' }
      ]
    }
  };

  const currentHelp = roleSpecificHelp[userRole];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Quick Help</SheetTitle>
          <SheetDescription>
            Find answers and resources for common questions
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search help topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Quick Links</h3>
            <div className="grid gap-2">
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => {
                  navigate(currentHelp.guide);
                  onOpenChange(false);
                }}
              >
                <Book className="h-4 w-4 mr-2" />
                {currentHelp.guideName}
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => {
                  navigate('/help-center');
                  onOpenChange(false);
                }}
              >
                <Search className="h-4 w-4 mr-2" />
                Help Center
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => {
                  navigate('/faq');
                  onOpenChange(false);
                }}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                FAQ
              </Button>
            </div>
          </div>

          {/* Common Topics */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Common Topics</h3>
            <div className="space-y-2">
              {currentHelp.topics.map((topic, index) => (
                <button
                  key={index}
                  className="w-full text-left p-3 rounded-lg border hover:bg-muted transition-colors"
                  onClick={() => {
                    navigate(topic.link);
                    onOpenChange(false);
                  }}
                >
                  <div className="font-semibold text-sm">{topic.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {topic.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Video Tutorials */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Video className="h-4 w-4" />
              Video Tutorials
            </h3>
            <p className="text-xs text-muted-foreground">
              Watch step-by-step video guides in the Help Center
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                navigate('/help-center#videos');
                onOpenChange(false);
              }}
            >
              View All Videos
            </Button>
          </div>

          {/* Contact Support */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <h3 className="font-semibold text-sm">Still Need Help?</h3>
            <p className="text-xs text-muted-foreground">
              Can't find what you're looking for? Contact our support team.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => window.location.href = 'mailto:support@procannedu.com'}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Email Support
            </Button>
          </div>

          {/* Response Time */}
          <div className="text-xs text-center text-muted-foreground">
            Average response time: 24 hours
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
