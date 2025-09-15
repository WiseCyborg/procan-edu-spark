# Troubleshooting Guide

## 🔧 Overview

This comprehensive troubleshooting guide addresses common issues, error resolution procedures, and maintenance tasks for the Cannabis Education Platform.

## 🚨 Common Issues and Solutions

### Authentication and Access Issues

#### Problem: Unable to Login
**Symptoms:**
- Login form shows "Invalid credentials" error
- User receives "Account not found" message
- Login button is unresponsive

**Solutions:**
1. **Password Reset**
   ```
   1. Click "Forgot Password" on login page
   2. Enter registered email address
   3. Check email for reset link (including spam folder)
   4. Follow link to create new password
   5. Ensure password meets requirements:
      - Minimum 8 characters
      - At least one uppercase letter
      - At least one lowercase letter
      - At least one number
   ```

2. **Account Verification**
   ```
   1. Check if email verification is required
   2. Look for verification email in inbox/spam
   3. Contact admin if verification email not received
   4. Admin can manually verify account in user management
   ```

3. **Browser/Cache Issues**
   ```
   1. Clear browser cache and cookies
   2. Disable browser extensions temporarily
   3. Try incognito/private browsing mode
   4. Test with different browser
   5. Check if JavaScript is enabled
   ```

#### Problem: Multi-Factor Authentication (MFA) Issues
**Symptoms:**
- MFA code not received via SMS/email
- "Invalid verification code" error
- MFA setup fails

**Solutions:**
1. **SMS/Voice Verification Issues**
   ```
   1. Verify phone number format (+1XXXXXXXXXX)
   2. Check mobile network signal strength
   3. Try voice verification if SMS fails
   4. Contact carrier about SMS blocking
   5. Admin can reset MFA settings if needed
   ```

2. **Email Verification Issues**
   ```
   1. Check spam/junk folder
   2. Verify email address is correct
   3. Add platform domain to safe senders
   4. Try different email address
   5. Admin can manually send verification code
   ```

3. **Backup Method Setup**
   ```
   1. Go to Profile → Security Settings
   2. Set up backup verification method
   3. Test backup method functionality
   4. Keep backup codes in secure location
   ```

#### Problem: Role and Permission Issues
**Symptoms:**
- "Access denied" errors when trying to access features
- Missing menu items or dashboard sections
- Cannot perform expected actions

**Solutions:**
1. **Role Verification**
   ```
   1. Check user role in Profile section
   2. Verify organization association
   3. Contact admin for role assignment issues
   4. Ensure organization is approved and active
   ```

2. **Admin Role Assignment**
   ```sql
   -- Admin can assign roles via database function
   SELECT manage_user_role(
     'user-uuid'::uuid,
     'dispensary_manager'::app_role,
     'add'
   );
   ```

3. **Organization Linking Issues**
   ```
   1. Verify dispensary access key is correct
   2. Check organization payment status
   3. Confirm organization is admin-approved
   4. Admin can manually link user to organization
   ```

### Course and Training Issues

#### Problem: Cannot Access Course Modules
**Symptoms:**
- Course modules show as locked/unavailable
- "Payment required" messages for enrolled users
- Course content not loading

**Solutions:**
1. **Payment Verification**
   ```
   1. Check payment status in dashboard
   2. Verify order completion in orders table
   3. Contact admin for payment verification
   4. Retry payment if transaction failed
   ```

2. **Organization Credit Issues**
   ```
   1. Check organization credit balance
   2. Verify user is linked to paying organization
   3. Admin can add credits to organization
   4. Confirm organization payment status is 'paid'
   ```

3. **Course Access Troubleshooting**
   ```sql
   -- Check user course access
   SELECT 
     u.email,
     o.status as order_status,
     org.payment_status,
     org.course_credits
   FROM auth.users u
   LEFT JOIN orders o ON o.user_id = u.id
   LEFT JOIN profiles p ON p.user_id = u.id
   LEFT JOIN organizations org ON org.id = p.organization_id
   WHERE u.id = 'user-uuid';
   ```

#### Problem: Progress Not Saving
**Symptoms:**
- Module completion not recorded
- Quiz scores not saving
- Progress bar not updating

**Solutions:**
1. **Browser and Connection Issues**
   ```
   1. Ensure stable internet connection
   2. Disable ad blockers and browser extensions
   3. Clear browser cache and cookies
   4. Try different browser or device
   5. Check for JavaScript errors in browser console
   ```

2. **Database Connectivity**
   ```
   1. Check system status page
   2. Try refreshing the page
   3. Wait 5-10 minutes and retry
   4. Contact support if persistent
   ```

3. **Manual Progress Recovery**
   ```sql
   -- Admin can manually update progress
   UPDATE user_progress 
   SET is_completed = true, completed_at = now()
   WHERE user_id = 'user-uuid' AND module_id = 'module-uuid';
   ```

#### Problem: Quiz and Exam Issues
**Symptoms:**
- Quiz questions not loading
- Cannot submit quiz answers
- Exam timeout issues

