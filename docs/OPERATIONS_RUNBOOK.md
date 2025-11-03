# ProCann EDU Operations Runbook

## Emergency Contact
- Slack: `#procann-alerts`
- Email: `ops@procannedu.com`
- On-call: Check PagerDuty rotation

---

## Critical Scenarios

### 1. Email Circuit Breaker Opened

**Symptoms:**
- Email delivery rate < 95%
- Circuit breaker status = "OPEN" in dashboard

**Diagnosis:**
```sql
SELECT * FROM email_circuit_breaker LIMIT 1;
SELECT * FROM communication_logs WHERE delivery_status = 'failed' ORDER BY created_at DESC LIMIT 10;
```

**Resolution:**
1. Check Resend API status: https://status.resend.com
2. If Resend is down:
   ```sql
   UPDATE feature_flags SET flag_value = true WHERE flag_key = 'email_fallback_smtp_enabled';
   ```
3. Manually close circuit (once issue resolved):
   ```sql
   UPDATE email_circuit_breaker SET circuit_state = 'closed', failure_count = 0;
   ```

---

### 2. Job Queue Backed Up

**Symptoms:**
- Dashboard shows >100 queued jobs
- Oldest job > 10 minutes

**Diagnosis:**
```sql
SELECT job_type, status, COUNT(*) 
FROM system_jobs 
WHERE status = 'queued' 
GROUP BY job_type, status;
```

**Resolution:**
1. Check `jobs-processor` edge function logs
2. Manually trigger processor:
   ```bash
   curl -X POST https://zhmpwczrvitomsxjwpzc.supabase.co/functions/v1/jobs-processor \
     -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobXB3Y3pydml0b21zeGp3cHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNzUyNTcsImV4cCI6MjA2MDc1MTI1N30.Fuy8xXz3g9hyDNSMO2GmKPDIOnm5tGZsF7H_jmwtoVA"
   ```
3. If specific job type failing, pause that type:
   ```sql
   UPDATE system_jobs SET status = 'failed' 
   WHERE job_type = 'problematic_job' AND status = 'queued';
   ```

---

### 3. Seat Allocation Race Condition

**Symptoms:**
- Multiple users reporting "No seats available"
- `rvt_seats` shows available seats

**Diagnosis:**
```sql
SELECT status, COUNT(*) FROM rvt_seats 
WHERE organization_id = 'ORG_ID' 
GROUP BY status;
```

**Resolution:**
1. Check for held seats (temporary allocations):
   ```sql
   SELECT * FROM rvt_seats 
   WHERE status = 'allocated' 
     AND created_at < NOW() - INTERVAL '10 minutes';
   ```
2. Release stuck seats:
   ```sql
   UPDATE rvt_seats SET status = 'available', assigned_user_id = NULL
   WHERE status = 'allocated'
     AND created_at < NOW() - INTERVAL '10 minutes';
   ```

---

### 4. Certificate Generation Failures

**Symptoms:**
- Users passed exam but no certificate
- `system_jobs_deadletter` has `generate_certificate` jobs

**Diagnosis:**
```sql
SELECT * FROM system_jobs_deadletter 
WHERE job_type = 'generate_certificate' 
ORDER BY moved_to_dlq_at DESC;
```

**Resolution:**
1. Check exam_attempts for the user:
   ```sql
   SELECT * FROM exam_attempts WHERE user_id = 'USER_ID' ORDER BY created_at DESC;
   ```
2. Manually retry certificate generation:
   ```bash
   curl -X POST https://zhmpwczrvitomsxjwpzc.supabase.co/functions/v1/generate-certificate-retry \
     -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
     -H "Content-Type: application/json" \
     -d '{"exam_attempt_id": "EXAM_ATTEMPT_ID"}'
   ```

---

### 5. Manager Registration Token Expired

**Symptoms:**
- Manager can't access registration link
- `dispensary_applications.registration_token_expires_at` < now()

**Diagnosis:**
```sql
SELECT * FROM dispensary_applications 
WHERE application_status = 'approved' 
  AND registration_completed = false 
  AND registration_token_expires_at < NOW();
```

**Resolution:**
1. Use admin dashboard "Regenerate Token & Resend" button
2. Or manually regenerate token and update expiry

---

## Monitoring Checklist (Daily)

- [ ] Check SLO dashboard: all metrics green?
- [ ] Review dead letter queue: any jobs need manual intervention?
- [ ] Check email circuit breaker: status = closed?
- [ ] Review job queue depth: < 50 queued jobs?
- [ ] Check recent compliance_alerts: any unresolved critical alerts?

---

## Escalation Paths

| Issue Severity | Response Time | Escalate To |
|----------------|---------------|-------------|
| Critical (SLO breached) | 15 minutes | Engineering Lead |
| High (Warning threshold) | 1 hour | On-call Engineer |
| Medium (Anomaly detected) | 4 hours | Team Lead |
| Low (Informational) | Next business day | Operations Team |

---

## Common Administrative Tasks

### Clear Failed Jobs
```sql
DELETE FROM system_jobs WHERE status = 'failed' AND created_at < NOW() - INTERVAL '7 days';
```

### Reset Email Circuit Breaker
```sql
UPDATE email_circuit_breaker SET circuit_state = 'closed', failure_count = 0, updated_at = NOW();
```

### Check System Health
```sql
-- Active jobs
SELECT status, COUNT(*) FROM system_jobs GROUP BY status;

-- Email circuit status
SELECT * FROM email_circuit_breaker;

-- Recent SLO metrics
SELECT * FROM slo_metrics ORDER BY created_at DESC LIMIT 5;
```
