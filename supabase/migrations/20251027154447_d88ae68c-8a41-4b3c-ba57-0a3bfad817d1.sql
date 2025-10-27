-- Phase 1: Add missing columns to email_logs table
ALTER TABLE email_logs 
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS html_content TEXT;

-- Create index for faster queries on failed emails
CREATE INDEX IF NOT EXISTS idx_email_logs_status_created 
  ON email_logs(status, created_at DESC);

-- Clean up stuck emails (emails in 'sending' status for more than 10 minutes)
UPDATE email_logs 
SET status = 'failed', 
    error_message = 'Email stuck in sending status - marked as failed by system cleanup on ' || NOW()::TEXT
WHERE status = 'sending' 
  AND created_at < NOW() - INTERVAL '10 minutes';

-- Add comment for documentation
COMMENT ON COLUMN email_logs.error_message IS 'Detailed error message when email sending fails';
COMMENT ON COLUMN email_logs.provider IS 'Email provider used: resend or smtp';
COMMENT ON COLUMN email_logs.html_content IS 'HTML content of the email for retry purposes';