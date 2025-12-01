import React, { useState, useEffect } from 'react';
import Confetti from 'react-confetti';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  GraduationCap, Award, CheckCircle2, ArrowRight, 
  Trophy, BookOpen, Clock, Shield 
} from 'lucide-react';

interface CourseCompletionCelebrationProps {
  onTakeExam: () => void;
  onReturnToDashboard: () => void;
}

export const CourseCompletionCelebration: React.FC<CourseCompletionCelebrationProps> = ({
  onTakeExam,
  onReturnToDashboard
}) => {
  const [showConfetti, setShowConfetti] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const completedTopics = [
    { icon: <Shield className="h-5 w-5" />, title: "Legal & Regulatory Foundations", modules: "1-6" },
    { icon: <BookOpen className="h-5 w-5" />, title: "Operational Excellence", modules: "7-12" },
    { icon: <Award className="h-5 w-5" />, title: "Advanced Compliance", modules: "13-18" },
    { icon: <Trophy className="h-5 w-5" />, title: "Leadership & Ethics", modules: "19-22" },
  ];

  return (
    <>
      {showConfetti && <Confetti recycle={false} numberOfPieces={300} />}
      
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-4 border-stoplight-green overflow-hidden">
          <CardContent className="p-8 text-center">
            {/* Celebration Header */}
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              className="mb-6"
            >
              <GraduationCap className="h-20 w-20 mx-auto text-stoplight-green mb-4" />
              <h2 className="text-3xl md:text-4xl font-bold text-stoplight-charcoal mb-2">
                🎉 Training Complete!
              </h2>
              <p className="text-xl text-muted-foreground">
                You've completed all 23 modules of Maryland Responsible Vendor Training
              </p>
            </motion.div>

            {/* Achievement Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-8">
              <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg">
                <p className="text-3xl font-bold text-stoplight-green">23</p>
                <p className="text-sm text-muted-foreground">Modules Completed</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">18</p>
                <p className="text-sm text-muted-foreground">COMAR Sections</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-950/30 p-4 rounded-lg">
                <p className="text-3xl font-bold text-purple-600">3</p>
                <p className="text-sm text-muted-foreground">Tier Achievements</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg">
                <Clock className="h-8 w-8 mx-auto text-amber-600 mb-1" />
                <p className="text-sm text-muted-foreground">Hours Invested</p>
              </div>
            </div>

            {/* Topics Mastered */}
            <div className="bg-muted/50 rounded-lg p-6 mb-8">
              <h3 className="font-semibold mb-4 text-lg">Topics Mastered:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                {completedTopics.map((topic, index) => (
                  <div key={index} className="flex items-center gap-3 p-2">
                    <CheckCircle2 className="h-5 w-5 text-stoplight-green flex-shrink-0" />
                    <span className="flex-1">{topic.title}</span>
                    <Badge variant="outline" className="ml-auto flex-shrink-0">
                      Modules {topic.modules}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Next Steps - Final Exam CTA */}
            <div className="border-t pt-6">
              <h3 className="text-xl font-semibold mb-2">Ready for Certification?</h3>
              <p className="text-muted-foreground mb-6">
                Complete the Final Exam to receive your official Maryland RVT Certificate.
                You need 80% or higher to pass.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  onClick={onTakeExam}
                  className="bg-stoplight-green hover:bg-stoplight-green/90 text-white"
                >
                  <Award className="mr-2 h-5 w-5" />
                  Take Final Exam
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={onReturnToDashboard}
                >
                  Return to Dashboard
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground mt-4">
                💡 Tip: The exam covers all 18 COMAR sections with 2 questions each.
                You have 90 minutes total.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
};