**Solutions:**
1. **Technical Issues**
   ```
   1. Refresh page and restart quiz
   2. Check internet connection stability
   3. Disable browser extensions
   4. Use Chrome or Firefox for best compatibility
   5. Ensure cookies are enabled
   ```

2. **Exam Proctoring Issues**
   ```
   1. Ensure camera access is granted
   2. Take photo in well-lit environment
   3. Use government-issued photo ID
   4. Contact support for technical assistance
   ```

3. **Score Calculation Issues**
   ```sql
   -- Check exam attempt scoring
   SELECT 
     ea.total_score,
     ea.is_passed,
     c.passing_score
   FROM exam_attempts ea
   JOIN courses c ON c.id = ea.course_id
   WHERE ea.user_id = 'user-uuid'
   ORDER BY ea.created_at DESC;
   ```

### System and Performance Issues

#### Problem: Slow Page Loading
**Symptoms:**
- Pages take long time to load
- Timeouts when submitting forms
- Unresponsive user interface

**Solutions:**
1. **Client-Side Optimization**
   ```
   1. Clear browser cache and cookies
   2. Close unnecessary browser tabs
   3. Disable browser extensions
   4. Check internet connection speed
   5. Try different network connection
   ```

2. **Server-Side Investigation**
   ```
   1. Check system status and health metrics
   2. Monitor database performance
   3. Review server logs for errors
   4. Check CDN and caching status
   5. Scale resources if necessary
   ```

3. **Database Performance**
   ```sql
   -- Check for slow queries
   SELECT query, mean_exec_time, calls
   FROM pg_stat_statements
   WHERE mean_exec_time > 1000
   ORDER BY mean_exec_time DESC;

   -- Check database connections
   SELECT count(*) as connection_count
   FROM pg_stat_activity;
   ```

#### Problem: Database Connection Errors
**Symptoms:**
- "Database connection failed" errors
- 500 internal server errors
- Data not loading or saving

**Solutions:**
1. **Connection Pool Management**
   ```
   1. Check Supabase dashboard for connection limits
   2. Monitor connection pool usage
   3. Optimize database queries
   4. Implement connection pooling
   ```

2. **Database Health Check**
   ```sql
   -- Check database health
   SELECT * FROM get_database_stats();

   -- Monitor active connections
   SELECT 
     pid,
     usename,
     state,
     query_start,
     query
   FROM pg_stat_activity
   WHERE state = 'active';
   ```

### Certificate and Compliance Issues

#### Problem: Certificate Generation Failures
**Symptoms:**
- Certificate not generated after exam completion
- "Certificate generation failed" error
- Missing certificate in downloads

**Solutions:**
1. **Exam Completion Verification**
   ```sql
   -- Verify exam completion
   SELECT 
     ea.is_passed,
     ea.total_score,
     c.passing_score,
     cert.certificate_number
   FROM exam_attempts ea
   JOIN courses c ON c.id = ea.course_id
   LEFT JOIN certificates cert ON cert.exam_attempt_id = ea.id
   WHERE ea.user_id = 'user-uuid'
   ORDER BY ea.created_at DESC;
   ```

2. **Manual Certificate Generation**
   ```sql
   -- Admin can manually generate certificate
   SELECT generate_certificate(
     'user-uuid'::uuid,
     'course-uuid'::uuid,
     'exam-attempt-uuid'::uuid
   );
   ```

3. **PDF Generation Issues**
   ```
   1. Check PDF generation service status
   2. Verify certificate template availability
   3. Ensure sufficient server resources
   4. Contact support for manual generation
   ```

#### Problem: Certificate Verification Failures
**Symptoms:**
- Certificate verification returns "not found"
- Invalid certificate number errors
- Verification website not working

**Solutions:**
1. **Certificate Number Verification**
   ```sql
   -- Check certificate status
   SELECT * FROM verify_certificate_status('CERT-2024-001-1234');
   ```

2. **Certificate Database Issues**
   ```
   1. Verify certificate exists in database
   2. Check if certificate is revoked
   3. Confirm certificate number format
   4. Contact support for verification assistance
   ```

## 🛠 Administrative Troubleshooting

### User Management Issues

#### Problem: Bulk User Operations Failing
**Symptoms:**
- CSV import errors
- Bulk role assignment failures
- Mass email sending issues

**Solutions:**
1. **CSV Format Validation**
   ```
   Required columns:
   - email (required)
   - first_name (optional)
   - last_name (optional)
   - role (optional, defaults to 'student')
   - organization_id (optional)
   
   Format requirements:
   - UTF-8 encoding
   - Comma-separated values
   - Header row required
   - Maximum 1000 rows per import
   ```

2. **Database Transaction Issues**
   ```sql
   -- Check for failed bulk operations
   SELECT * FROM security_audit_log 
   WHERE action_type = 'bulk_operation'
   AND created_at > now() - interval '1 hour'
   ORDER BY created_at DESC;
   ```

#### Problem: Organization Setup Issues
**Symptoms:**
- Dispensary application approval failing
- Organization access key not working
- Manager account creation errors

