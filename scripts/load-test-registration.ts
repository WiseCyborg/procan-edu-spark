import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zhmpwczrvitomsxjwpzc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobXB3Y3pydml0b21zeGp3cHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNzUyNTcsImV4cCI6MjA2MDc1MTI1N30.Fuy8xXz3g9hyDNSMO2GmKPDIOnm5tGZsF7H_jmwtoVA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function simulateConcurrentRegistrations(count: number, organizationId: string, joinCode: string) {
  console.log(`\n🚀 Starting load test: ${count} concurrent registrations`);
  console.log(`Organization ID: ${organizationId}`);
  console.log(`Join Code: ${joinCode}\n`);
  
  const timestamp = Date.now();
  
  const promises = Array.from({ length: count }, async (_, i) => {
    const email = `loadtest+${timestamp}_${i}@example.com`;
    const start = Date.now();
    
    try {
      const { data, error } = await supabase.functions.invoke('register-with-seat-allocation', {
        body: {
          email,
          password: 'TestPassword123!',
          firstName: `LoadTest${i}`,
          lastName: 'User',
          phone: '+11234567890',
          organizationId,
          organizationName: 'Load Test Org',
          joinCode
        }
      });
      
      const duration = Date.now() - start;
      
      if (error) {
        console.error(`❌ Registration ${i} failed (${duration}ms):`, error.message);
        return { success: false, duration, error: error.message };
      }
      
      console.log(`✅ Registration ${i} succeeded (${duration}ms)`);
      return { success: true, duration };
      
    } catch (error: any) {
      const duration = Date.now() - start;
      console.error(`❌ Registration ${i} error (${duration}ms):`, error.message);
      return { success: false, duration, error: error.message };
    }
  });
  
  console.log('⏳ Waiting for all registrations to complete...\n');
  const results = await Promise.allSettled(promises);
  
  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
  
  const durations = results
    .filter(r => r.status === 'fulfilled')
    .map(r => (r as any).value.duration)
    .filter(d => d !== undefined);
  
  durations.sort((a, b) => a - b);
  
  const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  const p50Duration = durations.length > 0 ? durations[Math.floor(durations.length * 0.5)] : 0;
  const p95Duration = durations.length > 0 ? durations[Math.floor(durations.length * 0.95)] : 0;
  const p99Duration = durations.length > 0 ? durations[Math.floor(durations.length * 0.99)] : 0;
  const minDuration = durations.length > 0 ? durations[0] : 0;
  const maxDuration = durations.length > 0 ? durations[durations.length - 1] : 0;
  
  console.log('\n========== LOAD TEST RESULTS ==========');
  console.log(`Total Attempts:    ${count}`);
  console.log(`Successful:        ${successful} (${(successful/count*100).toFixed(1)}%)`);
  console.log(`Failed:            ${failed} (${(failed/count*100).toFixed(1)}%)`);
  console.log('\n---------- Latency Statistics ---------');
  console.log(`Min:               ${minDuration}ms`);
  console.log(`Avg:               ${avgDuration.toFixed(0)}ms`);
  console.log(`P50 (Median):      ${p50Duration}ms`);
  console.log(`P95:               ${p95Duration}ms`);
  console.log(`P99:               ${p99Duration}ms`);
  console.log(`Max:               ${maxDuration}ms`);
  console.log('=======================================\n');
  
  // Check for SLO violations
  const sloViolations = [];
  if (successful / count < 0.95) {
    sloViolations.push(`⚠️  Success rate ${(successful/count*100).toFixed(1)}% is below 95% SLO`);
  }
  if (p95Duration > 5000) {
    sloViolations.push(`⚠️  P95 latency ${p95Duration}ms exceeds 5s SLO`);
  }
  
  if (sloViolations.length > 0) {
    console.log('⚠️  SLO VIOLATIONS DETECTED:');
    sloViolations.forEach(v => console.log(v));
  } else {
    console.log('✅ All SLOs met!');
  }
}

// Configuration
const TEST_CONFIG = {
  concurrentUsers: 100,
  organizationId: 'YOUR_TEST_ORG_ID', // Replace with actual test org ID
  joinCode: 'YOUR_TEST_JOIN_CODE'      // Replace with actual join code
};

// Run test
if (TEST_CONFIG.organizationId === 'YOUR_TEST_ORG_ID') {
  console.error('❌ ERROR: Please configure TEST_CONFIG with actual test organization ID and join code');
  console.log('\nTo find these values, run this SQL query:');
  console.log(`
SELECT 
  o.id as organization_id,
  o.name as organization_name,
  jc.code as join_code
FROM organizations o
LEFT JOIN rvt_join_codes jc ON jc.organization_id = o.id
WHERE o.payment_status = 'test'
  AND jc.is_active = true
ORDER BY o.created_at DESC
LIMIT 1;
  `);
} else {
  simulateConcurrentRegistrations(
    TEST_CONFIG.concurrentUsers,
    TEST_CONFIG.organizationId,
    TEST_CONFIG.joinCode
  );
}
