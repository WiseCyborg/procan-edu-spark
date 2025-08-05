import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, X, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from '@/components/ui/use-toast';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
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
      - Maryland cannabis training includes 18 modules covering compliance
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
      - 18 comprehensive modules plus final exam
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
};

export const ChatAssistant: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { roles } = useUserRole();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showProactiveTip, setShowProactiveTip] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const contextInfo = getContextInfo(location.pathname);
  const isChatDisabled = contextInfo.route === 'final-exam';

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
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        content: `Hi! I'm your ProCann Edu assistant. I'm here to help you with ${contextInfo.description.toLowerCase()}. What can I help you with today?`,
        isUser: false,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, contextInfo.description, isChatDisabled]);

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
          user_roles: roles
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

  return (
    <>
      {/* Proactive Help Tooltip */}
      {showProactiveTip && !isOpen && (
        <div className="fixed bottom-20 right-4 z-40 animate-in slide-in-from-right">
          <Card className="w-72 bg-primary text-primary-foreground shadow-lg">
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium mb-1">Need help?</p>
                  <p className="text-xs opacity-90">
                    I'm here to assist with {contextInfo.description.toLowerCase()}
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
        className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg"
        size="icon"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-20 right-4 z-40 w-80 h-96 flex flex-col shadow-xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">{contextInfo.title}</CardTitle>
                <Badge variant="secondary" className="text-xs mt-1">
                  {contextInfo.route}
                </Badge>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-3 pt-0">
            {/* Quick Tips */}
            {contextInfo.helpTips.length > 0 && messages.length <= 1 && (
              <div className="mb-3">
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
              </div>
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 pr-3">
              <div className="space-y-2">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        message.isUser
                          ? 'bg-primary text-primary-foreground'
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
                placeholder="Ask me anything..."
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
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default ChatAssistant;