import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Upload, Image as ImageIcon, AlertCircle, CheckCircle } from 'lucide-react';

interface ImageAsset {
  id: string;
  asset_key: string;
  public_url: string;
  alt_text: string;
  usage_locations: string[];
  file_size_kb: number;
  is_active: boolean;
  created_at: string;
}

export const ImageAssetManager = () => {
  const [assets, setAssets] = useState<ImageAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [assetKey, setAssetKey] = useState('');
  const [altText, setAltText] = useState('');
  
  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('image_assets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAssets(data || []);
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast.error('Failed to load image assets');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !assetKey || !altText) {
      toast.error('Please provide asset key, alt text, and select a file');
      return;
    }

    setUploading(true);
    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${assetKey}.${fileExt}`;
      const filePath = `site-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('site-images')
        .upload(filePath, file, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('site-images')
        .getPublicUrl(filePath);

      // Insert into database
      const { error: dbError } = await supabase
        .from('image_assets')
        .insert({
          asset_key: assetKey,
          storage_path: filePath,
          public_url: publicUrl,
          alt_text: altText,
          file_size_kb: Math.round(file.size / 1024)
        });

      if (dbError) throw dbError;

      toast.success('Image uploaded successfully!');
      setAssetKey('');
      setAltText('');
      fetchAssets();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const runImageAudit = async () => {
    try {
      toast.info('Running image audit...');
      const { data, error } = await supabase.functions.invoke('audit-site-images');
      
      if (error) throw error;
      
      const report = data;
      if (report.broken_images > 0) {
        toast.error(`Found ${report.broken_images} broken images!`);
      } else {
        toast.success('All images are healthy!');
      }
    } catch (error: any) {
      console.error('Audit error:', error);
      toast.error(`Audit failed: ${error.message}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <ImageIcon className="h-5 w-5 mr-2" />
            Image Asset Manager
          </div>
          <Button onClick={runImageAudit} size="sm" variant="outline">
            Run Audit
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Upload Form */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <h3 className="font-semibold mb-3">Upload New Image</h3>
            <div className="grid gap-3">
              <div>
                <Label htmlFor="asset-key">Asset Key (e.g., "maryland_harbor")</Label>
                <Input
                  id="asset-key"
                  value={assetKey}
                  onChange={(e) => setAssetKey(e.target.value)}
                  placeholder="unique_asset_key"
                />
              </div>
              <div>
                <Label htmlFor="alt-text">Alt Text (for accessibility)</Label>
                <Input
                  id="alt-text"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Descriptive alt text"
                />
              </div>
              <div>
                <Label htmlFor="file-upload">Image File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploading || !assetKey || !altText}
                />
              </div>
            </div>
          </div>

          {/* Assets List */}
          <div>
            <h3 className="font-semibold mb-3">Existing Assets ({assets.length})</h3>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {assets.map((asset) => (
                  <div key={asset.id} className="flex items-center gap-3 p-2 border rounded">
                    <img 
                      src={asset.public_url} 
                      alt={asset.alt_text}
                      className="w-12 h-12 object-cover rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{asset.asset_key}</p>
                      <p className="text-xs text-muted-foreground truncate">{asset.alt_text}</p>
                      <p className="text-xs text-muted-foreground">{asset.file_size_kb}KB</p>
                    </div>
                    {asset.is_active ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
