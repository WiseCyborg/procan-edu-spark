import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Award, Download, Upload, Camera, BadgeCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CertificateWatermark } from './CertificateWatermark';
import { PhotoCaptureDialog } from './PhotoCaptureDialog';
import html2canvas from 'html2canvas';

interface MockCertificatePreviewProps {
  userName?: string;
  tierStatus?: 'green' | 'yellow' | 'red';
  onClose: () => void;
}

export const MockCertificatePreview = ({ 
  userName = '', 
  tierStatus = 'green',
  onClose 
}: MockCertificatePreviewProps) => {
  const [name, setName] = useState(userName);
  const [tier, setTier] = useState<'green' | 'yellow' | 'red'>(tierStatus);
  const [userPhoto, setUserPhoto] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const certificateRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const tierColors = {
    green: { bg: 'bg-stoplight-green', text: 'text-stoplight-green', emoji: '🟢', label: 'Green Tier' },
    yellow: { bg: 'bg-stoplight-yellow', text: 'text-stoplight-yellow', emoji: '🟡', label: 'Yellow Tier' },
    red: { bg: 'bg-stoplight-red', text: 'text-stoplight-red', emoji: '🔴', label: 'Red Tier' }
  };

  const currentTier = tierColors[tier];
  const mockDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please choose an image under 5MB',
        variant: 'destructive'
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (JPG, PNG, or WebP)',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);

    try {
      // Upload to Supabase storage
      const userId = (await supabase.auth.getUser()).data.user?.id || 'guest';
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/mock-photo-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('mock-certificate-photos')
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('mock-certificate-photos')
        .getPublicUrl(fileName);

      setUserPhoto(publicUrl);
      toast({
        title: 'Photo uploaded!',
        description: 'Your photo has been added to the certificate preview'
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload photo',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoCapture = (photoDataUrl: string) => {
    setUserPhoto(photoDataUrl);
    toast({
      title: 'Photo added!',
      description: 'Your photo has been added to the certificate preview'
    });
  };

  const downloadCertificate = async () => {
    if (!certificateRef.current) return;

    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false
      });

      const link = document.createElement('a');
      link.download = `sample-certificate-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast({
        title: 'Certificate downloaded!',
        description: 'Your sample certificate has been saved'
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Download failed',
        description: 'Unable to download certificate',
        variant: 'destructive'
      });
    }
  };

  const removePhoto = () => {
    setUserPhoto('');
  };

  return (
    <div className="space-y-6">
      {/* Configuration Section */}
      <div className="bg-gray-50 rounded-lg p-6 space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Award className="w-5 h-5 text-stoplight-green" />
          Customize Your Preview
        </h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="tier">Achievement Tier</Label>
            <Select value={tier} onValueChange={(value: any) => setTier(value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="green">🟢 Green Tier</SelectItem>
                <SelectItem value="yellow">🟡 Yellow Tier</SelectItem>
                <SelectItem value="red">🔴 Red Tier</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Your Photo (Optional)</Label>
          <div className="mt-2 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload Photo'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPhotoCapture(true)}
            >
              <Camera className="w-4 h-4 mr-2" />
              Take Photo
            </Button>
            {userPhoto && (
              <Button
                type="button"
                variant="ghost"
                onClick={removePhoto}
                className="text-red-600 hover:text-red-700"
              >
                <X className="w-4 h-4 mr-2" />
                Remove
              </Button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <p className="text-xs text-gray-500 mt-2">
            Professional photo recommended • Max 5MB • JPG, PNG, or WebP
          </p>
        </div>
      </div>

      {/* Certificate Preview */}
      <div className="relative">
        <div ref={certificateRef} className="relative bg-gradient-to-br from-stoplight-cream to-white p-8">
          <CertificateWatermark />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border-4 border-stoplight-green rounded-lg shadow-xl p-8 relative"
          >
            {/* Photo Preview */}
            {userPhoto && (
              <div className="absolute top-8 right-8">
                <div className="relative">
                  <div className="w-32 h-40 rounded-lg overflow-hidden border-4 border-gray-300 shadow-lg bg-white">
                    <img 
                      src={userPhoto} 
                      alt="Preview photo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-stoplight-green rounded-full p-1.5 shadow-md">
                    <BadgeCheck className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            )}

            <div className={`text-center space-y-4 ${userPhoto ? 'pr-40' : ''}`}>
              <Badge className={`${currentTier.bg} text-white text-lg px-4 py-2`}>
                {currentTier.emoji} {tier.toUpperCase()} TIER CERTIFIED
              </Badge>
              
              <h2 className="text-3xl font-bold text-stoplight-charcoal font-playfair italic min-h-[3rem] flex items-center justify-center">
                {name || 'Your Name Here'}
              </h2>
              
              <p className="text-gray-600 font-inter">
                has successfully completed all 18 modules of responsible cannabis education 
                and is now part of Maryland's community of certified professionals.
              </p>
              
              <div className="border-t-2 border-b-2 border-stoplight-green/20 py-4 my-4">
                <p className="text-sm text-gray-500 mb-1">Certificate Number</p>
                <p className="text-xl font-bold text-stoplight-charcoal font-mono">
                  SAMPLE-MD-2025-XXXX
                </p>
                <p className="text-sm text-gray-500 mt-2">{mockDate}</p>
              </div>
              
              <p className="text-sm italic text-gray-600 font-inter">
                "Keep your certificate safe — and your standards even higher."
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-4 border-t">
        <p className="text-sm text-gray-500">
          This is a preview only. Complete your training to earn a real certificate.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button 
            onClick={downloadCertificate}
            className="bg-stoplight-green hover:bg-stoplight-green/90"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Sample
          </Button>
        </div>
      </div>

      <PhotoCaptureDialog
        open={showPhotoCapture}
        onClose={() => setShowPhotoCapture(false)}
        onPhotoCapture={handlePhotoCapture}
      />
    </div>
  );
};
