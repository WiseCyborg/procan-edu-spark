// TEMPORARY MINIMAL TEST VERSION - Replace with original after diagnosing issue
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Building2, Award, UserCog } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary/90 to-accent p-4">
      <div className="max-w-3xl text-center text-white space-y-8">
        <div className="space-y-4">
          <h1 className="text-6xl md:text-7xl font-bold">ProCann Edu</h1>
          <h2 className="text-2xl md:text-3xl text-white/95">Maryland's Premier RVT Training</h2>
          <p className="text-xl text-white/90">Official Training Partner of Maryland Dispensaries</p>
        </div>
        
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <p className="text-lg">
            ✅ <strong>If you see this page, routing works!</strong>
          </p>
          <p className="text-sm text-white/80 mt-2">
            This is a minimal test version to diagnose the blank screen issue.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button 
            onClick={() => navigate('/org/apply')}
            size="lg"
            className="bg-white text-primary hover:bg-white/90 px-6 py-4 h-auto"
          >
            <Building2 className="h-5 w-5 mr-2" />
            <div>Dispensary Application</div>
          </Button>
          
          <Button 
            onClick={() => navigate('/auth?role=training_coordinator')}
            variant="outline"
            size="lg"
            className="border-2 border-white/60 text-white bg-white/10 hover:bg-white/20 px-6 py-4 h-auto"
          >
            <UserCog className="h-5 w-5 mr-2" />
            <div>Training Coordinator</div>
          </Button>
          
          <Button 
            onClick={() => navigate('/auth?role=student')}
            variant="outline"
            size="lg"
            className="border-2 border-white/60 text-white bg-white/10 hover:bg-white/20 px-6 py-4 h-auto"
          >
            <Award className="h-5 w-5 mr-2" />
            <div>I'm a Student</div>
          </Button>
        </div>
        
        <div className="flex flex-wrap justify-center gap-4 text-sm">
          <button 
            onClick={() => navigate('/faq')}
            className="text-white/80 hover:text-white transition-colors underline"
          >
            FAQ
          </button>
          <span className="text-white/60">•</span>
          <button 
            onClick={() => navigate('/verify-certificate')}
            className="text-white/80 hover:text-white transition-colors underline"
          >
            Verify Certificate
          </button>
          <span className="text-white/60">•</span>
          <button 
            onClick={() => navigate('/get-started')}
            className="text-white/80 hover:text-white transition-colors underline"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

export default Index;
