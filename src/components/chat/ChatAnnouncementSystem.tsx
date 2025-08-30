import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, MessageCircle, Sparkles, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnnouncementProps {
  onDismiss: () => void;
  onOpenChat: () => void;
  currentRoute: string;
}

export const ChatAnnouncementSystem: React.FC<AnnouncementProps> = ({
  onDismiss,
  onOpenChat,
  currentRoute
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState(0);

  const announcements = [
    {
      title: "👋 Hey Maryland!",
      message: "I'm ProCann Assist, your cannabis training assistant. Need help navigating Maryland's regulations?",
      cta: "Start Chatting",
      icon: MessageCircle,
      color: "bg-primary"
    },
    {
      title: "🎯 Smart Help",
      message: "I know exactly where you are in the training. Ask me anything about this section!",
      cta: "Get Help Now",
      icon: Sparkles,
      color: "bg-blue-500"
    },
    {
      title: "🎤 Voice Ready",
      message: "Talk to me naturally! I can hear you and respond with my Baltimore-friendly voice.",
      cta: "Try Voice Chat",
      icon: MessageCircle,
      color: "bg-green-500"
    }
  ];

  useEffect(() => {
    // Check if user has seen announcements recently
    const lastSeen = localStorage.getItem('chat-announcements-seen');
    const now = Date.now();
    const sixHours = 6 * 60 * 60 * 1000;
    
    if (!lastSeen || now - parseInt(lastSeen) > sixHours) {
      // Show announcement after a delay
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [currentRoute]);

  useEffect(() => {
    if (isVisible) {
      // Cycle through announcements
      const interval = setInterval(() => {
        setCurrentAnnouncement((prev) => 
          (prev + 1) % announcements.length
        );
      }, 4000);
      
      return () => clearInterval(interval);
    }
  }, [isVisible, announcements.length]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('chat-announcements-seen', Date.now().toString());
    onDismiss();
  };

  const handleOpenChat = () => {
    setIsVisible(false);
    localStorage.setItem('chat-announcements-seen', Date.now().toString());
    onOpenChat();
  };

  const current = announcements[currentAnnouncement];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="fixed bottom-24 right-4 z-40 w-80"
        >
          <Card className="bg-background border-2 border-primary/20 shadow-xl overflow-hidden">
            <div className={`h-1 ${current.color} w-full`} />
            
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full ${current.color} flex items-center justify-center`}>
                    <current.icon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{current.title}</h3>
                    <Badge variant="outline" className="text-xs mt-1">
                      AI Assistant
                    </Badge>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  onClick={handleDismiss}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                {current.message}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {announcements.map((_, index) => (
                    <div
                      key={index}
                      className={`h-1.5 w-6 rounded-full transition-all duration-300 ${
                        index === currentAnnouncement
                          ? 'bg-primary'
                          : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
                
                <Button
                  size="sm"
                  onClick={handleOpenChat}
                  className="gap-2"
                >
                  {current.cta}
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Floating particles effect */}
          <div className="absolute -top-2 -right-2 w-4 h-4">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-full h-full bg-primary rounded-full"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};