import React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle, MinusCircle } from 'lucide-react';

export interface CheckItemValue {
  status: 'pass' | 'fail' | 'pending';
  notes: string;
}

interface ChecklistItemProps {
  id: string;
  label: string;
  value: CheckItemValue;
  onChange: (value: CheckItemValue) => void;
  disabled?: boolean;
}

export const ChecklistItem: React.FC<ChecklistItemProps> = ({
  id,
  label,
  value,
  onChange,
  disabled = false
}) => {
  const handleStatusChange = (status: string) => {
    onChange({ ...value, status: status as CheckItemValue['status'] });
  };

  const handleNotesChange = (notes: string) => {
    onChange({ ...value, notes });
  };

  return (
    <div className="border border-border rounded-lg p-4 bg-card/50">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <Label htmlFor={id} className="text-sm font-medium leading-relaxed flex-1">
            {label}
          </Label>
          <RadioGroup
            value={value.status}
            onValueChange={handleStatusChange}
            className="flex gap-4"
            disabled={disabled}
          >
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="pass" id={`${id}-pass`} className="border-emerald-500" />
              <Label 
                htmlFor={`${id}-pass`} 
                className="text-xs font-medium text-emerald-600 dark:text-emerald-400 cursor-pointer flex items-center gap-1"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Pass
              </Label>
            </div>
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="fail" id={`${id}-fail`} className="border-destructive" />
              <Label 
                htmlFor={`${id}-fail`} 
                className="text-xs font-medium text-destructive cursor-pointer flex items-center gap-1"
              >
                <XCircle className="h-3.5 w-3.5" />
                Fail
              </Label>
            </div>
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="pending" id={`${id}-pending`} className="border-muted-foreground" />
              <Label 
                htmlFor={`${id}-pending`} 
                className="text-xs font-medium text-muted-foreground cursor-pointer flex items-center gap-1"
              >
                <MinusCircle className="h-3.5 w-3.5" />
                N/A
              </Label>
            </div>
          </RadioGroup>
        </div>
        <Textarea
          placeholder="Notes (optional)..."
          value={value.notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          className="text-sm min-h-[60px] resize-none"
          disabled={disabled}
        />
      </div>
    </div>
  );
};
