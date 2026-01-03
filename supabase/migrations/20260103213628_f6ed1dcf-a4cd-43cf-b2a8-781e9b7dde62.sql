-- Add welcome_video_watched column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS welcome_video_watched BOOLEAN DEFAULT false;