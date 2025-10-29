-- Security Fix Verification Script
-- Run this script to check the status of all security fixes
-- Last Updated: 2025-10-29

\echo '================================'
\echo 'SECURITY FIX VERIFICATION REPORT'
\echo '================================'
\echo ''

-- Phase 1: Function Search Paths
\echo '📋 PHASE 1: Function Search Paths'
\echo '-----------------------------------'
SELECT 
  p.proname as "Function Name",
  CASE 
    WHEN p.proconfig IS NOT NULL THEN '✅ SECURED'
    ELSE '❌ VULNERABLE'
  END as "Status",
  p.proconfig as "Search Path Config"
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('initialize_learning_journey', 'update_learning_journey_on_progress')
ORDER BY p.proname;

\echo ''

-- Phase 2: Extension Schema
\echo '📦 PHASE 2: Extension Schema'
\echo '----------------------------'
SELECT 
  e.extname as "Extension Name",
  n.nspname as "Schema",
  CASE 
    WHEN n.nspname = 'public' AND e.extname = 'pg_net' 
    THEN '⚠️ PUBLIC (acceptable - cannot fix)'
    WHEN n.nspname = 'public' 
    THEN '⚠️ PUBLIC (should relocate)'
    ELSE '✅ ISOLATED'
  END as "Status",
  'pg_net does not support SET SCHEMA' as "Notes"
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE e.extname = 'pg_net';

\echo ''

-- Phase 3: Postgres Version
\echo '🔄 PHASE 3: Postgres Version'
\echo '----------------------------'
SELECT 
  split_part(version(), ' ', 2) as "Current Version",
  current_setting('server_version_num')::int as "Version Number",
  CASE 
    WHEN current_setting('server_version_num')::int >= 160000 THEN '✅ LATEST (16.x+)'
    WHEN current_setting('server_version_num')::int >= 150000 THEN '⚠️ NEEDS UPGRADE (15.x)'
    ELSE '❌ OUTDATED (<15.x)'
  END as "Security Status",
  CASE 
    WHEN current_setting('server_version_num')::int >= 160000 THEN 'No action needed'
    ELSE 'Upgrade required via Supabase Dashboard'
  END as "Action Required";

\echo ''

-- Overall Security Score
\echo '🎯 OVERALL SECURITY SCORE'
\echo '-------------------------'
WITH security_checks AS (
  -- Check 1: Functions
  SELECT 
    'Function Search Paths' as check_category,
    COUNT(*) FILTER (WHERE proconfig IS NOT NULL) as passed,
    COUNT(*) FILTER (WHERE proconfig IS NULL) as failed,
    COUNT(*) as total
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN ('initialize_learning_journey', 'update_learning_journey_on_progress')
  
  UNION ALL
  
  -- Check 2: Postgres Version
  SELECT 
    'Postgres Version' as check_category,
    CASE WHEN current_setting('server_version_num')::int >= 160000 THEN 1 ELSE 0 END as passed,
    CASE WHEN current_setting('server_version_num')::int < 160000 THEN 1 ELSE 0 END as failed,
    1 as total
)
SELECT 
  check_category as "Check Category",
  passed as "Passed",
  failed as "Failed",
  CASE 
    WHEN failed = 0 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as "Result"
FROM security_checks;

\echo ''

-- Summary
\echo '📊 SUMMARY'
\echo '----------'
WITH checks AS (
  SELECT 
    COUNT(*) FILTER (
      WHERE p.proconfig IS NOT NULL
    ) as functions_secured,
    CASE 
      WHEN current_setting('server_version_num')::int >= 160000 THEN true
      ELSE false
    END as postgres_upgraded
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN ('initialize_learning_journey', 'update_learning_journey_on_progress')
)
SELECT 
  CASE 
    WHEN functions_secured = 2 AND postgres_upgraded THEN '✅ ALL CRITICAL FIXES APPLIED'
    WHEN functions_secured = 2 AND NOT postgres_upgraded THEN '⚠️ POSTGRES UPGRADE PENDING'
    WHEN functions_secured < 2 AND postgres_upgraded THEN '⚠️ FUNCTION FIXES INCOMPLETE'
    ELSE '❌ MULTIPLE FIXES NEEDED'
  END as "Overall Status",
  functions_secured || '/2' as "Functions Secured",
  CASE WHEN postgres_upgraded THEN 'Yes' ELSE 'No' END as "Postgres Upgraded",
  CASE 
    WHEN functions_secured = 2 AND postgres_upgraded 
    THEN 'All security fixes complete!'
    ELSE 'Review SECURITY_FIX_IMPLEMENTATION.md for next steps'
  END as "Next Steps"
FROM checks;

\echo ''
\echo '================================'
\echo 'For detailed instructions, see:'
\echo 'docs/SECURITY_FIX_IMPLEMENTATION.md'
\echo '================================'
