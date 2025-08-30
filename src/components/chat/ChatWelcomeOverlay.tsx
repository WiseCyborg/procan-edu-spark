import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, MessageCircle, Mic, Settings, Download, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface WelcomeOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  onStartTour?: () => void;
}

export const ChatWelcomeOverlay: React.FC<WelcomeOverlayProps> = ({
  isVisible,
  onClose,
  onStartTour
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  
  const features = [
    {
      icon: MessageCircle,
      title: "Maryland's ProCann Assist",
      description: "Your friendly cannabis training assistant with that authentic Maryland character",
      color: "bg-primary"
    },
    {
      icon: Mic,
      title: "Voice Conversations",
      description: "Talk naturally - I can hear you and speak back with customizable voices",
      color: "bg-blue-500"
    },
    {
      icon: Settings,
      title: "Smart Context",
      description: "I know where you are in the app and provide relevant help for each section",
      color: "bg-green-500"
    },
    {
      icon: Download,
      title: "Export Conversations",
      description: "Save our chats as PDF, text, or JSON for your records",
      color: "bg-purple-500"
    }
  ];

  const handleNext = () => {
    if (currentStep < features.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handleSkip = () => {
    onClose();
  };

  useEffect(() => {
    if (isVisible) {
      // Mark as seen in localStorage
      localStorage.setItem('chat-welcome-seen', 'true');
    }
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", duration: 0.5 }}
          >
            <Card className="w-full max-w-md bg-background border-2 border-primary/20 shadow-2xl">
              <CardHeader className="relative pb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-2 h-8 w-8 p-0"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
                
                <div className="text-center">
                  <motion.div
                    key={currentStep}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", duration: 0.6, delay: 0.2 }}
                    className={`w-16 h-16 rounded-full ${features[currentStep].color} flex items-center justify-center mx-auto mb-4`}
                  >
                    {React.createElement(features[currentStep].icon, { className: "h-8 w-8 text-white" })}
                  </motion.div>
                  
                  <CardTitle className="text-xl mb-2">
                    {features[currentStep].title}
                  </CardTitle>
                  
                  <Badge variant="outline" className="mb-2">
                    {currentStep + 1} of {features.length}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="text-center">
                <motion.p
                  key={currentStep}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-muted-foreground mb-6 leading-relaxed"
                >
                  {features[currentStep].description}
                </motion.p>
                
                {/* Progress indicators */}
                <div className="flex justify-center gap-2 mb-6">
                  {features.map((_, index) => (
                    <div
                      key={index}
                      className={`h-2 w-8 rounded-full transition-all duration-300 ${
                        index === currentStep
                          ? 'bg-primary scale-110'
                          : index < currentStep
                          ? 'bg-primary/50'
                          : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
                
                <div className="flex gap-3 justify-center">
                  <Button
                    variant="outline"
                    onClick={handleSkip}
                    className="px-6"
                  >
                    Skip Tour
                  </Button>
                  
                  <Button
                    onClick={handleNext}
                    className="px-6"
                  >
                    {currentStep === features.length - 1 ? "Get Started" : "Next"}
                  </Button>
                </div>
                
                {currentStep === features.length - 1 && onStartTour && (
                  <Button
                    variant="ghost"
                    onClick={onStartTour}
                    className="mt-3 text-sm text-muted-foreground"
                  >
                    <Star className="h-4 w-4 mr-2" />
                    Take Interactive Tour
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};