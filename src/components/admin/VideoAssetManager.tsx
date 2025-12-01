import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Video, Upload, CheckCircle, AlertCircle, Copy, Play } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface VideoAsset {
  id: string;
  asset_key: string;
  public_url: string;
  title: string;
  description: string | null;
  duration_seconds: number | null;
  file_size_mb: number | null;
  module_id: string | null;
  is_active: boolean;
  created_at: string;
}

interface CourseModule {
  id: string;
  module_number: number;
  title: string;
}

export const VideoAssetManager = () => {
  const [assets, setAssets] = useState<VideoAsset[]>([]);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [assetKey, setAssetKey] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  useEffect(() => {
    fetchAssets();
    fetchModules();
  }, []);

  const fetchAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('video_assets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAssets(data || []);
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast.error('Failed to load video assets');
    } finally {
      setLoading(false);
    }
  };

  const fetchModules = async () => {
    try {
      const { data, error } = await supabase
        .from('course_modules')
        .select('id, module_number, title')
        .order('module_number');
      
      if (error) throw error;
      setModules(data || []);
    } catch (error) {
      console.error('Error fetching modules:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !assetKey || !title) {
      toast.error('Please provide asset key, title, and select a video file');
      return;
    }

    setUploading(true);
    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${assetKey}.${fileExt}`;
      const filePath = `ProCannVideos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('ProCannVideos')
        .upload(filePath, file, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('ProCannVideos')
        .getPublicUrl(filePath);

      // Insert into database
      const { error: dbError } = await supabase
        .from('video_assets')
        .insert({
          asset_key: assetKey,
          storage_path: filePath,
          public_url: publicUrl,
          title: title,
          description: description || null,
          file_size_mb: Math.round((file.size / (1024 * 1024)) * 100) / 100,
          module_id: selectedModuleId || null
        });

      if (dbError) throw dbError;

      toast.success('Video uploaded successfully!');
      setAssetKey('');
      setTitle('');
      setDescription('');
      setSelectedModuleId('');
      fetchAssets();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copied to clipboard!');
  };

  const assignToModule = async (videoId: string, moduleId: string | null) => {
    try {
      const { error } = await supabase
        .from('video_assets')
        .update({ module_id: moduleId })
        .eq('id', videoId);

      if (error) throw error;

      // Also update the module's video_url
      if (moduleId) {
        const video = assets.find(a => a.id === videoId);
        if (video) {
          await supabase
            .from('course_modules')
            .update({ video_url: video.public_url })
            .eq('id', moduleId);
        }
      }

      toast.success('Module assignment updated');
      fetchAssets();
    } catch (error: any) {
      console.error('Assignment error:', error);
      toast.error(`Failed to assign: ${error.message}`);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Video className="h-5 w-5 mr-2" />
            Video Asset Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Upload Form */}
            <div className="border rounded-lg p-4 bg-muted/30">
              <h3 className="font-semibold mb-3">Upload New Video</h3>
              <div className="grid gap-3">
                <div>
                  <Label htmlFor="video-asset-key">Asset Key (e.g., "module_1_intro")</Label>
                  <Input
                    id="video-asset-key"
                    value={assetKey}
                    onChange={(e) => setAssetKey(e.target.value)}
                    placeholder="unique_asset_key"
                  />
                </div>
                <div>
                  <Label htmlFor="video-title">Title</Label>
                  <Input
                    id="video-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Video title"
                  />
                </div>
                <div>
                  <Label htmlFor="video-description">Description (optional)</Label>
                  <Textarea
                    id="video-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Video description"
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="module-select">Assign to Module (optional)</Label>
                  <Select value={selectedModuleId} onValueChange={setSelectedModuleId}>
                    <SelectTrigger id="module-select">
                      <SelectValue placeholder="Select module..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No module</SelectItem>
                      {modules.map((module) => (
                        <SelectItem key={module.id} value={module.id}>
                          Module {module.module_number}: {module.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="video-upload">Video File (MP4 recommended)</Label>
                  <Input
                    id="video-upload"
                    type="file"
                    accept="video/*"
                    onChange={handleFileUpload}
                    disabled={uploading || !assetKey || !title}
                  />
                </div>
              </div>
            </div>

            {/* Assets List */}
            <div>
              <h3 className="font-semibold mb-3">Existing Videos ({assets.length})</h3>
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {assets.map((asset) => (
                    <div key={asset.id} className="flex items-start gap-3 p-3 border rounded bg-card">
                      <div className="flex-shrink-0 w-20 h-14 bg-muted rounded flex items-center justify-center">
                        <Video className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{asset.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{asset.asset_key}</p>
                            {asset.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">{asset.description}</p>
                            )}
                          </div>
                          {asset.is_active ? (
                            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {asset.file_size_mb && <span>{asset.file_size_mb}MB</span>}
                          {asset.duration_seconds && <span>• {Math.round(asset.duration_seconds / 60)}min</span>}
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPreviewUrl(asset.public_url)}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Preview
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyUrl(asset.public_url)}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy URL
                          </Button>
                          <Select
                            value={asset.module_id || ''}
                            onValueChange={(value) => assignToModule(asset.id, value || null)}
                          >
                            <SelectTrigger className="h-8 w-[180px] text-xs">
                              <SelectValue placeholder="Assign to module..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Unassign</SelectItem>
                              {modules.map((module) => (
                                <SelectItem key={module.id} value={module.id}>
                                  Module {module.module_number}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Video Preview</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <video
              src={previewUrl}
              controls
              className="w-full aspect-video bg-black rounded"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
