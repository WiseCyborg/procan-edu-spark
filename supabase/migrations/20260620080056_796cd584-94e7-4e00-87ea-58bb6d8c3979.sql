
UPDATE public.security_events
SET resolved_at = now(),
    details = details || jsonb_build_object(
      'closeout_classification', 'expected_admin_action',
      'closeout_note', 'user_roles INSERT/DELETE churn during 2026-06-16 UAT role provisioning; reviewed in launch closeout 2026-06-18 — not anomalous.',
      'closeout_run', '2026-06-18'
    )
WHERE severity IN ('high','critical')
  AND resolved_at IS NULL
  AND created_at > now() - interval '7 days'
  AND event_type IN ('user_roles_insert','user_roles_delete');
