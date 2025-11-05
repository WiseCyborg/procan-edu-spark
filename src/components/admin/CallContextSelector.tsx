import { useState } from 'react';
import { Phone, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type CallerType = 'dispensary_manager' | 'training_coordinator' | 'employee' | 'applicant' | null;

interface CallContextSelectorProps {
  onSelect: (type: CallerType) => void;
}

export const CallContextSelector = ({ onSelect }: CallContextSelectorProps) => {
  const [selectedType, setSelectedType] = useState<CallerType>(null);

  const callerTypes = [
    { value: 'dispensary_manager', label: 'Dispensary Manager', icon: '🏢' },
    { value: 'training_coordinator', label: 'Training Coordinator', icon: '👨‍🏫' },
    { value: 'employee', label: 'Employee', icon: '👤' },
    { value: 'applicant', label: 'Applicant', icon: '📋' },
  ];

  const handleSelect = (type: CallerType) => {
    setSelectedType(type);
    onSelect(type);
  };

  const selectedLabel = callerTypes.find(t => t.value === selectedType)?.label || 'Select Caller Type';
  const selectedIcon = callerTypes.find(t => t.value === selectedType)?.icon;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Phone className="h-4 w-4" />
        Active Call Context
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2">
              {selectedIcon && <span>{selectedIcon}</span>}
              {selectedLabel}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[240px]">
          {callerTypes.map((type) => (
            <DropdownMenuItem
              key={type.value}
              onClick={() => handleSelect(type.value as CallerType)}
              className="cursor-pointer"
            >
              <span className="mr-2">{type.icon}</span>
              {type.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onClick={() => handleSelect(null)} className="cursor-pointer text-muted-foreground">
            Clear Selection
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {selectedType && (
        <div className="text-xs text-muted-foreground p-2 bg-muted rounded-md">
          Quick actions adjusted for {selectedLabel.toLowerCase()}
        </div>
      )}
    </div>
  );
};
