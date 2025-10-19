import { useState, useRef, useEffect } from 'react';
import { Camera, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface PhotoCaptureDialogProps {
  open: boolean;
  onClose: () => void;
  onPhotoCapture: (photoDataUrl: string) => void;
}

export const PhotoCaptureDialog = ({ open, onClose, onPhotoCapture }: PhotoCaptureDialogProps) => {
  const [photoPreview, setPhotoPreview] = useState('');
  const [showInstructions, setShowInstructions] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && !photoPreview) {
      startCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [open]);

  const startCamera = async () => {
    try {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        if (isIOS) {
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.setAttribute('autoplay', 'true');
          await videoRef.current.play().catch(e => console.error('iOS play error:', e));
        }
      }
      setCameraError(null);
    } catch (err: any) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setCameraError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError('Unable to access camera. Please try uploading a photo instead.');
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const photo = canvas.toDataURL('image/png');
        setPhotoPreview(photo);
        setShowInstructions(false);
        toast({ title: 'Photo captured!', description: 'Review your photo or retake if needed.' });
      }
    }
  };

  const retakePhoto = () => {
    setPhotoPreview('');
    setShowInstructions(true);
    startCamera();
  };

  const confirmPhoto = () => {
    if (photoPreview) {
      onPhotoCapture(photoPreview);
      handleClose();
    }
  };

  const handleClose = () => {
    stopCamera();
    setPhotoPreview('');
    setShowInstructions(true);
    setCameraError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Take Your Photo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {cameraError ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{cameraError}</p>
              <Button onClick={handleClose} variant="outline">
                Close
              </Button>
            </div>
          ) : (
            <>
              {showInstructions && !photoPreview && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                  <p className="font-semibold mb-2">Photo Tips:</p>
                  <ul className="space-y-1 text-gray-700">
                    <li>• Face the camera directly</li>
                    <li>• Ensure good lighting</li>
                    <li>• Remove glasses if they cause glare</li>
                    <li>• Use a plain background if possible</li>
                  </ul>
                </div>
              )}

              <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
                {photoPreview ? (
                  <img 
                    src={photoPreview} 
                    alt="Captured photo" 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain"
                  />
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div className="flex gap-3 justify-center">
                {photoPreview ? (
                  <>
                    <Button onClick={retakePhoto} variant="outline">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Retake
                    </Button>
                    <Button onClick={confirmPhoto} className="bg-stoplight-green hover:bg-stoplight-green/90">
                      Use This Photo
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={handleClose} variant="outline">
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button onClick={capturePhoto} className="bg-stoplight-green hover:bg-stoplight-green/90">
                      <Camera className="w-4 h-4 mr-2" />
                      Capture
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
