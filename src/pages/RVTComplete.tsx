import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Download, CheckCircle2, Users, ArrowRight, Shield, ExternalLink } from 'lucide-react';
import { useUserProgress } from '@/hooks/useUserProgress';
import { useUserRole } from '@/hooks/useUserRole';
import Confetti from 'react-confetti';
import { useWindowSize } from '@/hooks/use-window-size';

const RVTComplete = () => {
  const navigate = useNavigate();
  const { width, height } = useWindowSize();
  const { areAllModulesCompleted, getRvtCompletedCount, getManagerCompletedCount, RVT_MODULE_COUNT, MANAGER_MODULE_COUNT } = useUserProgress();
  const { isDispensaryManager, isTrainingCoordinator, isAdmin } = useUserRole();
  
  const isManagerRole = isDispensaryManager || isTrainingCoordinator || isAdmin;
  const isRvtComplete = areAllModulesCompleted();
  const managerCompleted = getManagerCompletedCount();
  const [showConfetti, setShowConfetti] = React.useState(true);
  
  React.useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);
  
  // Redirect if not complete
  React.useEffect(() => {
    if (!isRvtComplete) {
      navigate('/course');
    }
  }, [isRvtComplete, navigate]);
  
  if (!isRvtComplete) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {showConfetti && <Confetti width={width} height={height} recycle={false} numberOfPieces={500} />}
      
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Hero Celebration */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 mb-6">
            <Award className="h-12 w-12 text-primary" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            🎓 RVT Training Complete!
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Congratulations! You've completed all {RVT_MODULE_COUNT} RVT training modules. 
            You're now ready for certification.
          </p>
          
          <div className="flex items-center justify-center gap-2 mt-6">
            <Badge variant="secondary" className="text-lg px-4 py-2 bg-primary/10 text-primary">
              <CheckCircle2 className="h-5 w-5 mr-2" />
              {RVT_MODULE_COUNT}/{RVT_MODULE_COUNT} Modules Complete
            </Badge>
          </div>
        </div>
        
        {/* Main Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Take Exam Card */}
          <Card className="border-2 border-primary hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-primary/10">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Take RVT Exam</CardTitle>
                  <CardDescription>Earn your official certification</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  25 questions covering all modules
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  80% passing score required
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Unlimited retakes available
                </li>
              </ul>
              
              <Button 
                onClick={() => navigate('/exam')} 
                className="w-full"
                size="lg"
              >
                Start RVT Exam
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </CardContent>
          </Card>
          
          {/* View Certificate Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-accent/10">
                  <Download className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <CardTitle>Certificate Preview</CardTitle>
                  <CardDescription>See your upcoming certificate</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                After passing the exam, you'll receive an official Maryland RVT certificate 
                that can be verified by employers and regulators.
              </p>
              
              <Button 
                onClick={() => navigate('/certificates')} 
                variant="outline"
                className="w-full"
                size="lg"
              >
                View Certificates
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Manager Track Upsell */}
        {isManagerRole && managerCompleted < MANAGER_MODULE_COUNT && (
          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/50">
                  <Users className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-amber-800 dark:text-amber-200">
                      Manager Track Available
                    </CardTitle>
                    <Badge variant="outline" className="text-amber-600 border-amber-300">
                      Optional
                    </Badge>
                  </div>
                  <CardDescription className="text-amber-700 dark:text-amber-300">
                    Advance your leadership skills
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                As a manager, you have access to {MANAGER_MODULE_COUNT} additional leadership modules. 
                These are optional and do not affect your RVT certification.
              </p>
              
              <div className="flex items-center gap-2 text-sm">
                <span className="text-amber-600 font-medium">
                  {managerCompleted}/{MANAGER_MODULE_COUNT} Complete
                </span>
                <div className="flex-1 h-2 bg-amber-200 dark:bg-amber-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 transition-all"
                    style={{ width: `${(managerCompleted / MANAGER_MODULE_COUNT) * 100}%` }}
                  />
                </div>
              </div>
              
              <Button 
                onClick={() => navigate('/course/19')} 
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/50"
              >
                Start Manager Track
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}
        
        {/* Footer Links */}
        <div className="text-center mt-12 space-y-4">
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <Button variant="link" onClick={() => navigate('/course')}>
              Review Training Modules
            </Button>
            <span>•</span>
            <Button variant="link" onClick={() => navigate('/faq')}>
              Frequently Asked Questions
            </Button>
            <span>•</span>
            <Button variant="link" onClick={() => navigate('/verify-certificate')}>
              Certificate Verification
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground">
            This training is aligned with COMAR 10.62.35 standards for Maryland cannabis retail employees.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RVTComplete;
