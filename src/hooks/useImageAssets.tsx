import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useImageAssets = (assetKeys: string[]) => {
  const [images, setImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchImages = async () => {
      if (assetKeys.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('image_assets')
          .select('asset_key, public_url')
          .in('asset_key', assetKeys)
          .eq('is_active', true);
        
        if (error) {
          console.error('Error fetching image assets:', error);
          setLoading(false);
          return;
        }

        const imageMap = data?.reduce((acc, img) => {
          acc[img.asset_key] = img.public_url;
          return acc;
        }, {} as Record<string, string>);
        
        setImages(imageMap || {});
      } catch (err) {
        console.error('Error in useImageAssets:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchImages();
  }, [assetKeys.join(',')]);
  
  return { images, loading };
};
