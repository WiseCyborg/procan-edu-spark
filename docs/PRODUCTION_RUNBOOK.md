# Production Operations Runbook

## Daily Operations

### Morning Checklist (8:30 AM EST)
1. **Check Owner Digest Email**
   - Should arrive at 8:00 AM daily
   - If missing: Check `ai_agent_runs` for digest generator
   - Manually trigger: Navigate to `/owners-intelligence` → Quick Actions → Generate Owner Digest

2. **Review Platform Health Score**
   - Navigate to: `/owners-intelligence`
   - Target: ≥85/100
   - If <85: Review compliance alerts and take action

3. **Check Active Compliance Alerts**
   - Navigate to: `/owners-intelligence` → Alerts tab
   - Resolve any critical alerts immediately
   - Document resolution in alert notes

4. **Monitor Agent Health**
   - Navigate to: `/owners-intelligence` → Agents tab
   - All agents should show green status
   - If any red: Check error logs and restart

### Weekly Tasks (Mondays, 9 AM EST)

1. **Review Regulatory Updates**
   - Check `regulatory_updates` table for new changes
   - Verify AI impact analysis completed
   - Create content review tasks if needed

2. **Audit Email Deliverability**
   - Query: `SELECT status, COUNT(*) FROM email_logs WHERE created_at > NOW() - INTERVAL '7 days' GROUP BY status;`
   - Target: >95% sent
   - If <95%: Investigate failed emails

3. **Review User Enrollment Progress**
   - Check for users approaching deadlines
   - Send manual reminders if needed
   - Follow up with organizations with <50% completion

4. **Clean Up Old Data**
   - Archive AI agent logs older than 90 days
   - Archive email logs older than 1 year
   - Backup compliance alerts before archiving

### Monthly Tasks (1st of Month)

1. **Revenue Analysis Review**
   - Check `ai_insights` for revenue predictions
   - Compare actual vs. forecast
   - Adjust pricing or discounts if needed

2. **Security Audit**
   - Review `security_audit_log` for unusual activity
   - Check for failed login attempts
   - Verify RLS policies still enforced

3. **Performance Review**
   - Check edge function execution times
   - Optimize slow queries
   - Review database indexes

## Emergency Response

### System Down
1. Check Supabase status: https://status.supabase.com
2. Review edge function logs for errors
3. Check database connectivity
4. Escalate to Supabase support if needed

### Email System Failure
1. Check RESEND_API_KEY validity
2. Review `email_provider_health` table
3. Test email manually: Navigate to `/owners-intelligence` → Quick Actions → Test Email System
4. Switch to backup provider if needed

### Agent Repeated Failures
1. Query recent failures: `SELECT * FROM ai_agent_runs WHERE execution_status = 'failed' AND created_at > NOW() - INTERVAL '24 hours';`
2. Check error messages for patterns
3. Manually test agent with verbose logging
4. Temporarily disable agent if causing system issues

### Compliance Alert Backlog
1. Sort alerts by severity: `SELECT * FROM compliance_alerts WHERE resolved = false ORDER BY severity DESC;`
2. Assign owner to each alert
3. Set resolution deadlines
4. Document resolution process

## Database Queries

### View Active Cron Jobs
```sql
SELECT * FROM cron.job;
```

### View Recent Cron Job Executions
```sql
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 20;
```

### Check Email Delivery Rate (Last 7 Days)
```sql
SELECT 
  status, 
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM email_logs 
WHERE created_at > NOW() - INTERVAL '7 days' 
GROUP BY status;
```

### View Platform Health Scores
```sql
SELECT * FROM platform_health_scores 
ORDER BY score_date DESC 
LIMIT 30;
```

### Check Agent Execution Success Rate
```sql
SELECT 
  agent_name,
  COUNT(*) as total_runs,
  SUM(CASE WHEN execution_status = 'success' THEN 1 ELSE 0 END) as successful_runs,
  ROUND(SUM(CASE WHEN execution_status = 'success' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as success_rate
FROM ai_agent_runs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY agent_name
ORDER BY success_rate ASC;
```

## Contact Information

**Supabase Support:** support@supabase.com  
**Resend Support:** support@resend.com  
**OpenAI Support:** support@openai.com  

**Internal Escalation:**
- Platform Owner: [Your Email]
- Technical Lead: [Your Email]
- Compliance Officer: [Your Email]

## Quick Links

- AI Operations Center: `/owners-intelligence`
- Supabase Dashboard: https://supabase.com/dashboard/project/zhmpwczrvitomsxjwpzc
- Edge Function Logs: https://supabase.com/dashboard/project/zhmpwczrvitomsxjwpzc/functions
- Email Provider Health: Check in Supabase `email_provider_health` table
