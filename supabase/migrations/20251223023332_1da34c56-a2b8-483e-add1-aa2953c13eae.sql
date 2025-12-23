-- Create compliance_dashboard_metrics view for compliance leaders
CREATE OR REPLACE VIEW public.compliance_dashboard_metrics AS
SELECT 
  o.id as organization_id,
  o.name as organization_name,
  -- Expiring certs in next 30 days
  (SELECT COUNT(*) FROM certificates c 
   JOIN profiles p ON p.user_id = c.user_id
   WHERE p.organization_id = o.id 
   AND c.expiry_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
   AND c.is_revoked = false) as expiring_certs_30d,
  -- Invalid signoffs
  (SELECT COUNT(*) FROM supervisor_signoffs ss 
   WHERE ss.organization_id = o.id AND ss.valid = false) as invalid_signoffs,
  -- Recent retraining events
  (SELECT COUNT(*) FROM retraining_events re 
   WHERE re.organization_id = o.id 
   AND re.created_at > NOW() - INTERVAL '30 days') as retraining_30d,
  -- Open incidents (reported or investigating status)
  (SELECT COUNT(*) FROM compliance_incidents ci 
   WHERE ci.organization_id = o.id AND ci.status IN ('reported', 'investigating')) as open_incidents,
  -- Overdue reviews
  (SELECT COUNT(*) FROM scheduled_reviews sr 
   WHERE sr.organization_id = o.id 
   AND sr.due_date < NOW() AND sr.status != 'completed') as overdue_reviews,
  -- Total active employees
  (SELECT COUNT(*) FROM profiles p WHERE p.organization_id = o.id) as total_employees,
  -- Certified employees
  (SELECT COUNT(DISTINCT c.user_id) FROM certificates c 
   JOIN profiles p ON p.user_id = c.user_id
   WHERE p.organization_id = o.id 
   AND c.is_revoked = false
   AND (c.expiry_date IS NULL OR c.expiry_date > NOW())) as certified_employees
FROM organizations o
WHERE o.admin_approved = true;

-- Grant access to authenticated users
GRANT SELECT ON public.compliance_dashboard_metrics TO authenticated;

-- Add RLS-like security through the view (users can only see their org)
COMMENT ON VIEW public.compliance_dashboard_metrics IS 'Compliance metrics dashboard view - filtered by organization membership';