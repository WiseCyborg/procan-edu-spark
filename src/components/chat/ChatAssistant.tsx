import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, X, HelpCircle, Lock, Bug, CheckSquare, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { usePaymentStatus } from '@/hooks/usePaymentStatus';
import { useOrganizationAccess } from '@/hooks/useOrganizationAccess';
import { useUATMode } from '@/hooks/useUATMode';
import { toast } from '@/components/ui/use-toast';

const COURSE_ID = '76524ea8-a00f-47b3-8e29-a0aa12c23a60';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  isUATTip?: boolean;
}

interface ContextInfo {
  route: string;
  title: string;
  description: string;
  helpTips: string[];
  systemPrompt: string;
}

const getContextInfo = (pathname: string): ContextInfo => {
  if (pathname === '/auth') {
    return {
      route: 'auth',
      title: 'Authentication Help',
      description: 'Get help with signing in or creating your account',
      helpTips: [
        'Having trouble signing in?',
        'Need help creating an account?',
        'Forgot your password?',
        'Questions about Maryland cannabis training requirements?'
      ],
      systemPrompt: `You are a helpful assistant for ProCann Edu, Maryland's premier cannabis training platform. You're helping users with authentication and account issues. Key points:
      - ProCann Edu provides Maryland cannabis compliance training
      - Users need accounts to access training modules and earn certificates
      - Support email: info@procannedu.com
      - Be encouraging about the cannabis industry opportunity in Maryland
      - Help with technical issues like login problems, password resets, account creation
      - Explain the value of cannabis education and certification`
    };
  }
  
  if (pathname === '/dashboard') {
    return {
      route: 'dashboard',
      title: 'Dashboard & Courses',
      description: 'Navigate your training progress and courses',
      helpTips: [
        'How do I start a course?',
        'Where can I see my progress?',
        'How do I download my certificate?',
        'What courses are available?'
      ],
      systemPrompt: `You are a helpful assistant for ProCann Edu's dashboard. Help users navigate their training progress and courses. Key points:
      - Users can see available courses, progress, and certificates here
      - Maryland cannabis training includes 23 modules covering compliance
      - Certificates are available after passing the final exam with 80%+
      - Support contact: info@procannedu.com
      - Encourage completion of training for career advancement
      - Help with navigation, progress tracking, and certificate access`
    };
  }
  
  if (pathname.startsWith('/course')) {
    if (pathname.includes('final-exam')) {
      return {
        route: 'final-exam',
        title: 'Chat Unavailable',
        description: 'Chat assistance is disabled during the final exam to maintain integrity',
        helpTips: [],
        systemPrompt: ''
      };
    }
    
    return {
      route: 'course',
      title: 'Course Module Help',
      description: 'Get help with course content and navigation',
      helpTips: [
        'Explain cannabis regulations in Maryland',
        'Help with module content',
        'Navigation between modules',
        'Understanding compliance requirements'
      ],
      systemPrompt: `You are a cannabis industry expert assistant for ProCann Edu course modules. Help users understand Maryland cannabis regulations and course content. Key points:
      - Focus on Maryland-specific cannabis laws and compliance
      - Explain complex regulatory concepts clearly
      - Help with module navigation and technical issues
      - Encourage completion of all modules before the final exam
      - Support contact: info@procannedu.com
      - Emphasize the importance of compliance in the cannabis industry
      - Provide practical, real-world context for regulations`
    };
  }
  
  if (pathname === '/welcome') {
    return {
      route: 'welcome',
      title: 'Welcome to ProCann Edu',
      description: 'Learn about the platform and get started',
      helpTips: [
        'What is ProCann Edu?',
        'How does the training work?',
        'What will I learn?',
        'How long does it take?'
      ],
      systemPrompt: `You are a welcoming assistant for new ProCann Edu users. Help them understand the platform and get excited about cannabis education. Key points:
      - ProCann Edu is Maryland's premier cannabis training platform
      - Training covers all aspects of cannabis compliance and regulations
      - 23 comprehensive modules plus final exam
      - Certificates recognized by Maryland cannabis industry
      - Support contact: info@procannedu.com
      - Be enthusiastic about cannabis industry opportunities
      - Guide users toward starting their training journey`
    };
  }
  
  // Default/fallback context
  return {
    route: 'general',
    title: 'ProCann Edu Assistant',
    description: 'Your cannabis education and compliance expert',
    helpTips: [
      'Tell me about ProCann Edu',
      'What training is available?',
      'How do I get certified?',
      'Cannabis industry questions'
    ],
    systemPrompt: `You are a helpful assistant for ProCann Edu, Maryland's premier cannabis training platform. Provide general help and information. Key points:
    - ProCann Edu provides comprehensive cannabis compliance training
    - Maryland-focused cannabis education and certification
    - Support contact: info@procannedu.com
    - Help users navigate the platform and understand cannabis regulations
    - Be encouraging about career opportunities in cannabis
    - Guide users to appropriate sections of the platform`
  };
}

