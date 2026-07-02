import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
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
  Move,
  Maximize2,
  Minimize2,
  Download,
  History,
  Archive
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from '@/components/ui/use-toast';
import { useConversation } from '@11labs/react';
import { useUnifiedVoice } from '@/providers/UnifiedVoiceProvider';
import { DraggableMessage } from './DraggableMessage';
import { PinnedMessagesManager, usePinnedMessages } from './PinnedMessagesManager';
import { EnhancedScrollArea } from './EnhancedScrollArea';
import { ChatWelcomeOverlay } from './ChatWelcomeOverlay';
import { VoiceSettingsPanel } from './VoiceSettingsPanel';
import { ChatExportDialog } from './ChatExportDialog';
import { InteractiveMessage } from './InteractiveMessage';
import { ChatAnnouncementSystem } from './ChatAnnouncementSystem';
import { useChatPersistence } from '@/hooks/useChatPersistence';
import { LanguageSwitcher, getStoredLanguage, setStoredLanguage } from './LanguageSwitcher';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  pageContext?: {
    route: string;
    title: string;
    description: string;
  };
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
        'Having trouble signing in, hon?',
        'Need help getting started with your account?',
        'Forgot your password? No worries!',
        'Questions about Maryland cannabis training requirements?'
      ],
      systemPrompt: `You are AiLean, Maryland's friendly cannabis training assistant for ProCann Edu. You're helping users with authentication and account issues. Keep that Maryland warmth while being professional and helpful.`
    };
  }
  
  if (pathname === '/dashboard') {
    return {
      route: 'dashboard',
      title: 'Dashboard & Training Progress',
      description: 'Navigate your cannabis education journey',
      helpTips: [
        'How do I start my Maryland cannabis training?',
        'Where can I see my progress?',
        'How do I download my certificate?',
        'What courses help with MCA compliance?'
      ],
      systemPrompt: `You are AiLean, helping Maryland cannabis professionals navigate their training dashboard. Show that local pride while keeping users on track with their education goals.`
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
      title: 'Maryland Cannabis Course Help',
      description: 'Get help with Maryland cannabis regulations and course content',
      helpTips: [
        'Explain Maryland cannabis regulations',
        'Help me understand METRC tracking',
        'What are MCA compliance requirements?',
        'How does Maryland compare to other states?'
      ],
      systemPrompt: `You are AiLean, Maryland's cannabis education expert. Help users understand Maryland's specific cannabis laws and regulations. Keep it clear, practical, and show that Maryland pride.`
    };
  }
  
  if (pathname === '/welcome') {
    return {
      route: 'welcome',
      title: 'Welcome to ProCann Edu',
      description: 'Learn about Maryland\'s premier cannabis training platform',
      helpTips: [
        'What is ProCann Edu about?',
        'How does cannabis training work in Maryland?',
        'What will I learn for the Maryland market?',
        'How long does certification take?'
      ],
      systemPrompt: `You are AiLean, Maryland's welcoming cannabis training assistant. Get new users excited about cannabis education while highlighting Maryland's opportunities. Be enthusiastic but professional.`
    };
  }
  
  return {
    route: 'general',
    title: 'AiLean',
    description: 'Your Maryland cannabis education and compliance expert',
    helpTips: [
      'Tell me about Maryland cannabis opportunities',
      'What training is available in Baltimore?',
      'How do I get MCA compliant?',
      'Cannabis industry questions'
    ],
    systemPrompt: `You are AiLean, Maryland's premier cannabis training assistant for ProCann Edu. Provide helpful information with that authentic Maryland character while keeping it professional and informative.`
  };
};

