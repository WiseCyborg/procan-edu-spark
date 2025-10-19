import React from 'react';
import QRCode from 'react-qr-code';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, Smartphone, Laptop, RefreshCw, AlertCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface CameraUnavailableDialogProps {
  open: boolean;
  onClose: () => void;
  onRetry: () => void;
  errorType: 'no-camera' | 'permission-denied' | 'https-required' | 'in-use' | 'unknown';
}

export const CameraUnavailableDialog: React.FC<CameraUnavailableDialogProps> = ({
  open,
  onClose,
  onRetry,
  errorType
}) => {
  const isMobile = useIsMobile();
  const currentUrl = window.location.href;

  const getErrorMessage = () => {
    switch (errorType) {
      case 'no-camera':
        return {
          title: 'No Camera Detected',
          description: 'Your device doesn\'t have a camera or it\'s not accessible.',
          icon: <Camera className="w-12 h-12 text-amber-500" />
        };
      case 'permission-denied':
        return {
          title: 'Camera Access Denied',
          description: 'You need to allow camera access to take your verification photo.',
          icon: <AlertCircle className="w-12 h-12 text-red-500" />
        };
      case 'https-required':
        return {
          title: 'Secure Connection Required',
          description: 'Camera access requires a secure (HTTPS) connection.',
          icon: <AlertCircle className="w-12 h-12 text-amber-500" />
        };
      case 'in-use':
        return {
          title: 'Camera In Use',
          description: 'Your camera is being used by another application.',
          icon: <Camera className="w-12 h-12 text-amber-500" />
        };
      default:
        return {
          title: 'Camera Error',
          description: 'Unable to access your camera.',
          icon: <AlertCircle className="w-12 h-12 text-red-500" />
        };
    }
  };

  const error = getErrorMessage();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            {error.icon}
          </div>
          <DialogTitle className="text-center text-2xl">{error.title}</DialogTitle>
          <DialogDescription className="text-center text-base">
            {error.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {errorType === 'no-camera' && (
            <>
              <Alert>
                <Camera className="h-4 w-4" />
                <AlertDescription>
                  A camera is required to take your verification photo for the certificate.
                  Please switch to a device with a working camera.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <h4 className="font-semibold text-center">Switch to a Device with Camera</h4>
                
                {isMobile ? (
                  <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                    <Laptop className="w-8 h-8 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium">Try on Desktop</p>
                      <p className="text-sm text-muted-foreground">
                        Visit this page on a computer with a webcam
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                      <Smartphone className="w-8 h-8 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">Scan with Your Phone</p>
                        <p className="text-sm text-muted-foreground">
                          Continue the exam on your mobile device
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-center p-6 bg-white rounded-lg border-2 border-border">
                      <QRCode value={currentUrl} size={200} />
                    </div>
                    <p className="text-xs text-center text-muted-foreground">
                      Scan this QR code with your phone's camera app
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {errorType === 'permission-denied' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">To enable camera access:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Click the camera icon in your browser's address bar</li>
                    <li>Select "Allow" for camera permissions</li>
                    <li>Refresh the page and try again</li>
                  </ol>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {errorType === 'https-required' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Camera access requires a secure HTTPS connection. Please ensure you're accessing
                this page via HTTPS (the URL should start with "https://").
              </AlertDescription>
            </Alert>
          )}

          {errorType === 'in-use' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p>Your camera is currently being used by another application.</p>
                  <p className="text-sm">Please close other apps that might be using the camera and try again.</p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-center gap-3">
            <Button onClick={onRetry} size="lg">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            {errorType === 'no-camera' && (
              <Button onClick={onClose} variant="outline" size="lg">
                Close
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
