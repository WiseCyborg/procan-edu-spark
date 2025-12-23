import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChecklistItem, CheckItemValue } from './ChecklistItem';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export interface ChecklistSectionItem {
  id: string;
  label: string;
}

export interface ChecklistSectionData {
  [key: string]: CheckItemValue;
}

interface ChecklistSectionProps {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  items: ChecklistSectionItem[];
  data: ChecklistSectionData;
  onChange: (sectionId: string, data: ChecklistSectionData) => void;
  disabled?: boolean;
}

export const ChecklistSection: React.FC<ChecklistSectionProps> = ({
  id,
  title,
  description,
  icon,
  items,
  data,
  onChange,
  disabled = false
}) => {
  const handleItemChange = (itemId: string, value: CheckItemValue) => {
    onChange(id, { ...data, [itemId]: value });
  };

  // Calculate section stats
  const stats = items.reduce(
    (acc, item) => {
      const status = data[item.id]?.status || 'pending';
      acc[status]++;
      return acc;
    },
    { pass: 0, fail: 0, pending: 0 }
  );

  const completedCount = stats.pass + stats.fail;
  const totalCount = items.length;
  const isComplete = completedCount === totalCount;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {icon && <div className="mt-0.5 text-primary">{icon}</div>}
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              {description && (
                <CardDescription className="mt-1">{description}</CardDescription>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {stats.pass > 0 && (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {stats.pass}
              </Badge>
            )}
            {stats.fail > 0 && (
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                <XCircle className="h-3 w-3 mr-1" />
                {stats.fail}
              </Badge>
            )}
            {stats.pending > 0 && (
              <Badge variant="outline" className="bg-muted text-muted-foreground">
                <AlertCircle className="h-3 w-3 mr-1" />
                {stats.pending}
              </Badge>
            )}
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <ChecklistItem
            key={item.id}
            id={`${id}-${item.id}`}
            label={item.label}
            value={data[item.id] || { status: 'pending', notes: '' }}
            onChange={(value) => handleItemChange(item.id, value)}
            disabled={disabled}
          />
        ))}
      </CardContent>
    </Card>
  );
};
