# Pipeline Agent Specification

## Core Principle

> No UI metric, badge, warning, or dashboard number may exist unless it is backed by a living agent that can explain, validate, and fix it.

## Agent Hierarchy

```
Pipeline Health Agent (Meta)
├── Organization Integrity Agent
├── Seat Reconciliation Agent
├── Application State Agent
├── Access & Progress Agent
├── Communications Agent
└── Certificate Integrity Agent
```

All agents report into Pipeline Health Agent, which powers:
- Admin Mission Control
- Red banners
- Funnel metrics
- Health Feed
- Auto-fixes
- Escalations

---

## 1. Pipeline Health Agent (META AGENT)

**Owner of truth across the system**

### Responsibilities
- Continuously evaluate system health
- Detect metric mismatches
- Trigger corrective agents
- Report real-time health state

### Triggers

| Trigger Type | Source | Example |
|-------------|--------|---------|
| Event | org_approved | Organization approved |
| Event | seat_purchased | Seats purchased |
| Event | manager_invited | Manager invited |
| Schedule | cron | Every 5 minutes |
| Anomaly | metric_zero | Metric = 0 but records exist |
| Error | 404 | Dashboard returned 404 |
| Agent Report | child_agent | Child agent reports issue |

### Health Dimensions

Each dimension is evaluated as: `HEALTHY` | `DEGRADED` | `BROKEN`

- `applications`
- `organizations`
- `seats`
- `users`
- `training`
- `certificates`
- `communications`

### Event Schema

```typescript
interface PipelineHealthEvent {
  id: string;
  pipeline: 'application' | 'organization' | 'seat' | 'training' | 'certification' | 'communications';
  severity: 'info' | 'warning' | 'critical';
  issue_type: string;
  description: string;
  organization_id?: string;
  user_id?: string;
  auto_fixed: boolean;
  fix_action?: string;
  requires_admin: boolean;
  metadata?: Record<string, any>;
  created_at: string;
}
```

### Snapshot Schema

```typescript
interface PipelineHealthSnapshot {
  id: string;
  total_orgs: number;
  healthy_orgs: number;
  orgs_with_issues: number;
  total_seats: number;
  allocated_seats: number;
  seat_mismatches: number;
  unregistered_managers: number;
  stalled_users: number;
  total_in_training: number;
  total_certified: number;
  pipelines_healthy: number;
  pipelines_total: number;
  issues_detected: number;
  auto_fixed_today: number;
  needs_admin_attention: number;
  last_run_at: string;
  last_run_duration_ms: number;
}
```

---

## 2. Organization Integrity Agent

**Fixes #1 blocker: unregistered managers**

### Detects
- Approved org with no registered manager
- Approved org with missing join code
- Status mismatch (Active but broken)

### Auto-Actions
- ✅ Regenerate join code
- ✅ Resend manager invite
- ⏰ Escalate after N days
- 🚫 Flag org as INCOMPLETE_SETUP

### Issue Types
```typescript
type OrganizationIssueType = 
  | 'unregistered_manager'
  | 'expired_registration_token'
  | 'no_manager_no_token'
  | 'missing_join_code'
  | 'expired_join_codes'
  | 'inactive_org_with_users';
```

### UI Binding
- Red banner: "7 managers haven't completed registration"
- Actions menu items work
- Organizations table shows status

---

## 3. Seat Reconciliation Agent

**Turns the reconcile button into continuous truth**

### Detects
- Purchased seats ≠ allocated seats
- Allocated seats ≠ active employees
- Seats exist but no org mapping

### Auto-Actions
- ✅ Create missing seat records
- 🚫 Archive orphan seats (requires confirmation)
- ✅ Update utilization metrics

### Issue Types
```typescript
type SeatIssueType = 
  | 'seat_deficit'
  | 'seat_surplus'
  | 'orphaned_seats'
  | 'seat_user_mismatch';
```

### UI Binding
- Seat Management page
- Admin Mission Control → Seat Utilization
- ROI Calculator (real numbers)

---

## 4. Application State Agent

**Prevents "approved but broken" organizations**

### State Machine

```
APPLIED → REVIEWING → APPROVED → CONFIGURED → ACTIVE
```

