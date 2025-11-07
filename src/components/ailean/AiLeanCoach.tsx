import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Send, X, Sparkles, Users, Calendar, AlertCircle, TrendingUp, ExternalLink, HelpCircle } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedVoice } from '@/providers/UnifiedVoiceProvider';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const COACHING_SCENARIOS = [
  {
    icon: Users,
    title: "New Hire Onboarding",
    prompt: "I'm onboarding a new budtender tomorrow. What should I cover in their first shift to set them up for success?",
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
  },
  {
    icon: AlertCircle,
    title: "Performance Issue",
    prompt: "An employee has been late 3 times this week and it's affecting team morale. How should I address this professionally?",
    color: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20"
  },
  {
    icon: Calendar,
    title: "Schedule Conflict",
    prompt: "Two employees requested the same weekend off and we need coverage. How do I handle this fairly?",
    color: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20"
  },
  {
    icon: TrendingUp,
    title: "Team Motivation",
    prompt: "My team seems disengaged lately. What strategies can I use to boost morale and engagement in a dispensary environment?",
    color: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
  }
];

export function AiLeanCoach() {
  const { isDispensaryManager, isTrainingCoordinator, isLoading: roleLoading } = useUserRole();
  const { speak, stop, isSpeaking } = useUnifiedVoice();
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Only show to managers and coordinators
  if (roleLoading || (!isDispensaryManager && !isTrainingCoordinator)) {
    return null;
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await processVoiceInput(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsListening(true);
      toast.success('Listening... Speak now');
    } catch (error) {
      console.error('Error starting voice recording:', error);
      toast.error('Could not access microphone');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  const processVoiceInput = async (audioBlob: Blob) => {
    try {
      setIsLoading(true);

      // Convert to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        
        if (!base64Audio) {
          throw new Error('Failed to process audio');
        }

        // Send to voice-to-text edge function
        const { data: transcriptData, error: transcriptError } = await supabase.functions.invoke(
          'voice-to-text',
          { body: { audio: base64Audio } }
        );

        if (transcriptError) throw transcriptError;

        const transcribedText = transcriptData?.text;
        if (transcribedText) {
          await sendMessage(transcribedText);
        }
      };
    } catch (error) {
      console.error('Error processing voice input:', error);
      toast.error('Failed to process voice input');
      setIsLoading(false);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Get conversation history (last 10 messages for context)
      const conversationHistory = messages.slice(-10);

      const { data, error } = await supabase.functions.invoke('ailean-coach', {
        body: { 
          message: text,
          conversationHistory 
        }
      });

      if (error) throw error;

      const assistantMessage: Message = { 
        role: 'assistant', 
        content: data.reply 
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Speak response
      speak(data.reply);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to get response from AiLean');
    } finally {
      setIsLoading(false);
    }
  };

  const handleScenarioClick = (prompt: string) => {
    setInputMessage(prompt);
    if (!isOpen) setIsOpen(true);
  };

  const toggleVoiceRecording = () => {
    if (isListening) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputMessage);
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
        {/* Quick scenario buttons */}
        <div className="flex flex-col gap-2">
          {COACHING_SCENARIOS.map((scenario, idx) => (
            <Button
              key={idx}
              onClick={() => handleScenarioClick(scenario.prompt)}
              variant="outline"
              size="sm"
              className={`${scenario.color} justify-start gap-2 text-xs opacity-0 animate-in slide-in-from-right-5`}
              style={{ animationDelay: `${idx * 100}ms`, animationFillMode: 'forwards' }}
            >
              <scenario.icon className="w-3 h-3" />
              {scenario.title}
            </Button>
          ))}
        </div>

        {/* Main AiLean button */}
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-primary to-primary/80 gap-2"
        >
          <Sparkles className="w-5 h-5" />
          Talk to AiLean
        </Button>
      </div>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[600px] z-40 shadow-2xl flex flex-col">
      <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <div>
              <CardTitle className="text-lg">AiLean Coach</CardTitle>
              <CardDescription className="text-primary-foreground/80 text-xs">
                Your workplace coaching assistant
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary-foreground hover:bg-primary-foreground/20"
                  title="Help"
                >
                  <HelpCircle className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>AiLean Coaching Options</DialogTitle>
                  <DialogDescription className="space-y-4 pt-4 text-left">
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">In-App AiLean (This Version)</h4>
                      <ul className="text-sm space-y-1 list-disc pl-4">
                        <li>Secure, role-gated access</li>
                        <li>Voice interaction with organization context</li>
                        <li>Integrated with your ProCannEdu data</li>
                        <li>Best for sensitive HR or performance topics</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">ChatGPT AiLean</h4>
                      <ul className="text-sm space-y-1 list-disc pl-4">
                        <li>General management guidance</li>
                        <li>No login required</li>
                        <li>Great for demos and quick reference</li>
                        <li>Cannabis retail best practices</li>
                      </ul>
                    </div>
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-primary-foreground hover:bg-primary-foreground/20"
              title="More Help in ChatGPT"
            >
              <a
                href="https://chatgpt.com/g/g-690d46d786fc81918e9193318d1c9e55-ailean"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Scenario badges */}
        <div className="flex flex-wrap gap-1 mt-3">
          {COACHING_SCENARIOS.map((scenario, idx) => (
            <Badge
              key={idx}
              variant="outline"
              className="cursor-pointer bg-background/10 text-primary-foreground border-primary-foreground/20 hover:bg-background/20 text-xs"
              onClick={() => handleScenarioClick(scenario.prompt)}
            >
              <scenario.icon className="w-3 h-3 mr-1" />
              {scenario.title}
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Sparkles className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">
                Hi! I'm AiLean, your workplace coaching assistant.
              </p>
              <p className="text-xs mt-2">
                Ask me about team management, hiring, performance issues, or any workplace challenge.
              </p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
            >
              <div
                className={`inline-block p-3 rounded-lg max-w-[85%] ${
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
            <div className="text-left mb-4">
              <div className="inline-block p-3 rounded-lg bg-muted">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t flex gap-2">
          <Button
            onClick={toggleVoiceRecording}
            disabled={isLoading}
            size="sm"
            variant={isListening ? "destructive" : "outline"}
            className="shrink-0"
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your question..."
            disabled={isLoading || isListening}
            className="flex-1"
          />
          
          <Button
            onClick={() => sendMessage(inputMessage)}
            disabled={isLoading || isListening || !inputMessage.trim()}
            size="sm"
            className="shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
