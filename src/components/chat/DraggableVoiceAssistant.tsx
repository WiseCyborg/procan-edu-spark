import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  Send, 
  X, 
  HelpCircle, 
  Settings, 
  Mic, 
  MicOff,
  Volume2,
  VolumeX,
  Move
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/components/ui/use-toast';
import { useConversation } from '@11labs/react';

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

interface Position {
  x: number;
  y: number;
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
      systemPrompt: `You are a helpful assistant for ProCann Edu, Maryland's premier cannabis training platform. You're helping users with authentication and account issues. Keep responses concise and helpful.`
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
      systemPrompt: `You are a helpful assistant for ProCann Edu's dashboard. Help users navigate their training progress and courses. Keep responses brief and actionable.`
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
      systemPrompt: `You are a cannabis industry expert assistant for ProCann Edu course modules. Help users understand Maryland cannabis regulations and course content. Keep explanations clear and concise.`
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
      systemPrompt: `You are a welcoming assistant for new ProCann Edu users. Help them understand the platform and get excited about cannabis education. Be enthusiastic but concise.`
    };
  }
  
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
    systemPrompt: `You are a helpful assistant for ProCann Edu, Maryland's premier cannabis training platform. Provide general help and information. Keep responses helpful and concise.`
  };
};

export const DraggableVoiceAssistant: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showProactiveTip, setShowProactiveTip] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 20, y: 20 });
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [volume, setVolume] = useState(0.8);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const cardRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const contextInfo = getContextInfo(location.pathname);
  const isChatDisabled = contextInfo.route === 'final-exam';

  // Calculate agent size based on screen (10:1 ratio)
  const getAgentSize = () => {
    const screenWidth = window.innerWidth;
    const maxWidth = Math.min(screenWidth / 10, 400);
    const minWidth = 280;
    return Math.max(maxWidth, minWidth);
  };

  const [agentWidth] = useState(getAgentSize());

  // For future ElevenLabs Conversational AI integration
  // const conversation = useConversation({...});

  // Dragging functionality
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Keep within screen bounds
    const maxX = window.innerWidth - agentWidth;
    const maxY = window.innerHeight - 400; // Approximate agent height
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  }, [isDragging, dragOffset, agentWidth]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Voice recording functionality
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
    } catch (error) {
      console.error('Error starting voice recording:', error);
      toast({
        title: "Microphone Error",
        description: "Could not access microphone.",
        variant: "destructive",
      });
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
      
      // Convert audio to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        
        if (!base64Audio) return;

        // Send to speech-to-text
        const { data: transcriptData, error: transcriptError } = await supabase.functions.invoke('voice-to-text', {
          body: { audio: base64Audio }
        });

        if (transcriptError) throw transcriptError;

        const transcribedText = transcriptData.text;
        
        if (transcribedText) {
          setInputMessage(transcribedText);
          await sendMessage(transcribedText);
        }
      };
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('Voice processing error:', error);
      toast({
        title: "Voice Processing Error",
        description: "Could not process voice input.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
    }, 120000); // 2 minutes

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [location.pathname, isOpen, isChatDisabled]);

  // Initial welcome message
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

  const sendMessage = async (messageText?: string) => {
    const text = messageText || inputMessage.trim();
    if (!text || isLoading || isChatDisabled) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: text,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat-assistant', {
        body: {
          message: text,
          context: contextInfo,
          user_id: user?.id
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

      // Text-to-speech for assistant response
      if (voiceEnabled && volume > 0) {
        await playTextAsVoice(data.response);
      }
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

  const playTextAsVoice = async (text: string) => {
    try {
      setIsSpeaking(true);
      
      const { data, error } = await supabase.functions.invoke('text-to-voice', {
        body: { 
          text, 
          voice: 'Aria' // Using Aria voice from ElevenLabs
        }
      });

      if (error) throw error;

      // Play the audio
      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
      audio.volume = volume;
      audio.onended = () => setIsSpeaking(false);
      await audio.play();
    } catch (error) {
      console.error('Text-to-speech error:', error);
      setIsSpeaking(false);
    }
  };

  const handleQuickTip = (tip: string) => {
    setInputMessage(tip);
    if (!isOpen) setIsOpen(true);
  };

  const toggleVoiceRecording = () => {
    if (isListening) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  if (isChatDisabled) {
    return (
      <div 
        ref={cardRef}
        className="fixed z-50"
        style={{ left: position.x, top: position.y, width: agentWidth }}
      >
        <Card className="bg-muted border-border">
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
        <div 
          className="fixed z-40 animate-in slide-in-from-right"
          style={{ 
            left: position.x, 
            top: position.y - 80,
            width: agentWidth 
          }}
        >
          <Card className="bg-primary text-primary-foreground shadow-lg">
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
        className="fixed z-50 h-12 w-12 rounded-full shadow-lg"
        style={{ left: position.x + agentWidth - 60, top: position.y - 60 }}
        size="icon"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <div 
          ref={cardRef}
          className="fixed z-40 flex flex-col shadow-xl cursor-move"
          style={{ 
            left: position.x, 
            top: position.y,
            width: agentWidth,
            height: 'auto',
            maxHeight: '70vh'
          }}
          onMouseDown={handleMouseDown}
        >
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-2 relative cursor-move">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Move className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-sm">{contextInfo.title}</CardTitle>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {contextInfo.route}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {isSpeaking && (
                    <div className="flex items-center gap-1">
                      <Volume2 className="w-4 h-4 text-primary animate-pulse" />
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 opacity-67 hover:opacity-100"
                    onClick={() => setShowSettings(!showSettings)}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {/* Settings Panel */}
              {showSettings && (
                <div className="absolute top-full left-0 right-0 bg-background border rounded-lg p-3 shadow-lg z-50">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Voice Output</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
                      >
                        {volume > 0 ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                      </Button>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col p-3 pt-0 cursor-default" onClick={(e) => e.stopPropagation()}>
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
              <ScrollArea className="flex-1 pr-3 max-h-60">
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
                <Button
                  onClick={toggleVoiceRecording}
                  disabled={isLoading}
                  size="sm"
                  variant={isListening ? "destructive" : "outline"}
                  className="px-3"
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask me anything..."
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  disabled={isLoading}
                  className="text-sm"
                />
                <Button
                  onClick={() => sendMessage()}
                  disabled={!inputMessage.trim() || isLoading}
                  size="sm"
                  className="px-3"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default DraggableVoiceAssistant;
