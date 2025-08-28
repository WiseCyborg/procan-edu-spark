-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id_course_id ON user_progress(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_completed ON user_progress(is_completed, completed_at);

CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_issue_date ON certificates(issue_date DESC);

CREATE INDEX IF NOT EXISTS idx_course_modules_course_id ON course_modules(course_id, module_number);
CREATE INDEX IF NOT EXISTS idx_course_modules_active ON course_modules(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_orders_user_course ON orders(user_id, course_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, created_at);

CREATE INDEX IF NOT EXISTS idx_profiles_organization ON profiles(organization_id) WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_course ON exam_attempts(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_completed ON exam_attempts(completed_at DESC) WHERE completed_at IS NOT NULL;

-- Add database monitoring functions with correct column names
CREATE OR REPLACE FUNCTION public.get_database_stats()
RETURNS TABLE(
    table_name text,
    row_count bigint,
    table_size text,
    index_size text,
    total_size text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        schemaname||'.'||relname as table_name,
        n_tup_ins - n_tup_del as row_count,
        pg_size_pretty(pg_relation_size(schemaname||'.'||relname)) as table_size,
        pg_size_pretty(pg_indexes_size(schemaname||'.'||relname)) as index_size,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as total_size
    FROM pg_stat_user_tables 
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||relname) DESC;
$$;

-- Add performance monitoring table
CREATE TABLE IF NOT EXISTS public.performance_metrics (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_name text NOT NULL,
    metric_value numeric NOT NULL,
    user_id uuid,
    session_id text,
    metadata jsonb DEFAULT '{}',
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on performance metrics
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for performance metrics
CREATE POLICY "Service role can manage performance metrics" ON public.performance_metrics
FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "Users can insert their own metrics" ON public.performance_metrics
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add index for performance metrics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name_created ON performance_metrics(metric_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user ON performance_metrics(user_id, created_at DESC);

-- Create function for cleanup old performance metrics
CREATE OR REPLACE FUNCTION public.cleanup_performance_metrics()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
    DELETE FROM public.performance_metrics 
    WHERE created_at < now() - interval '7 days';
$$;