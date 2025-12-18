import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  MessageCircle, X, Send, Loader2, Sparkles, 
  Volume2, VolumeX, RotateCcw, Mic, 
  Users, FileCheck, Settings, BookOpen,
  RefreshCw, Mail, Shield, ClipboardList
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserContext, UserContext } from '@/hooks/useUserContext';
import { RequestSupportButton } from './RequestSupportButton';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  actions?: ChatAction[];
}

interface ChatAction {
  id: string;
  label: string;
  icon: string;
  action: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  users: Users,
  'file-check': FileCheck,
  settings: Settings,
  'book-open': BookOpen,
  'refresh-cw': RefreshCw,
  mail: Mail,
  shield: Shield,
  'clipboard-list': ClipboardList,
};

export const PersonalChatbot = () => {
  const { context, isLoading: contextLoading, greeting, currentPage, refresh } = useUserContext();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [audioQueue, setAudioQueue] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  // Get role-specific actions
  const getQuickActions = useCallback((): ChatAction[] => {
    const role = context.role;
    
    if (role === 'admin') {
      return [
        { id: 'review-apps', label: 'Review Applications', icon: 'clipboard-list', action: 'review_pending_applications' },
        { id: 'health-check', label: 'Pipeline Health', icon: 'shield', action: 'run_pipeline_health' },
        { id: 'send-reminders', label: 'Send Reminders', icon: 'mail', action: 'send_registration_reminders' },
        { id: 'reconcile', label: 'Reconcile Seats', icon: 'refresh-cw', action: 'reconcile_seats' },
      ];
    }
    
    if (role === 'dispensary_manager' || role === 'training_coordinator') {
      return [
        { id: 'invite', label: 'Invite Employee', icon: 'users', action: 'invite_employee' },
        { id: 'view-code', label: 'View Join Code', icon: 'file-check', action: 'view_join_code' },
        { id: 'resend', label: 'Resend Invites', icon: 'mail', action: 'resend_invitations' },
        { id: 'allocate', label: 'Manage Seats', icon: 'settings', action: 'manage_seats' },
      ];
    }
    
    // Student / Employee
    return [
      { id: 'resume', label: 'Resume Course', icon: 'book-open', action: 'resume_course' },
      { id: 'unlock', label: 'Check Unlock', icon: 'refresh-cw', action: 'check_unlock_status' },
      { id: 'cert', label: 'Get Certificate', icon: 'file-check', action: 'get_certificate' },
    ];
  }, [context.role]);

  // Generate personalized greeting
  const getPersonalizedGreeting = useCallback((): string => {
    const { first_name, role, org_name, seat_status, training_status, cert_status, pending_applications, unregistered_managers } = context;
    
    if (!first_name) return `${greeting}! How can I help you today?`;

    let greetingText = `Hey ${first_name} — I'm here. `;

    if (role === 'admin') {
      const issues = [];
      if (pending_applications > 0) issues.push(`${pending_applications} pending applications`);
      if (unregistered_managers > 0) issues.push(`${unregistered_managers} unregistered managers`);
      
      if (issues.length > 0) {
        greetingText += `You have ${issues.join(' and ')}. Want me to help resolve them?`;
      } else {
        greetingText += `All pipelines look healthy. What are you working on?`;
      }
    } else if (role === 'dispensary_manager' || role === 'training_coordinator') {
      greetingText += `${org_name || 'Your organization'} has ${seat_status.available_seats} seats available out of ${seat_status.total_seats}. `;
      if (seat_status.available_seats > 0) {
        greetingText += `Want to invite your first employee or review seat usage?`;
      } else {
        greetingText += `How can I help you today?`;
      }
    } else {
      // Student/Employee
      if (cert_status.certified && !cert_status.is_expired) {
        greetingText += `You're certified! Your certificate is valid until ${new Date(cert_status.expiry_date!).toLocaleDateString()}. Need to download it?`;
      } else if (training_status.completion_percentage > 0 && training_status.completion_percentage < 100) {
        greetingText += `You're ${training_status.completion_percentage}% through training. Just ${training_status.total_modules - training_status.current_module + 1} more modules to go!`;
      } else if (training_status.completion_percentage === 100) {
        greetingText += `You've completed all modules! Ready to take the final exam?`;
      } else {
        greetingText += `Ready to start your cannabis agent training?`;
      }
    }

    return greetingText;
  }, [context, greeting]);

  // Initialize with personalized greeting
  useEffect(() => {
    if (isOpen && messages.length === 0 && context.first_name) {
      const greetingMessage = getPersonalizedGreeting();
      const newMessage: Message = {
        role: 'assistant',
        content: greetingMessage,
        actions: getQuickActions(),
      };
      setMessages([newMessage]);
      
      // Speak greeting if TTS enabled
      if (ttsEnabled) {
        speakText(greetingMessage);
      }
    }
  }, [isOpen, context.first_name, getPersonalizedGreeting, getQuickActions, ttsEnabled]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // TTS function
  const speakText = async (text: string) => {
    if (!ttsEnabled) return;
    
    try {
      setIsSpeaking(true);
      
      const { data, error } = await supabase.functions.invoke('text-to-voice', {
        body: { text, voice: 'female' }
      });

      if (error) throw error;

      if (data?.audioContent) {
        const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        audio.onended = () => {
          setIsSpeaking(false);
        };
        
        audio.onerror = () => {
          setIsSpeaking(false);
        };
        
        await audio.play();
      }
    } catch (err) {
      console.error('TTS error:', err);
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
  };

  // Handle quick action click
  const handleActionClick = async (action: ChatAction) => {
    setMessages(prev => [...prev, { 
      role: 'user', 
      content: `[Action: ${action.label}]` 
    }]);
    
    await handleSend(action.action, true);
  };

  const handleSend = async (messageOrAction?: string, isAction = false) => {
    const userMessage = messageOrAction || input.trim();
    if (!userMessage || isLoading || !context.user_id) return;

    if (!isAction) {
      setInput('');
      setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    }
    
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('internal-chat-assistant', {
        body: {
          message: userMessage,
          isAction,
          userContext: {
            ...context,
            currentPage,
          },
          conversationHistory: messages.slice(-6).map(m => ({
            role: m.role,
            content: m.content
          })),
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || 'I apologize, but I encountered an error. Please try again.',
        actions: data.suggestedActions || getQuickActions(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Speak response if TTS enabled
      if (ttsEnabled && data.response) {
        // Only speak first 200 characters for long responses
        const textToSpeak = data.response.length > 200 
          ? data.response.substring(0, 200) + '...' 
          : data.response;
        speakText(textToSpeak);
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Don't render if no user context
  if (!context.user_id) {
    return null;
  }

  return (
    <>
      {/* Chat Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 h-14 w-14 rounded-full shadow-lg z-50 hover:scale-110 transition-transform bg-gradient-to-r from-primary to-primary/80"
        size="icon"
        title={`Chat with your assistant, ${context.first_name || 'User'}`}
      >
        <Sparkles className="h-6 w-6" />
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 left-6 w-[400px] h-[550px] bg-background border rounded-lg shadow-2xl flex flex-col z-50 animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-t-lg">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">ProCann Assist</h3>
                <p className="text-xs opacity-90">
                  {context.first_name ? `Helping ${context.first_name}` : 'Your Personal Assistant'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* TTS Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (isSpeaking) stopSpeaking();
                  setTtsEnabled(!ttsEnabled);
                }}
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                title={ttsEnabled ? 'Mute voice' : 'Enable voice'}
              >
                {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              {/* Replay */}
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
                    if (lastAssistant) speakText(lastAssistant.content);
                  }}
                  className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                  title="Replay last message"
                  disabled={!ttsEnabled}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  stopSpeaking();
                  setIsOpen(false);
                }}
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className="space-y-2">
                <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-lg px-4 py-2",
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
                
                {/* Action Buttons */}
                {msg.role === 'assistant' && msg.actions && msg.actions.length > 0 && (
                  <div className="flex flex-wrap gap-2 ml-2">
                    {msg.actions.slice(0, 4).map((action) => {
                      const IconComponent = iconMap[action.icon] || BookOpen;
                      return (
                        <Button
                          key={action.id}
                          variant="outline"
                          size="sm"
                          onClick={() => handleActionClick(action)}
                          className="text-xs h-7 px-2"
                          disabled={isLoading}
                        >
                          <IconComponent className="h-3 w-3 mr-1" />
                          {action.label}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            
            {/* Speaking indicator */}
            {isSpeaking && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mic className="h-3 w-3 animate-pulse text-primary" />
                <span>Speaking...</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={stopSpeaking}
                  className="h-5 px-2 text-xs"
                >
                  Stop
                </Button>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Support Button */}
          <div className="px-4 pb-2">
            <RequestSupportButton defaultSubject="Personal Assistant Support" />
          </div>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Ask me anything, ${context.first_name || 'friend'}...`}
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
