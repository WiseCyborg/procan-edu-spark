import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Smartphone, 
  Monitor, 
  Tablet, 
  Wifi, 
  Download,
  Eye,
  Volume2,
  ZoomIn
} from 'lucide-react';

export const MobileOptimizationIndicator: React.FC = () => {
  const [isMobile, setIsMobile] = React.useState(false);
  const [isTablet, setIsTablet] = React.useState(false);

  React.useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-48 bg-background/95 backdrop-blur border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            {isMobile && <Smartphone className="h-4 w-4 text-blue-500" />}
            {isTablet && <Tablet className="h-4 w-4 text-green-500" />}
            {!isMobile && !isTablet && <Monitor className="h-4 w-4 text-purple-500" />}
            Device Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Badge 
            variant={isMobile ? "default" : "secondary"}
            className="text-xs"
          >
            {isMobile ? "Mobile" : isTablet ? "Tablet" : "Desktop"}
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
};

export const AccessibilityToolbar: React.FC = () => {
  const [fontSize, setFontSize] = React.useState(16);
  const [highContrast, setHighContrast] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
  }, [fontSize]);

  React.useEffect(() => {
    if (highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [highContrast]);

  return (
    <>
      <style>{`
        .high-contrast {
          filter: contrast(150%);
        }
        .high-contrast * {
          border-color: #000 !important;
        }
      `}</style>
      
      <div className="fixed top-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          variant="outline"
          size="sm"
          className="mb-2"
          aria-label="Open accessibility options"
        >
          <Eye className="h-4 w-4" />
        </Button>
        
        {isOpen && (
          <Card className="w-64 bg-background/95 backdrop-blur border">
            <CardHeader>
              <CardTitle className="text-sm">Accessibility Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium">Font Size</label>
                <div className="flex items-center gap-2 mt-1">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setFontSize(Math.max(12, fontSize - 2))}
                  >
                    A-
                  </Button>
                  <span className="text-sm flex-1 text-center">{fontSize}px</span>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setFontSize(Math.min(24, fontSize + 2))}
                  >
                    A+
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">High Contrast</label>
                <Button
                  size="sm"
                  variant={highContrast ? "default" : "outline"}
                  onClick={() => setHighContrast(!highContrast)}
                >
                  {highContrast ? "On" : "Off"}
                </Button>
              </div>
              
              <div className="text-xs text-muted-foreground pt-2 border-t">
                <p>• Use Tab key for navigation</p>
                <p>• Use Enter/Space to activate</p>
                <p>• Use Escape to close dialogs</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};

export const MobileNavigation: React.FC = () => {
  const [isVisible, setIsVisible] = React.useState(true);
  const [lastScrollY, setLastScrollY] = React.useState(0);

  React.useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsVisible(currentScrollY < lastScrollY || currentScrollY < 100);
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <div className={`
      md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t
      transition-transform duration-300
      ${isVisible ? 'translate-y-0' : 'translate-y-full'}
    `}>
      <div className="flex justify-around items-center p-2">
        <Button variant="ghost" size="sm" className="flex-1 flex-col h-auto py-2">
          <Monitor className="h-4 w-4 mb-1" />
          <span className="text-xs">Dashboard</span>
        </Button>
        <Button variant="ghost" size="sm" className="flex-1 flex-col h-auto py-2">
          <Download className="h-4 w-4 mb-1" />
          <span className="text-xs">Course</span>
        </Button>
        <Button variant="ghost" size="sm" className="flex-1 flex-col h-auto py-2">
          <Volume2 className="h-4 w-4 mb-1" />
          <span className="text-xs">Profile</span>
        </Button>
      </div>
    </div>
  );
};