### Blocks Transition To ACTIVE If
- No manager registered
- No seats allocated
- No join code

### Issue Types
```typescript
type ApplicationIssueType = 
  | 'approved_without_org'
  | 'stuck_in_review'
  | 'duplicate_submission'
  | 'invalid_state_transition';
```

### UI Binding
- Revenue Pipeline Funnel
- Approval Rate metric
- Application management

---

## 5. Access & Progress Agent

**Fixes training unlock + dashboard 404s**

### Detects
- User role mismatch
- Training unlocked but inaccessible
- Dashboard routes returning 404
- Progress not persisted to database

### Auto-Actions
- ✅ Rebuild access grants
- ✅ Redirect to correct dashboard
- 🚫 Reassign role (requires confirmation)

### Route Enforcement
- `/` = Marketing / Landing
- `/auth` = Login
- `/student/dashboard` = Only after enrollment
- `/admin` = Admin only

### Issue Types
```typescript
type TrainingIssueType = 
  | 'stalled_training'
  | 'module_unlock_blocked'
  | 'progress_not_persisted'
  | 'invalid_route_access';
```

---

## 6. Communications Agent

**Upgrades email + chat into intelligent operations**

### Responsibilities
- Email delivery health monitoring
- Personalization (first name always)
- Context-aware reminders
- Agent-to-agent coordination

### Issue Types
```typescript
type CommunicationsIssueType = 
  | 'email_delivery_failed'
  | 'email_bounce'
  | 'circuit_breaker_open'
  | 'missing_personalization';
```

### UI Binding
- Email Health Dashboard
- Communications Hub
- Circuit breaker status

---

## 7. Certificate Integrity Agent

**Owns public verification trust**

### Detects
- Certificate issuance
- Expiry approaching
- Revocation events
- Verification abuse

### Issue Types
```typescript
type CertificationIssueType = 
  | 'passed_no_certificate'
  | 'certificate_not_verified'
  | 'expired_certificate'
  | 'revoked_certificate';
```

### UI Binding
- Public verification page (VALID / EXPIRED / REVOKED)
- Admin certificate counts
- Compliance reporting

---

## Agent → UI Bindings Summary

| Agent | UI Components Updated |
|-------|----------------------|
| Pipeline Health | AdminMissionControl, PipelineHealthAgent, HealthFeed |
| Organization Integrity | OrganizationsManagement, DispensaryManagement |
| Seat Reconciliation | SeatManagement, SeatAllocationMonitor |
| Application State | DispensaryApplicationManager, RevenuePipelineFunnel |
| Access & Progress | StudentDashboard, ManagerDashboard, TrainingModule |
| Communications | EmailHealthDashboard, CommunicationsHub |
| Certificate Integrity | CertificateVerification, CertificatesManagement |

---

## Implementation Priority

1. **Pipeline Health Agent** (backbone) - ✅ Implemented
2. **Organization Integrity Agent** - Critical for manager registration
3. **Seat Reconciliation Agent** - Critical for billing alignment
4. **Application State Agent** - Critical for funnel accuracy
5. **Access & Progress Agent** - Critical for student success
6. **Communications Agent** - Important for engagement
7. **Certificate Integrity Agent** - Important for compliance

---

## Health Feed Data Model

The Health Feed aggregates all agent events into a real-time display:

```typescript
interface HealthFeedItem {
  id: string;
  timestamp: string;
  agent: AgentType;
  pipeline: PipelineType;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  organization_id?: string;
  organization_name?: string;
  user_id?: string;
  user_name?: string;
  auto_fixed: boolean;
  fix_action?: string;
  requires_admin: boolean;
  acknowledged?: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  metadata?: Record<string, unknown>;
}
```

### Feed Filtering
- **All** - All events
- **Critical** - Only severity=critical
- **Auto-Fixed** - Events that were automatically resolved
- **Admin** - Events requiring admin intervention

---

## Critical Rule

> If a UI element cannot explain itself via an agent, it does not ship.

Every metric, badge, warning, or status indicator must be:
1. Backed by agent data
2. Explainable with a root cause
3. Actionable (manually or automatically)
4. Auditable (logged with timestamp)
