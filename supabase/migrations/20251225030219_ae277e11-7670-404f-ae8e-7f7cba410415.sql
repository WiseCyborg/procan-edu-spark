-- Fix Security Definer Views by setting security_invoker = true
-- This ensures views respect RLS policies of the querying user

-- Fix compliance_dashboard_metrics view
ALTER VIEW compliance_dashboard_metrics SET (security_invoker = true);

-- Fix v_pipeline_compliance_health view
ALTER VIEW v_pipeline_compliance_health SET (security_invoker = true);

-- Fix v_pipeline_metrics view
ALTER VIEW v_pipeline_metrics SET (security_invoker = true);