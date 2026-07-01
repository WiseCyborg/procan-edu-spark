import React, { useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Target } from 'lucide-react';
import { sanitizeHtml } from '@/utils/sanitize-html';
import { RegulatorySidebar } from '@/components/regulatory/RegulatorySidebar';
import { ListenButton } from '@/components/i18n/ListenButton';
import { MachineTranslationBadge } from '@/components/i18n/MachineTranslationBadge';

interface CourseContentProps {
  content: string;
  learningObjectives: string[];
  estimatedTime: number;
  tier?: 'green' | 'yellow' | 'red';
  onComplete?: () => void;
  moduleNumber?: number;
  comarReference?: string;
  showRegulatorySidebar?: boolean;
}

const CourseContent: React.FC<CourseContentProps> = ({
  content,
  learningObjectives,
  estimatedTime,
  tier,
  onComplete,
  moduleNumber,
  comarReference,
  showRegulatorySidebar = true
}) => {
  // Sanitize content once on mount/update
  const sanitizedContent = useMemo(() => sanitizeHtml(content), [content]);

  const getTierColor = (tier?: string) => {
    switch (tier) {
      case 'green': return 'bg-green-100 text-green-800 border-green-300';
      case 'yellow': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'red': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className={showRegulatorySidebar ? "grid grid-cols-1 lg:grid-cols-3 gap-6" : "space-y-6"}>
      <div className={showRegulatorySidebar ? "lg:col-span-2 space-y-6" : "space-y-6"}>
        {/* Header Info */}
        <div className="flex items-center gap-4 flex-wrap">
          {tier && (
            <Badge className={getTierColor(tier)} variant="outline">
              {tier.toUpperCase()} TIER
            </Badge>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{estimatedTime} minutes</span>
          </div>
        </div>

        {/* Learning Objectives */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Learning Objectives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {learningObjectives.map((objective, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                  <span className="text-sm">{objective}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Main Content - NOW SANITIZED */}
        <Card>
          <CardContent className="pt-6">
            <div 
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Regulatory Sidebar */}
      {showRegulatorySidebar && moduleNumber && (
        <div className="lg:col-span-1">
          <RegulatorySidebar 
            sectionNumber={moduleNumber.toString()}
            comarReference={comarReference}
          />
        </div>
      )}
    </div>
  );
};

export default CourseContent;
