import { useEffect, useState } from 'react';
import { Leaf, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface LoadingPageProps {
  message?: string;
  messages?: string[];
  progress?: number;
  showProgress?: boolean;
}

const defaultMessages = [
  'Loading your training...',
  'Preparing content...',
  'Analyzing compliance...',
  'Setting up your dashboard...',
  'Almost ready...'
];

export const LoadingPage = ({ 
  message, 
  messages = defaultMessages, 
  progress,
  showProgress = true 
}: LoadingPageProps) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!message && messages.length > 1) {
      const interval = setInterval(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [message, messages]);

  const displayMessage = message || messages[currentMessageIndex];

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      role="status"
      aria-live="polite"
      aria-label="Loading content"
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 animate-pulse" />
      
      {/* Floating leaf particles */}
      {[...Array(7)].map((_, i) => (
        <Leaf
          key={i}
          className="absolute text-primary/20"
          style={{
            left: `${15 + i * 12}%`,
            animationDelay: `${i * 1.2}s`,
            fontSize: `${20 + (i % 3) * 8}px`
          }}
          aria-hidden="true"
        />
      ))}

      {/* Main content container */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center">
        {/* Logo/Brand area with glow */}
        <div className="relative">
          <div className="absolute inset-0 animate-glow-pulse rounded-full blur-xl" />
          <div className="relative space-y-2">
            <h1 className="text-5xl font-bold text-primary font-playfair animate-bounce-subtle">
              ProCann Training
            </h1>
            <p className="text-lg text-muted-foreground">
              Maryland's Premier Cannabis Education Platform
            </p>
          </div>
        </div>

        {/* Animated spinner */}
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>

        {/* Progress bar */}
        {showProgress && (
          <div className="w-full max-w-md space-y-2">
            {progress !== undefined ? (
              <Progress value={progress} className="h-2" />
            ) : (
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div className="absolute inset-0 w-1/3 animate-progress-indeterminate rounded-full bg-primary" />
              </div>
            )}
          </div>
        )}

        {/* Loading message */}
        <div className="min-h-[32px] animate-fade-in">
          <p className="text-xl font-medium text-foreground transition-all duration-300">
            {displayMessage}
          </p>
        </div>

        {/* Subtle loading dots */}
        <div className="flex gap-2" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
