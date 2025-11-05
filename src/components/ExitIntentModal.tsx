import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const ExitIntentModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [hasShown, setHasShown] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if already shown in this session
    const shown = sessionStorage.getItem('exit_intent_shown');
    if (shown) {
      setHasShown(true);
      return;
    }

    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger if cursor leaves from top of viewport
      if (e.clientY <= 0 && !hasShown) {
        setIsOpen(true);
        setHasShown(true);
        sessionStorage.setItem('exit_intent_shown', 'true');
      }
    };

    // Add delay before enabling to avoid false triggers
    const timer = setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave);
    }, 3000);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [hasShown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email to download the checklist.",
        variant: "destructive",
      });
      return;
    }

    // Store lead in localStorage for now (in production, would send to backend)
    const leads = JSON.parse(localStorage.getItem('exit_intent_leads') || '[]');
    leads.push({
      email,
      timestamp: new Date().toISOString(),
      source: 'exit_intent_modal',
    });
    localStorage.setItem('exit_intent_leads', JSON.stringify(leads));

    toast({
      title: "Success!",
      description: "Check your email for the Maryland RVT Compliance Checklist.",
    });

    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <button
          onClick={() => setIsOpen(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
        >
          <X className="h-4 w-4" />
        </button>
        
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Download className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-2xl">
            Wait! Get Your Free Compliance Checklist
          </DialogTitle>
          <DialogDescription className="text-center">
            Download the <strong>Maryland RVT Compliance Checklist</strong> and ensure your dispensary meets all COMAR 14.17 requirements.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-primary">24</div>
              <div className="text-sm text-muted-foreground">COMAR Points</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-primary">$50</div>
              <div className="text-sm text-muted-foreground">Max Allowed</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-primary">100%</div>
              <div className="text-sm text-muted-foreground">Compliant</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-primary">Free</div>
              <div className="text-sm text-muted-foreground">Download</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full"
            />
            <Button type="submit" className="w-full" size="lg">
              <Download className="mr-2 h-4 w-4" />
              Download Free Checklist
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            No spam. Just the compliance checklist and occasional updates.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
