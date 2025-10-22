# ProCann AI Agents System

## Overview
The ProCann Education platform uses autonomous AI agents to monitor regulations, optimize operations, and keep owners informed.

## Agent Roster

### 1. Regulatory Compliance Monitor
**Edge Functions:** `scrape-regulations`, `scrape-federal-regulations`  
**Schedule:** Daily at 3 AM (Maryland), Weekly on Mondays (Federal)  
**Purpose:** Automatically detects changes in cannabis regulations

### 2. Content Freshness Guardian
**Edge Functions:** `audit-content-freshness`  
**Schedule:** Weekly on Sundays  
**Purpose:** Compares course content against current regulations

### 3. Revenue Intelligence Bot
**Edge Functions:** `analyze-payment-patterns`  
**Schedule:** Every 6 hours  
**Purpose:** Analyzes payment trends, forecasts revenue

### 4. Daily Digest Generator
**Edge Functions:** `generate-daily-digest`  
**Schedule:** Daily at 8 AM  
**Purpose:** Creates AI-powered owner intelligence reports

### 5. Workflow Automation Executor
**Edge Functions:** `execute-workflow-automations`  
**Schedule:** Every 6 hours  
**Purpose:** Executes scheduled notifications (certificate expiry, onboarding, compliance)

### 6. Email Health Monitor
**Edge Functions:** `test-email-providers`  
**Schedule:** Hourly  
**Purpose:** Monitors email deliverability and provider health

### 7. Security & Fraud Watchdog
**Edge Functions:** (Future implementation)  
**Purpose:** Detects suspicious activity and fraud patterns

## Cron Jobs
All agents run on `pg_cron` schedules. View active cron jobs:
```sql
SELECT * FROM cron.job;
```

## Monitoring
- **AI Ops Center UI:** `/owners-intelligence`
- **Agent Execution Logs:** `ai_agent_runs` table
- **Platform Health:** `platform_health_scores` table
- **AI Insights:** `ai_insights` table

## Manual Triggers
All agents can be manually triggered from the AI Ops Center or via Supabase functions:
```typescript
await supabase.functions.invoke('scrape-regulations');
```

## Troubleshooting

**Agent Not Running:**
1. Check cron job status: `SELECT * FROM cron.job WHERE jobname LIKE '%agent-name%';`
2. View recent execution logs: `SELECT * FROM cron.job_run_details WHERE jobid = [ID] ORDER BY start_time DESC;`
3. Manually trigger: Navigate to `/owners-intelligence` → Agents tab → Run Now
4. Check edge function logs in Supabase dashboard

**Email Not Sending:**
1. Verify RESEND_API_KEY: `SELECT name FROM vault.secrets WHERE name = 'RESEND_API_KEY';`
2. Check email provider health: `SELECT * FROM email_provider_health ORDER BY last_checked DESC;`
3. Review email logs: `SELECT * FROM email_logs WHERE status = 'failed' ORDER BY created_at DESC;`
4. Test manually: Navigate to `/owners-intelligence` → Quick Actions → Test Email System

**High Platform Health Score Drop:**
1. Check compliance alerts: `SELECT * FROM compliance_alerts WHERE resolved = false;`
2. Review recent agent failures: `SELECT * FROM ai_agent_runs WHERE execution_status = 'failed' ORDER BY created_at DESC;`
3. Verify email delivery rate in last 24 hours
4. Check for expired certificates or incomplete enrollments

## Performance Optimization

### Database Indexes
Ensure these indexes exist for fast queries:
```sql
CREATE INDEX IF NOT EXISTS idx_ai_agent_runs_created ON ai_agent_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_agent_runs_agent_name ON ai_agent_runs(agent_name);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_unresolved ON compliance_alerts(resolved, created_at) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
```

### Edge Function Optimization
- Keep function cold start time under 2 seconds
- Limit OpenAI API calls to avoid rate limits
- Cache regulation content to reduce scraping frequency
- Batch database operations where possible

## Security Best Practices

1. **API Keys:** All keys stored in Supabase secrets (vault)
2. **RLS Policies:** Enabled on all AI agent tables
3. **Service Role Key:** Only used in edge functions, never exposed to client
4. **Email Validation:** All email addresses validated before sending
5. **Rate Limiting:** OpenAI calls throttled to prevent abuse
6. **Audit Logs:** All critical operations logged in `security_audit_log`

## Cost Management

### OpenAI API Usage
- Daily digest: ~$0.05/day (GPT-4o)
- Revenue analysis: ~$0.03/run (4x/day = $0.12/day)
- Regulatory impact: ~$0.02/change detected
- **Estimated monthly cost:** $5-10 for AI features

### Email Costs (Resend)
- Free tier: 3,000 emails/month
- Owner digests: 30 emails/month (1/day to 1 owner)
- Welcome emails: Variable based on signups
- Workflow notifications: Variable
- **Estimated monthly cost:** Free tier sufficient for <100 users

### Database Storage
- Agent logs retained for 90 days, then archived
- Email logs retained for 1 year
- Platform health scores: Permanent
- **Estimated monthly cost:** Included in Supabase free/pro tier

## Key Regulatory Sources

### Maryland State Laws
- **COMAR 14.17**: https://regulations.justia.com/states/maryland/title-14/subtitle-17/
- **Maryland Cannabis Administration**: https://cannabis.maryland.gov
- **ATCC (Medical)**: https://atcc.maryland.gov

### Federal Laws
- **DEA Drug Scheduling**: https://www.dea.gov/drug-information/drug-scheduling
- **DEA Schedules PDF**: https://deadiversion.usdoj.gov/schedules/schedules.html
- **Federal Register**: https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=cannabis
