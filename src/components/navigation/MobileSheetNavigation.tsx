import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface NavigationItem {
  id: string;
  path: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface MobileSheetNavigationProps {
  items: NavigationItem[];
}

export const MobileSheetNavigation = ({ items }: MobileSheetNavigationProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
        className="md:hidden h-14 w-14"
      >
        <Menu className="h-6 w-6" />
      </Button>
      
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent 
          side="left" 
          className="w-full p-0"
          aria-label="Main navigation"
        >
          <SheetHeader className="p-6 border-b">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col space-y-1 p-4" role="navigation">
            {items.map(item => (
              <Button
                key={item.id}
                onClick={() => {
                  navigate(item.path);
                  setIsOpen(false);
                }}
                variant="ghost"
                className="justify-start text-lg h-14"
                aria-label={item.description || item.label}
              >
                <item.icon className="mr-4 h-6 w-6" />
                {item.label}
              </Button>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
};
