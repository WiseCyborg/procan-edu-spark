-- Add preferred_language column to profiles for i18n support
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'en';

-- Use a trigger-based check instead of CHECK constraint so future languages can be added without migration pain
CREATE OR REPLACE FUNCTION public.validate_preferred_language()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.preferred_language NOT IN ('en', 'es', 'zh') THEN
    RAISE EXCEPTION 'Invalid preferred_language: %. Allowed: en, es, zh', NEW.preferred_language;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_validate_preferred_language ON public.profiles;
CREATE TRIGGER profiles_validate_preferred_language
  BEFORE INSERT OR UPDATE OF preferred_language ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_preferred_language();