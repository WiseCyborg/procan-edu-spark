# Gap #2 & Gap #4 Execution Guide

## ⚠️ Pre-Flight Checklist

Run these checks BEFORE executing the fixes:

### 1. Verify Prerequisites
```bash
# In Supabase SQL Editor, run:
cat scripts/verify-gap-fixes-prerequisites.sql
```

Expected results:
- ✅ 7 expired applications found
- ✅ Demo Dispensary LLC has 50 credit deficit
- ✅ At least 1 active course exists
- ✅ Notification queue is functional
- ✅ Your admin user appears in results

### 2. Deploy Edge Functions
```bash
# Functions should auto-deploy, but verify in Supabase Dashboard:
# https://supabase.com/dashboard/project/zhmpwczrvitomsxjwpzc/functions
```

Look for:
- `batch-regenerate-tokens` - Status: Deployed
- `reconcile-seats` - Status: Deployed

---

## 🚀 Execution Steps

### Option A: Via Admin UI (Recommended)

1. **Navigate to Gap Analysis**
   ```
   https://www.procannedu.com/gap-analysis
   ```

2. **Select "Week 1 Fixes" Tab**

3. **Execute Gap #2: Regenerate Tokens**
   - Click "Execute" button in Gap #2 card
   - Wait for completion (should take 30-60 seconds for 7 applications)
   - Expected result:
     ```json
     {
       "success": true,
       "total_expired": 7,
       "regenerated": 7,
       "failed": 0,
       "errors": []
     }
     ```

4. **Execute Gap #4: Reconcile Seats**
   - Click "Execute" button in Gap #4 card
   - Wait for completion (should take 10-20 seconds)
   - Expected result:
     ```json
     {
       "success": true,
       "organizations_checked": 35,
       "organizations_reconciled": 1,
       "seats_created": 50,
       "skipped": 34,
       "errors": []
     }
     ```

### Option B: Direct Edge Function Invocation

If UI execution fails, call functions directly:

```typescript
// In browser console on authenticated admin page:

// Gap #2: Regenerate Tokens
const { data, error } = await supabase.functions.invoke('batch-regenerate-tokens', {
  body: {}
});
console.log('Gap #2 Result:', data);

// Gap #4: Reconcile Seats  
const { data: seatsData, error: seatsError } = await supabase.functions.invoke('reconcile-seats', {
  body: {}
});
console.log('Gap #4 Result:', seatsData);
```

### Option C: Via Supabase Dashboard Edge Function

1. Go to: https://supabase.com/dashboard/project/zhmpwczrvitomsxjwpzc/functions/batch-regenerate-tokens
2. Click "Invoke" tab
3. Request body: `{}`
4. Click "Send Request"
5. Repeat for `reconcile-seats`

---

## ✅ Verification Queries

Run these AFTER execution to confirm success:

### Verify Gap #2 Fix (No Expired Tokens)
```sql
SELECT 
  id,
  organization_name,
  contact_email,
  registration_token_expires_at,
  CASE 
    WHEN registration_token_expires_at > NOW() THEN '✅ Valid'
    ELSE '❌ Still Expired'
  END as token_status
FROM dispensary_applications
WHERE application_status = 'approved'
  AND registration_completed = false
ORDER BY registration_token_expires_at DESC;
```

**Expected:** All 7 applications have `token_status = '✅ Valid'` with expiry 30 days in future

### Verify Gap #4 Fix (Demo Dispensary Has 50 Seats)
```sql
SELECT 
  o.name,
  o.course_credits,
  COUNT(rs.id) as actual_seats,
  CASE 
    WHEN o.course_credits = COUNT(rs.id) THEN '✅ Match'
    ELSE '❌ Mismatch'
  END as status
FROM organizations o
LEFT JOIN rvt_seats rs ON rs.organization_id = o.id
WHERE o.name = 'Demo Dispensary LLC'
GROUP BY o.id, o.name, o.course_credits;
```

**Expected:** 
- `course_credits = 50`
- `actual_seats = 50`
- `status = '✅ Match'`

### Check Notification Queue (Emails Queued)
```sql
SELECT 
  recipient_email,
  subject,
  status,
  created_at,
  metadata->>'token_regenerated' as is_regenerated
FROM notification_queue
WHERE created_at > NOW() - INTERVAL '10 minutes'
  AND metadata->>'token_regenerated' = 'true'
ORDER BY created_at DESC;
```

**Expected:** 7 notification records for the regenerated tokens

---

## 🔍 Troubleshooting

### If Gap #2 Fails:
1. Check edge function logs:
   ```
   https://supabase.com/dashboard/project/zhmpwczrvitomsxjwpzc/functions/batch-regenerate-tokens/logs
   ```
2. Verify you're logged in as admin
3. Check if `dispensary_applications` table is accessible
4. Verify `notification_queue` table exists

### If Gap #4 Fails:
1. Check edge function logs:
   ```
   https://supabase.com/dashboard/project/zhmpwczrvitomsxjwpzc/functions/reconcile-seats/logs
   ```
2. Verify at least one course exists with `is_active = true`
3. Check if `rvt_seats` table is accessible
4. Verify organization ID for Demo Dispensary LLC

### Common Errors:

**"Admin access required"**
- Ensure you're logged in with admin role
- Check browser session hasn't expired

**"No active courses found"**
- Run: `SELECT * FROM courses WHERE is_active = true;`
- If empty, activate a course: `UPDATE courses SET is_active = true WHERE id = '<course_id>';`

**"Failed to insert notification"**
- Check notification_queue table permissions
- Verify RLS policies allow inserts

---

## 📊 Success Criteria

✅ **Gap #2 Complete:**
- 7 applications regenerated
- All tokens expire 30 days from now
- 7 email notifications queued
- 0 errors

✅ **Gap #4 Complete:**
- Demo Dispensary LLC: 50 seats created
- 1 organization reconciled
- Seat count matches course_credits
- 0 errors

---

## 🎯 Next Steps After Success

1. **Test Manager Registration (Gap #3)**
   - Retrieve one regenerated token from database
   - Open incognito browser
   - Test full registration flow

2. **Monitor Email Delivery**
   - Check notification_queue processing
   - Verify emails arrive in recipient inboxes
   - Monitor email_logs for delivery status

3. **Validate Seat Allocation**
   - Confirm seats visible in Demo Dispensary dashboard
   - Test seat assignment flow
   - Verify seat status transitions
