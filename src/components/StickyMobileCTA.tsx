import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Award, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const StickyMobileCTA = () => {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling past the hero section (approximately 100vh)
      setIsVisible(window.scrollY > window.innerHeight * 0.8);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial position
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card shadow-2xl border-t-2 border-primary p-3 md:hidden animate-slide-in-up">
      <div className="flex gap-2">
        <Button
          onClick={() => navigate('/auth?role=student')}
          className="flex-1 bg-primary text-primary-foreground h-14 text-base font-semibold shadow-lg"
          size="touch"
        >
          <Award className="h-5 w-5 mr-2" />
          Start Training
        </Button>
        <Button
          onClick={() => navigate('/org/apply')}
          variant="outline"
          className="flex-1 border-2 border-primary h-14 text-base font-semibold"
          size="touch"
        >
          <Building2 className="h-5 w-5 mr-2" />
          Get Audit
        </Button>
      </div>
    </div>
  );
};
