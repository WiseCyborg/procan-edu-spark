import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface ProfilePhotoUploadProps {
  userId: string;
  currentPhotoUrl?: string | null;
  onPhotoUpdate: (url: string | null) => void;
}

export const ProfilePhotoUpload = ({ userId, currentPhotoUrl, onPhotoUpdate }: ProfilePhotoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentPhotoUrl);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Profile photo must be under 2MB",
        variant: "destructive"
      });
      return;
    }

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Only JPG, PNG, and WebP images are allowed",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/avatar.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(filePath);

      // Update profile table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_photo_url: publicUrl })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      setPreviewUrl(publicUrl);
      onPhotoUpdate(publicUrl);

      toast({
        title: "Success",
        description: "Profile photo updated successfully"
      });
    } catch (error: any) {
      console.error('Photo upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      setUploading(true);
      
      // Remove from storage
      const filePath = `${userId}/avatar`;
      await supabase.storage.from('profile-photos').remove([filePath]);

      // Update profile table
      await supabase
        .from('profiles')
        .update({ profile_photo_url: null })
        .eq('user_id', userId);

      setPreviewUrl(null);
      onPhotoUpdate(null);

      toast({
        title: "Success",
        description: "Profile photo removed"
      });
    } catch (error: any) {
      console.error('Photo removal error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <Avatar className="h-32 w-32 border-4 border-border">
        <AvatarImage src={previewUrl || undefined} alt="Profile photo" />
        <AvatarFallback className="bg-muted">
          <Camera className="h-12 w-12 text-muted-foreground" />
        </AvatarFallback>
      </Avatar>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => document.getElementById('photo-input')?.click()}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              {previewUrl ? 'Change Photo' : 'Upload Photo'}
            </>
          )}
        </Button>

        {previewUrl && !uploading && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemovePhoto}
          >
            <X className="h-4 w-4 mr-2" />
            Remove
          </Button>
        )}
      </div>

      <input
        id="photo-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />

      <p className="text-xs text-muted-foreground text-center">
        JPG, PNG or WebP. Max 2MB.
      </p>
    </div>
  );
};