**Solutions:**
1. **Application Approval Process**
   ```sql
   -- Check application status
   SELECT 
     application_status,
     admin_notes,
     reviewed_by,
     reviewed_at
   FROM dispensary_applications 
   WHERE id = 'application-uuid';

   -- Approve application
   SELECT approve_dispensary_application(
     'application-uuid'::uuid,
     10 -- credits
   );
   ```

2. **Access Key Generation**
   ```sql
   -- Generate new access key if needed
   UPDATE organizations 
   SET unique_access_key = generate_dispensary_key()
   WHERE id = 'org-uuid';
   ```

### System Maintenance

#### Problem: Performance Degradation
**Symptoms:**
- Slow database queries
- High CPU/memory usage
- Frequent timeouts

**Solutions:**
1. **Database Maintenance**
   ```sql
   -- Clean up old performance metrics
   SELECT cleanup_performance_metrics();

   -- Vacuum and analyze tables
   VACUUM ANALYZE;

   -- Check table sizes
   SELECT * FROM get_database_stats();
   ```

2. **Log Cleanup**
   ```sql
   -- Clean up old audit logs (keep 90 days)
   DELETE FROM security_audit_log 
   WHERE created_at < now() - interval '90 days';

   -- Clean up old security events
   DELETE FROM security_events 
   WHERE created_at < now() - interval '30 days'
   AND resolved_at IS NOT NULL;
   ```

3. **Index Optimization**
   ```sql
   -- Check index usage
   SELECT 
     schemaname,
     tablename,
     attname,
     n_distinct,
     correlation
   FROM pg_stats
   WHERE schemaname = 'public'
   ORDER BY n_distinct DESC;

   -- Rebuild indexes if needed
   REINDEX TABLE user_progress;
   REINDEX TABLE security_audit_log;
   ```

## 🔍 Diagnostic Tools

### System Health Checks

#### Health Check Endpoint
```
GET /functions/v1/health-check

Response:
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "database": "healthy",
    "authentication": "healthy",
    "payments": "healthy",
    "email": "healthy"
  },
  "metrics": {
    "response_time": "150ms",
    "active_users": 45,
    "error_rate": "0.1%"
  }
}
```

#### Database Health Monitoring
```sql
-- Check database performance
SELECT 
  datname,
  numbackends,
  xact_commit,
  xact_rollback,
  blks_read,
  blks_hit,
  tup_returned,
  tup_fetched
FROM pg_stat_database
WHERE datname = 'postgres';

-- Check for blocking queries
SELECT 
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_statement,
  blocking_activity.query AS blocking_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

### Error Tracking and Logging

#### Application Error Monitoring
```typescript
// Error tracking configuration
const errorTypes = {
  authentication_error: "User authentication failures",
  authorization_error: "Permission denied errors",
  database_error: "Database connection or query errors",
  payment_error: "Payment processing failures",
  validation_error: "Input validation failures",
  system_error: "General system errors"
};

// Error severity levels
const errorSeverity = {
  low: "Non-critical errors that don't affect core functionality",
  medium: "Errors that affect some users or features",
  high: "Errors that affect core functionality or many users",
  critical: "System-wide failures or security breaches"
};
```

#### Log Analysis Queries
```sql
-- Recent error analysis
SELECT 
  event_type,
  severity,
  COUNT(*) as error_count,
  MAX(created_at) as last_occurrence
FROM security_events 
WHERE created_at > now() - interval '24 hours'
AND severity IN ('high', 'critical')
GROUP BY event_type, severity
ORDER BY error_count DESC;

-- User session analysis
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) as total_sessions
FROM security_audit_log
WHERE action_type = 'login'
AND created_at > now() - interval '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

## 📞 Support and Escalation

### Support Channels

#### Self-Service Resources
- **Knowledge Base**: Comprehensive documentation and guides
- **FAQ Section**: Common questions and answers
- **Video Tutorials**: Step-by-step training videos
- **System Status Page**: Real-time system status and incidents

#### Contact Support
- **Email Support**: support@procannedu.com (24-48 hour response)
- **Live Chat**: Available during business hours
- **Phone Support**: Emergency support for critical issues
- **Admin Hotline**: Priority support for administrators

### Escalation Procedures

#### Issue Severity Classification
1. **Low Priority** (P4): Non-critical issues, cosmetic problems
2. **Medium Priority** (P3): Functionality issues affecting some users
3. **High Priority** (P2): Major functionality issues affecting many users
4. **Critical Priority** (P1): System outages, security breaches, data loss

#### Response Time Expectations
- **P1 Critical**: 15 minutes initial response, 1 hour resolution target
- **P2 High**: 1 hour initial response, 4 hours resolution target
- **P3 Medium**: 4 hours initial response, 1 business day resolution
- **P4 Low**: 1 business day response, 3 business days resolution

#### Emergency Procedures
For critical issues requiring immediate attention:
1. **Contact emergency hotline** immediately
2. **Document the issue** with screenshots and error messages
3. **Preserve system state** - don't restart or change configuration
4. **Notify stakeholders** of the issue and expected timeline
5. **Follow up** with detailed incident report after resolution

Remember: Always provide as much detail as possible when reporting issues, including error messages, browser information, steps to reproduce, and any recent changes to the system.