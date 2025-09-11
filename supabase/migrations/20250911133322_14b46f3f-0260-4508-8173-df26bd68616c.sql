-- Create FAQ entries table
CREATE TABLE public.faq_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  display_order INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.faq_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view active FAQ entries" 
ON public.faq_entries 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage FAQ entries" 
ON public.faq_entries 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::app_role
));

-- Add trigger for updated_at
CREATE TRIGGER update_faq_entries_updated_at
BEFORE UPDATE ON public.faq_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();