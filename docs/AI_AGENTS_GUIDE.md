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
- Check `ai_agent_runs` for execution history
- Review `compliance_alerts` for critical failures
- Monitor email logs for notification issues
- Verify cron jobs are active in database

## Key Regulatory Sources

### Maryland State Laws
- **COMAR 14.17**: https://regulations.justia.com/states/maryland/title-14/subtitle-17/
- **Maryland Cannabis Administration**: https://cannabis.maryland.gov
- **ATCC (Medical)**: https://atcc.maryland.gov

### Federal Laws
- **DEA Drug Scheduling**: https://www.dea.gov/drug-information/drug-scheduling
- **DEA Schedules PDF**: https://deadiversion.usdoj.gov/schedules/schedules.html
- **Federal Register**: https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=cannabis