export const DraggableVoiceAssistant: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { roles } = useUserRole();
  const { isPinned, pinMessage, unpinMessage } = usePinnedMessages();
  const { speak, stop, settings: voiceSettings, isSpeaking } = useUnifiedVoice();
  const {
    chatSessions,
    currentSessionId,
    startNewSession,
    saveMessage,
    saveMessages,
    getCurrentSession
  } = useChatPersistence();
  
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showProactiveTip, setShowProactiveTip] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [windowSize, setWindowSize] = useState({ width: 380, height: 480 });
  const [position, setPosition] = useState<Position>(() => {
    const savedPosition = localStorage.getItem('chatAssistantPosition');
    if (savedPosition) {
      try {
        return JSON.parse(savedPosition);
      } catch (error) {
        console.error('Error parsing saved position:', error);
      }
    }
    const agentWidth = 380;
    return {
      x: window.innerWidth - agentWidth - 20,
      y: window.innerHeight - 480 - 20
    };
  });
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [isListening, setIsListening] = useState(false);
  const [isChatDismissed, setIsChatDismissed] = useState(false);
  const [chatLanguage, setChatLanguage] = useState(getStoredLanguage());

  const handleLanguageChange = useCallback(async (lang: { code: string; ttsLang: string }) => {
    setChatLanguage(lang.code);
    setStoredLanguage(lang.code);
    stop();
    if (user?.id) {
      supabase
        .from('profiles')
        .update({ preferred_language: lang.code })
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) console.error('[chat] language preference save failed:', error.message);
        });
    }
  }, [stop, user]);

  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const cardRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const contextInfo = getContextInfo(location.pathname);
  const isChatDisabled = contextInfo.route === 'final-exam';

  // Compute isAuthPage (not a hook, so this is fine before useEffect)
  const isAuthPage = location.pathname === '/auth' || 
                     location.pathname === '/forgot-password' ||
                     location.pathname.includes('/accept-invitation') ||
                     location.pathname.includes('/manager-registration') ||
                     location.search.includes('mode=reset');

  // ============================================
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // ============================================

  // Check if user should see welcome overlay
  useEffect(() => {
    if (isAuthPage) return; // Don't run on auth pages
    const hasSeenWelcome = localStorage.getItem('chat-welcome-seen');
    if (!hasSeenWelcome && !isChatDisabled) {
      setShowWelcome(true);
    }
  }, [isChatDisabled, isAuthPage]);

  // Save position to localStorage when it changes
  useEffect(() => {
    if (isAuthPage) return; // Don't run on auth pages
    localStorage.setItem('chatAssistantPosition', JSON.stringify(position));
  }, [position, isAuthPage]);

  // Save window size to localStorage when it changes
  useEffect(() => {
    if (isAuthPage) return; // Don't run on auth pages
    localStorage.setItem('chatAssistantSize', JSON.stringify(windowSize));
  }, [windowSize, isAuthPage]);

  // Load saved window size on mount
  useEffect(() => {
    if (isAuthPage) return; // Don't run on auth pages
    const savedSize = localStorage.getItem('chatAssistantSize');
    if (savedSize) {
      try {
        setWindowSize(JSON.parse(savedSize));
      } catch (error) {
        console.error('Error parsing saved size:', error);
      }
    }
  }, [isAuthPage]);

  // For future ElevenLabs Conversational AI integration
  // const conversation = useConversation({...});

  // Dragging functionality — scoped ONLY to the header drag handle (<Move /> icon).
  // The launcher button is NOT draggable; it always just toggles open/close.
  // Tracks the pointer's starting position and the panel's starting position,
  // then applies the delta on move. Supports both mouse and touch.
  const dragStartRef = useRef<{ pointerX: number; pointerY: number; panelX: number; panelY: number } | null>(null);

  const beginDrag = useCallback((pointerX: number, pointerY: number) => {
    dragStartRef.current = {
      pointerX,
      pointerY,
      panelX: position.x,
      panelY: position.y,
    };
    setIsDragging(true);
  }, [position.x, position.y]);

  const handleDragHandleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only respond to primary button; don't hijack right-click / middle-click.
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    beginDrag(e.clientX, e.clientY);
  }, [beginDrag]);

  const handleDragHandleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    e.stopPropagation();
    beginDrag(t.clientX, t.clientY);
  }, [beginDrag]);

  const applyPointerMove = useCallback((pointerX: number, pointerY: number) => {
    const start = dragStartRef.current;
    if (!start) return;
    const dx = pointerX - start.pointerX;
    const dy = pointerY - start.pointerY;

    const panelWidth = windowSize.width;
    const panelHeight = Math.min(window.innerHeight * 0.7, 480);

    // Clamp the panel within the viewport (leave a 20px margin).
    const minX = 20 - panelWidth + 80; // allow partial off-screen but keep handle reachable
    const maxX = window.innerWidth - 80;
    const minY = 20;
    const maxY = window.innerHeight - 80;

    const nextX = Math.max(minX, Math.min(start.panelX + dx, maxX));
    const nextY = Math.max(minY, Math.min(start.panelY + dy, maxY));

    setPosition({ x: nextX, y: nextY });
  }, [windowSize.width]);

  const handleWindowMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    applyPointerMove(e.clientX, e.clientY);
  }, [isDragging, applyPointerMove]);

  const handleWindowTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    const t = e.touches[0];
    if (!t) return;
    // Prevent page scroll while dragging the panel via touch.
    if (e.cancelable) e.preventDefault();
    applyPointerMove(t.clientX, t.clientY);
  }, [isDragging, applyPointerMove]);

  const endDrag = useCallback(() => {
    dragStartRef.current = null;
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isAuthPage) return;
    if (!isDragging) return;
    document.addEventListener('mousemove', handleWindowMouseMove);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
    document.addEventListener('touchend', endDrag);
    document.addEventListener('touchcancel', endDrag);
    return () => {
      document.removeEventListener('mousemove', handleWindowMouseMove);
      document.removeEventListener('mouseup', endDrag);
      document.removeEventListener('touchmove', handleWindowTouchMove);
      document.removeEventListener('touchend', endDrag);
      document.removeEventListener('touchcancel', endDrag);
    };
  }, [isDragging, handleWindowMouseMove, handleWindowTouchMove, endDrag, isAuthPage]);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isAuthPage) return; // Don't run on auth pages
    scrollToBottom();
  }, [messages, isAuthPage]);

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
      
      // Auth guard: Voice features require authentication
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to use voice features.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      // Convert audio to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        
        if (!base64Audio) return;

        // Send to speech-to-text
        const { data: transcriptData, error: transcriptError } = await supabase.functions.invoke('voice-to-text', {
          body: { audio: base64Audio }
        });

        if (transcriptError) {
          console.error('[Voice] Transcription error:', transcriptError);
          toast({
            title: "Voice Processing Error",
            description: "Could not process voice input. Please try again.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

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
    if (isAuthPage || isChatDisabled) return; // Don't run on auth pages or when disabled
    
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
  }, [location.pathname, isOpen, isChatDisabled, isAuthPage, contextInfo.helpTips.length]);

  // Enhanced session management
  useEffect(() => {
    if (isAuthPage || !isOpen || messages.length > 0 || isChatDisabled) return; // Don't run on auth pages
    
    // Start new session or load existing
    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = startNewSession(contextInfo.route, contextInfo.title);
    }

    const getWeatherContext = () => {
      const hour = new Date().getHours();
      const season = new Date().getMonth();
      
      if (hour < 12) return "Good morning from Maryland!";
      if (hour < 17) return "Hey there!";
      if (season >= 11 || season <= 2) return "Hope you're staying warm in Maryland!";
      if (season >= 5 && season <= 8) return "Beautiful day in Maryland!";
      return "How's it going in Maryland today?";
    };

    const welcomeMessage: Message = {
      id: Date.now().toString(),
      content: `${getWeatherContext()} I'm AiLean, your Maryland cannabis training assistant. I'm here to help you with ${contextInfo.description.toLowerCase()}. Maryland's cannabis industry is growing fast - what can I help you with today?`,
      isUser: false,
      timestamp: new Date(),
      pageContext: {
        route: contextInfo.route,
        title: contextInfo.title,
        description: contextInfo.description
      }
    };
    
    setMessages([welcomeMessage]);
    if (sessionId) {
      saveMessage(sessionId, welcomeMessage);
    }
  }, [isOpen, messages.length, isChatDisabled, isAuthPage, currentSessionId, startNewSession, saveMessage, contextInfo]);

  useEffect(() => {
    if (!user || !isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('preferred_language')
          .eq('id', user.id)
          .maybeSingle();
        if (cancelled || !profile?.preferred_language) return;
        if (profile.preferred_language !== getStoredLanguage()) {
          setStoredLanguage(profile.preferred_language);
          setChatLanguage(profile.preferred_language);
        }
      } catch (err) {
        console.error('[chat] language sync failed:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [user, isOpen]);

  // ============================================
  // CONDITIONAL RETURNS MUST COME AFTER ALL HOOKS
  // ============================================

  // Hide voice assistant on authentication pages to prevent auth errors
  if (isAuthPage) {
    return null;
  }

  const sendMessage = async (messageText?: string) => {
    const text = messageText || inputMessage.trim();
    if (!text || isLoading || isChatDisabled) return;

    // For unauthenticated users, chat still works but won't persist or have full context
    if (!user) {
      console.log('[DraggableVoiceAssistant] Chat in anonymous mode - limited functionality');
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: text,
      isUser: true,
      timestamp: new Date(),
      pageContext: {
        route: contextInfo.route,
        title: contextInfo.title,
        description: contextInfo.description
      }
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Auth guard for chat assistant calls
      const { data, error } = await supabase.functions.invoke('chat-assistant', {
        body: {
          message: text,
          user_language: (typeof window !== 'undefined' && window.localStorage?.getItem('procann_language')) || 'en',
          context: contextInfo,
          user_id: user?.id || null,
          user_roles: roles || []
        }
      }).catch(err => {
        // Catch auth-related errors gracefully
        if (err?.message?.includes('Auth session missing') || 
            err?.message?.includes('JWT') ||
            err?.message?.includes('401')) {
          console.log('[Chat] Running in anonymous mode');
          return { 
            data: { 
              response: "I'm having trouble connecting right now. Please try signing in for full chat functionality." 
            }, 
            error: null 
          };
        }
        throw err;
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        isUser: false,
        timestamp: new Date(),
        pageContext: {
          route: contextInfo.route,
          title: contextInfo.title,
          description: contextInfo.description
        }
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Text-to-speech for assistant response
      if (voiceSettings.enabled && voiceSettings.volume > 0) {
        speak(data.response);
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


  const handleQuickTip = (tip: string) => {
    setInputMessage(tip);
    if (!isOpen) setIsOpen(true);
  };

  const toggleVoiceRecording = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to use voice features.",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  if (isChatDisabled) {
    // If dismissed, don't render anything
    if (isChatDismissed) {
      return null;
    }
    
    return (
      <div 
        ref={cardRef}
        className="fixed z-50"
        style={{ left: position.x, top: position.y, width: windowSize.width }}
      >
        <Card className="bg-muted border-border">
          <CardContent className="p-4 text-center relative">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6"
              onClick={() => setIsChatDismissed(true)}
            >
              <X className="h-4 w-4" />
            </Button>
            
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
            width: windowSize.width
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

      {/* Chat Toggle Button — click-only, never draggable. */}
      <Button
        onClick={() => {
          setIsOpen((v) => !v);
          setShowProactiveTip(false);
        }}
        className="fixed z-50 h-12 w-12 rounded-full shadow-lg transition-transform hover:scale-105"
        style={{ left: position.x + windowSize.width - 60, top: position.y - 60 }}
        size="icon"
        aria-label={isOpen ? 'Close AiLean chat' : 'Open AiLean chat'}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <div 
          ref={cardRef}
          className="fixed z-40 flex flex-col shadow-xl"
          style={{ 
            left: position.x, 
            top: position.y,
            width: windowSize.width,
            height: 'auto',
            maxHeight: '70vh'
          }}
        >
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-2 relative">
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
                  <LanguageSwitcher compact={true} onLanguageChange={handleLanguageChange} />
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
                        onClick={() => setShowVoiceSettings(true)}
                      >
                        <Volume2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowVoiceSettings(true)}
                      className="w-full text-xs"
                    >
                      Voice Settings
                    </Button>
                    
                    <ChatExportDialog messages={messages}>
                      <Button size="sm" variant="outline" className="w-full text-xs">
                        <Download className="w-4 h-4 mr-1" />
                        Export Chat
                      </Button>
                    </ChatExportDialog>
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
              <EnhancedScrollArea className="flex-1 pr-3 max-h-60">
                <div className="space-y-2">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <DraggableMessage
                        message={message}
                        currentPageContext={{
                          route: contextInfo.route,
                          title: contextInfo.title,
                          description: contextInfo.description
                        }}
                        onPin={pinMessage}
                        onUnpin={unpinMessage}
                        isPinned={isPinned(message.id)}
                      />
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
              </EnhancedScrollArea>

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

      {/* Welcome Overlay */}
      <ChatWelcomeOverlay 
        isVisible={showWelcome}
        onClose={() => setShowWelcome(false)}
      />

      {/* Voice Settings Panel */}
      {showVoiceSettings && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <VoiceSettingsPanel 
            isVisible={showVoiceSettings}
            onClose={() => setShowVoiceSettings(false)}
          />
        </div>
      )}

      {/* Announcement System */}
      {showAnnouncement && (
        <ChatAnnouncementSystem
          onDismiss={() => setShowAnnouncement(false)}
          onOpenChat={() => {
            setIsOpen(true);
            setShowAnnouncement(false);
          }}
          currentRoute={location.pathname}
        />
      )}

      {/* Pinned Messages Manager */}
      <PinnedMessagesManager
        messages={messages}
        currentPageContext={{
          route: contextInfo.route,
          title: contextInfo.title,
          description: contextInfo.description
        }}
      />
    </>
  );
};

export default DraggableVoiceAssistant;
