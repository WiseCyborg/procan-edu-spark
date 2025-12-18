import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  CheckCircle,
  Clock,
  Award,
  Star
} from 'lucide-react';

interface EnhancedCoursePreviewProps {
  module: {
    id: string;
    title: string;
    description: string;
    estimatedTime: string;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    objectives: string[];
    completed: boolean;
  };
  onStart: () => void;
}

export const EnhancedCoursePreview: React.FC<EnhancedCoursePreviewProps> = ({
  module,
  onStart
}) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'text-green-600 bg-green-50';
      case 'Intermediate': return 'text-orange-600 bg-orange-50';
      case 'Advanced': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getDifficultyStars = (difficulty: string) => {
    const stars = difficulty === 'Beginner' ? 1 : difficulty === 'Intermediate' ? 2 : 3;
    return Array.from({ length: 3 }, (_, i) => (
      <Star 
        key={i} 
        className={`h-3 w-3 ${i < stars ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
      />
    ));
  };

  return (
    <Card className="w-full max-w-md mx-auto hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {module.title}
              {module.completed && <CheckCircle className="h-5 w-5 text-green-600" />}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {module.description}
        </p>
        
        {/* Module Metadata */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{module.estimatedTime}</span>
          </div>
          
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(module.difficulty)}`}>
            <div className="flex items-center gap-1">
              <span>{module.difficulty}</span>
              <div className="flex gap-0.5">
                {getDifficultyStars(module.difficulty)}
              </div>
            </div>
          </div>
        </div>
        
        {/* Learning Objectives */}
        <div>
          <h4 className="font-medium text-sm mb-2">Learning Objectives:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            {module.objectives.map((objective, index) => (
              <li key={index} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 flex-shrink-0"></div>
                <span>{objective}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Action Button */}
        <Button 
          onClick={onStart}
          className="w-full"
          variant={module.completed ? "outline" : "default"}
        >
          {module.completed ? 'Review Module' : 'Start Learning'}
        </Button>
      </CardContent>
    </Card>
  );
};

export const CoursePreviewSystem: React.FC = () => {
  const navigate = useNavigate();
  const [currentModule, setCurrentModule] = React.useState(0);
  
  const modules = [
    {
      id: 'part1',
      title: 'Cannabis Fundamentals',
      description: 'Learn the basics of cannabis science, terminology, and Maryland\'s regulatory framework.',
      estimatedTime: '20-25 minutes',
      difficulty: 'Beginner' as const,
      objectives: [
        'Understand basic cannabis terminology',
        'Learn about different cannabis products',
        'Identify key regulatory requirements'
      ],
      completed: false
    },
    {
      id: 'part2', 
      title: 'Legal Compliance',
      description: 'Master Maryland\'s cannabis laws, licensing requirements, and compliance protocols.',
      estimatedTime: '30-35 minutes',
      difficulty: 'Intermediate' as const,
      objectives: [
        'Navigate Maryland cannabis regulations',
        'Understand licensing requirements', 
        'Learn compliance documentation'
      ],
      completed: false
    },
    {
      id: 'part3',
      title: 'Advanced Operations',
      description: 'Deep dive into inventory management, security protocols, and quality control.',
      estimatedTime: '25-30 minutes', 
      difficulty: 'Advanced' as const,
      objectives: [
        'Master inventory tracking systems',
        'Implement security best practices',
        'Ensure product quality standards'
      ],
      completed: false
    }
  ];

  const nextModule = () => {
    setCurrentModule((prev) => (prev + 1) % modules.length);
  };

  const prevModule = () => {
    setCurrentModule((prev) => (prev - 1 + modules.length) % modules.length);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Course Preview</h2>
        <p className="text-muted-foreground">
          Explore what you'll learn in each module
        </p>
      </div>
      
      {/* Progress Indicator */}
      <div className="flex justify-center mb-6">
        <div className="flex items-center gap-2">
          {modules.map((_, index) => (
            <div
              key={index}
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentModule ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>
      
      {/* Module Preview */}
      <div className="relative flex items-center justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={prevModule}
          className="absolute left-0 z-10"
          disabled={currentModule === 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <EnhancedCoursePreview
          module={modules[currentModule]}
          onStart={() => navigate('/course')}
        />
        
        <Button
          variant="outline"
          size="sm"
          onClick={nextModule}
          className="absolute right-0 z-10"
          disabled={currentModule === modules.length - 1}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Quick Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">4-6</div>
            <div className="text-sm text-muted-foreground">Hours Total</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <BookOpen className="h-6 w-6 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">18</div>
            <div className="text-sm text-muted-foreground">Modules</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Award className="h-6 w-6 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">1</div>
            <div className="text-sm text-muted-foreground">Certificate</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};