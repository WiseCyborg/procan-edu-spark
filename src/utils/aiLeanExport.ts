import { AiLeanAnalytics } from '@/hooks/useAiLeanAnalytics';

export const exportSessionsCSV = (analytics: AiLeanAnalytics) => {
  const headers = [
    'Session ID',
    'Manager Name',
    'Organization',
    'Scenario Type',
    'Message Count',
    'Created Date',
    'Updated Date',
  ];

  const rows = analytics.recentSessions.map(session => [
    session.id,
    session.user_name,
    session.organization_name || 'N/A',
    session.scenario_type || 'General Management',
    session.message_count.toString(),
    new Date(session.created_at).toLocaleString(),
    new Date(session.updated_at).toLocaleString(),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ailean-sessions-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportAnalyticsReport = (analytics: AiLeanAnalytics) => {
  const report = `
AiLean Analytics Report
Generated: ${new Date().toLocaleString()}
========================

OVERVIEW METRICS
----------------
Total Sessions: ${analytics.totalSessions}
Active Managers: ${analytics.totalUsers}
Average Session Duration: ${analytics.avgSessionDuration} minutes
Total Messages Exchanged: ${analytics.totalMessages}

POPULAR SCENARIOS
-----------------
${analytics.popularScenarios.map(s => `${s.scenario}: ${s.count} sessions (${s.percentage}%)`).join('\n')}

TOP ENGAGED MANAGERS
--------------------
${analytics.topUsers.map((u, i) => `${i + 1}. ${u.user_name} (${u.organization_name || 'N/A'}): ${u.session_count} sessions`).join('\n')}

RECENT SESSIONS
---------------
${analytics.recentSessions.map(s => `
• ${s.title}
  Manager: ${s.user_name}
  Scenario: ${s.scenario_type || 'General Management'}
  Messages: ${s.message_count}
  Date: ${new Date(s.created_at).toLocaleString()}
`).join('\n')}
  `.trim();

  const blob = new Blob([report], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ailean-analytics-report-${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