export const ChatAssistant: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { roles, isAdmin, isDispensaryManager, isStudent } = useUserRole();
  const { hasPaid, isLoading: paymentLoading } = usePaymentStatus(COURSE_ID);
  const { hasAccess: hasOrgAccess, isLoading: orgLoading } = useOrganizationAccess(user?.id);
  const { isUATUser, uatAccount, getPageGuidance, formatBugReport } = useUATMode();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showProactiveTip, setShowProactiveTip] = useState(false);
  const [showUATPanel, setShowUATPanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const contextInfo = getContextInfo(location.pathname);
  const isChatDisabled = contextInfo.route === 'final-exam';
  const uatGuidance = isUATUser ? getPageGuidance(location.pathname) : null;

  // Access control for training-related routes
  const accessType = useMemo(() => {
    if (!user) return 'NEEDS_AUTH';
    if (isAdmin || isDispensaryManager) return 'ADMIN_ACCESS';
    if (isStudent && hasOrgAccess) return 'ORG_EMPLOYEE_ACCESS';
    if (hasPaid) return 'INDIVIDUAL_PAID';
    return 'NEEDS_PAYMENT';
  }, [user, isAdmin, isDispensaryManager, isStudent, hasOrgAccess, hasPaid]);

  // Restrict chat on training routes if user doesn't have access
  const isTrainingRoute = location.pathname.startsWith('/course') || location.pathname === '/training-handbook';
  const isChatRestricted = isTrainingRoute && !paymentLoading && !orgLoading && 
    (accessType === 'NEEDS_PAYMENT' || accessType === 'NEEDS_AUTH');

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Proactive help trigger
  useEffect(() => {
    if (isChatDisabled) return;
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set proactive help after 2 minutes of inactivity
    timeoutRef.current = setTimeout(() => {
      if (!isOpen && contextInfo.helpTips.length > 0) {
        setShowProactiveTip(true);
      }
    }, 120000); // 2 minutes

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [location.pathname, isOpen, isChatDisabled]);

  // Initial welcome message when chat opens
  useEffect(() => {
    if (isOpen && messages.length === 0 && !isChatDisabled) {
      let welcomeContent = `Hi! I'm your ProCann Edu assistant. I'm here to help you with ${contextInfo.description.toLowerCase()}. What can I help you with today?`;
      
      // Add UAT-specific welcome for UAT users
      if (isUATUser && uatGuidance) {
        welcomeContent = `🧪 UAT Mode Active!\n\nYou're testing: ${uatGuidance.title}\n\nI can help you with:\n• Testing guidance for this page\n• Expected behaviors\n• Bug reporting\n\nWhat would you like help with?`;
      }

      const welcomeMessage: Message = {
        id: Date.now().toString(),
        content: welcomeContent,
        isUser: false,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, contextInfo.description, isChatDisabled, isUATUser, uatGuidance]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || isChatDisabled) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage.trim(),
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat-assistant', {
        body: {
          message: inputMessage.trim(),
          context: contextInfo,
          user_id: user?.id,
          user_roles: roles,
          is_uat: isUATUser,
          uat_guidance: uatGuidance
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Chat Error",
        description: "Sorry, I'm having trouble right now. Please contact info@procannedu.com for support.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickTip = (tip: string) => {
    setInputMessage(tip);
    if (!isOpen) setIsOpen(true);
  };

  const handleBugReport = (issue: string) => {
    const report = formatBugReport(issue, `Page: ${location.pathname}`);
    const reportText = `🐛 Bug Report:\n\nIssue: ${issue}\nPage: ${report.url}\nTime: ${report.timestamp}\nUser: ${report.user}\nRole: ${report.accountType}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    
    // Add to chat
    const bugMessage: Message = {
      id: Date.now().toString(),
      content: reportText,
      isUser: true,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, bugMessage]);
    
    toast({
      title: "Bug Report Created",
      description: "Report copied to clipboard. Paste in Slack/email to submit.",
    });
  };

  if (isChatDisabled) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="w-80 bg-muted border-border">
          <CardContent className="p-4 text-center">
            <HelpCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <h3 className="font-semibold text-foreground mb-1">Chat Unavailable</h3>
            <p className="text-sm text-muted-foreground">
              Chat assistance is disabled during the final exam to maintain exam integrity.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Restricted chat for training routes without payment
  if (isChatRestricted) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="w-80 bg-muted border-border">
          <CardContent className="p-4 text-center">
            <Lock className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <h3 className="font-semibold text-foreground mb-1">Training Chat Locked</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Chat assistance for training content requires course enrollment.
            </p>
            <Button size="sm" variant="outline" onClick={() => window.location.href = '/course'}>
              Enroll Now
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* Proactive Help Tooltip */}
      {showProactiveTip && !isOpen && (
        <div className="fixed bottom-20 right-4 z-40 animate-in slide-in-from-right">
          <Card className="w-72 bg-primary text-primary-foreground shadow-lg">
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium mb-1">
                    {isUATUser ? '🧪 UAT Testing Mode' : 'Need help?'}
                  </p>
                  <p className="text-xs opacity-90">
                    {isUATUser 
                      ? `Testing: ${uatGuidance?.title || 'This page'}`
                      : `I'm here to assist with ${contextInfo.description.toLowerCase()}`
                    }
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-primary-foreground hover:bg-primary-foreground/20"
                  onClick={() => setShowProactiveTip(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chat Toggle Button */}
      <Button
        onClick={() => {
          setIsOpen(!isOpen);
          setShowProactiveTip(false);
        }}
        className={`fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg ${
          isUATUser ? 'bg-amber-500 hover:bg-amber-600' : ''
        }`}
        size="icon"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <Card className={`fixed bottom-20 right-4 z-40 w-80 ${isUATUser ? 'h-[480px]' : 'h-96'} flex flex-col shadow-xl`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  {isUATUser && <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">🧪 UAT</Badge>}
                  {isUATUser ? uatGuidance?.title : contextInfo.title}
                </CardTitle>
                <Badge variant="secondary" className="text-xs mt-1">
                  {contextInfo.route}
                </Badge>
              </div>
              {isUATUser && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => setShowUATPanel(!showUATPanel)}
                >
                  <CheckSquare className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-3 pt-0 overflow-hidden">
            {/* UAT Testing Panel */}
            {isUATUser && showUATPanel && uatGuidance && (
              <div className="mb-3 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 max-h-40 overflow-y-auto">
                <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-2">
                  Testing Tips:
                </p>
                <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                  {uatGuidance.testingTips.slice(0, 3).map((tip, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <CheckSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
                {uatGuidance.knownIssues && uatGuidance.knownIssues.length > 0 && (
                  <>
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mt-2 mb-1">
                      Known Issues:
                    </p>
                    <ul className="text-xs text-amber-600 dark:text-amber-400 space-y-1">
                      {uatGuidance.knownIssues.map((issue, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}

            {/* Quick Tips / Bug Report Buttons */}
            {messages.length <= 1 && (
              <div className="mb-3">
                {isUATUser && uatGuidance ? (
                  <>
                    <p className="text-xs text-muted-foreground mb-2">Quick bug reports:</p>
                    <div className="space-y-1">
                      {uatGuidance.bugReportPrompts.slice(0, 2).map((prompt, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          className="w-full text-xs h-7 justify-start text-destructive border-destructive/30"
                          onClick={() => handleBugReport(prompt)}
                        >
                          <Bug className="w-3 h-3 mr-1" />
                          {prompt}
                        </Button>
                      ))}
                    </div>
                  </>
                ) : contextInfo.helpTips.length > 0 ? (
                  <>
                    <p className="text-xs text-muted-foreground mb-2">Quick help:</p>
                    <div className="space-y-1">
                      {contextInfo.helpTips.slice(0, 2).map((tip, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          className="w-full text-xs h-7 justify-start"
                          onClick={() => handleQuickTip(tip)}
                        >
                          {tip}
                        </Button>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 pr-3 overflow-y-auto overscroll-contain" style={{ scrollbarWidth: 'thin' }}>
              <div className="space-y-2">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                        message.isUser
                          ? 'bg-primary text-primary-foreground'
                          : message.isUATTip 
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-700'
                            : 'bg-muted text-foreground'
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted text-foreground rounded-lg px-3 py-2 text-sm">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Input */}
            <div className="flex space-x-2 mt-3">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={isUATUser ? "Describe issue or ask for help..." : "Ask me anything..."}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                disabled={isLoading}
                className="text-sm"
              />
              <Button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                size="sm"
                className="px-3"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {/* UAT Bug Report Button */}
            {isUATUser && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full text-xs text-destructive border-destructive/30"
                onClick={() => handleBugReport('Custom issue - describe in chat')}
              >
                <Bug className="w-3 h-3 mr-1" />
                Report Bug on This Page
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default ChatAssistant;