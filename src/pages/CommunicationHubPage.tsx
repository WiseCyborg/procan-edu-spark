import { CommunicationHub } from '@/components/communication/CommunicationHub';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CommunicationHubPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="me-4"
          >
            <ArrowLeft className="h-4 w-4 me-2 rtl-flip" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Team Communication</h1>
        </div>
        
        <div className="h-[calc(100vh-12rem)]">
          <CommunicationHub />
        </div>
      </div>
    </div>
  );
};
