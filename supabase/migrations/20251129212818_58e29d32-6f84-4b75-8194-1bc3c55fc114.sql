-- Add missing columns to email_logs table for template tracking
ALTER TABLE email_logs 
ADD COLUMN IF NOT EXISTS template_name TEXT,
ADD COLUMN IF NOT EXISTS template_data JSONB;

-- Add helpful index for template queries
CREATE INDEX IF NOT EXISTS idx_email_logs_template_name ON email_logs(template_name) WHERE template_name IS NOT NULL;