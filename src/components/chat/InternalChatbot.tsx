import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useLocation } from 'react-router-dom';
import { RequestSupportButton } from './RequestSupportButton';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface InternalChatbotProps {
  firstName?: string;
  organizationName?: string;
  trainingProgress?: number;
  experienceLevel?: 'new' | 'intermediate' | 'advanced';
}

export const InternalChatbot = ({
  firstName,
  organizationName,
  trainingProgress = 0,
  experienceLevel = 'intermediate'
}: InternalChatbotProps) => {
  const { user } = useAuth();
  const { roles } = useUserRole();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Initialize with personalized greeting
  useEffect(() => {
    if (isOpen && messages.length === 0 && firstName) {
      const greetingMessage = getPersonalizedGreeting(firstName, roles[0] || 'student');
      setMessages([{
        role: 'assistant',
        content: greetingMessage
      }]);
    }
  }, [isOpen, firstName, roles]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getPersonalizedGreeting = (name: string, role: string): string => {
    const timeOfDay = new Date().getHours();
    const greeting = timeOfDay < 12 ? 'Good morning' : timeOfDay < 18 ? 'Good afternoon' : 'Good evening';
    
    const roleGreetings: Record<string, string> = {
      'student': `${greeting}, ${name}! 👋 I'm here to help you with your cannabis agent training. What can I assist you with today?`,
      'dispensary_manager': `${greeting}, ${name}! 👋 I'm here to help you manage your team and ensure compliance. What would you like to know?`,
      'training_coordinator': `${greeting}, ${name}! 👋 I'm here to help you coordinate training for your team. How can I assist you?`,
      'admin': `${greeting}, ${name}! 👋 I'm here to help with system administration and oversight. What do you need?`
    };
    
    return roleGreetings[role] || `${greeting}, ${name}! 👋 How can I help you today?`;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !user || !firstName) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const userContext = {
        firstName,
        role: roles[0] || 'student',
        organizationName,
        experienceLevel,
        trainingProgress,
        currentPage: location.pathname
      };

      const { data, error } = await supabase.functions.invoke('internal-chat-assistant', {
        body: {
          message: userMessage,
          userContext,
          conversationHistory: messages.slice(-6)
        },
      });

      if (error) throw error;

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response || 'I apologize, but I encountered an error. Please try again.',
      }]);
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

  // Don't show if no user context
  if (!user || !firstName) {
    return null;
  }

  return (
    <>
      {/* Chat Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 h-14 w-14 rounded-full shadow-lg z-50 hover:scale-110 transition-transform bg-gradient-to-r from-primary to-primary/80"
        size="icon"
        title="Chat with your personal assistant"
      >
        <Sparkles className="h-6 w-6" />
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 left-6 w-[380px] h-[500px] bg-background border rounded-lg shadow-2xl flex flex-col z-50 animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-t-lg">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Your Assistant</h3>
                <p className="text-xs opacity-90">
                  {firstName ? `Helping ${firstName}` : 'ProCann Edu Helper'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Support Button */}
          <div className="px-4 pb-2">
            <RequestSupportButton defaultSubject="Chatbot Support Request" />
          </div>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
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
