import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, X, HelpCircle, Settings, Mic } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useCharmAI } from '@/hooks/useCharmAI';
import { VoiceSettingsPanel } from './VoiceSettingsPanel';
import { useUnifiedVoice } from '@/providers/UnifiedVoiceProvider';
import { toast } from '@/hooks/use-toast';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  links?: Array<{ text: string; url: string; description: string }>;
}

interface ContextInfo {
  route: string;
  title: string;
  description: string;
  helpTips: string[];
  securityLevel: 'student' | 'manager' | 'admin';
}

const getContextInfo = (pathname: string, userRoles: string[]): ContextInfo => {
  const isAdmin = userRoles.includes('admin');
  const isManager = userRoles.includes('dispensary_manager');
  
  const securityLevel = isAdmin ? 'admin' : isManager ? 'manager' : 'student';
  
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
      securityLevel
    };
  }
  
  if (pathname === '/dashboard') {
    const tips = ['How do I start a course?', 'Where can I see my progress?'];
    if (securityLevel !== 'student') {
      tips.push('How do I manage my team?', 'Where are compliance reports?');
    }
    if (securityLevel === 'admin') {
      tips.push('How do I manage organizations?', 'Where are system analytics?');
    }
    
    return {
      route: 'dashboard',
      title: 'Dashboard & Training Hub',
      description: `Navigate your ${securityLevel === 'student' ? 'training progress' : 'management dashboard'}`,
      helpTips: tips,
      securityLevel
    };
  }
  
  if (pathname.startsWith('/course')) {
    if (pathname.includes('final-exam')) {
      return {
        route: 'final-exam',
        title: 'Chat Unavailable',
        description: 'Chat assistance is disabled during the final exam to maintain integrity',
        helpTips: [],
        securityLevel
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
      securityLevel
    };
  }
  
  if (pathname === '/dispensary-portal' && securityLevel !== 'student') {
    return {
      route: 'dispensary-portal',
      title: 'Dispensary Management',
      description: 'Manage your team and organizational compliance',
      helpTips: [
        'How do I add new employees?',
        'Where can I see team progress?',
        'How do I generate compliance reports?',
        'Managing certificate renewals'
      ],
      securityLevel
    };
  }
  
  if (pathname === '/admin-dashboard' && securityLevel === 'admin') {
    return {
      route: 'admin-dashboard',
      title: 'System Administration',
      description: 'Manage the entire ProCann Edu platform',
      helpTips: [
        'How do I manage organizations?',
        'User role management',
        'System analytics and reporting',
        'Security monitoring'
      ],
      securityLevel
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
    securityLevel
  };
};

export const EnhancedChatAssistant: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { roles } = useUserRole();
  const { sendEnhancedMessage } = useCharmAI();
  const { speak, isSupported: voiceSupported } = useUnifiedVoice();
  
  const [isOpen, setIsOpen] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showProactiveTip, setShowProactiveTip] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const contextInfo = getContextInfo(location.pathname, roles);
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
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      if (!isOpen && contextInfo.helpTips.length > 0) {
        setShowProactiveTip(true);
      }
    }, 120000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [location.pathname, isOpen, isChatDisabled]);

  // Enhanced welcome message with role-based content
  useEffect(() => {
    if (isOpen && messages.length === 0 && !isChatDisabled) {
      const roleContext = contextInfo.securityLevel === 'admin' ? 
        'system administrator' : 
        contextInfo.securityLevel === 'manager' ? 
        'dispensary manager' : 
        'student';
        
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        content: `Hi! I'm your ProCann Edu assistant with ${contextInfo.securityLevel} access level. As a ${roleContext}, I can help you with ${contextInfo.description.toLowerCase()}. I understand Maryland cannabis regulations and can provide role-specific guidance. What can I help you with today?`,
        isUser: false,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, contextInfo, isChatDisabled]);

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
      const response = await sendEnhancedMessage(inputMessage.trim());
      
      if (response) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: response.response || response.message || "I understand your question, but I'm having trouble generating a response right now. Please contact info@procannedu.com for assistance.",
          isUser: false,
          timestamp: new Date(),
          links: response.suggestedLinks || []
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        // Auto-speak response if voice is enabled
        if (voiceSupported && response.response) {
          speak(response.response, { priority: 'low' });
        }
      } else {
        throw new Error('No response received');
      }
    } catch (error) {
      console.error('Enhanced chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm having trouble right now. Please contact info@procannedu.com for support or try asking your question differently.",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Chat Assistant Unavailable",
        description: "The assistant is temporarily unavailable. Please try again or contact support.",
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

  const handleLinkClick = (url: string) => {
    window.location.href = url;
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
      {/* Voice Settings Panel */}
      <VoiceSettingsPanel 
        isVisible={showVoiceSettings} 
        onClose={() => setShowVoiceSettings(false)} 
      />

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
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {contextInfo.route}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {contextInfo.securityLevel}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {voiceSupported && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setShowVoiceSettings(true)}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                )}
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
            <ScrollArea className="flex-1 pr-3 overflow-y-auto overscroll-contain" style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--border)) transparent' }}>
              <div className="space-y-2">
                {messages.map((message) => (
                  <div key={message.id}>
                    <div className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
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
                    
                    {/* Contextual Links */}
                    {message.links && message.links.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.links.map((link, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            className="w-full text-xs h-7 justify-start"
                            onClick={() => handleLinkClick(link.url)}
                          >
                            {link.text}
                          </Button>
                        ))}
                      </div>
                    )}
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

export default EnhancedChatAssistant;