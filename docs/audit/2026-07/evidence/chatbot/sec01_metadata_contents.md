# CHATBOT-SEC-01 — Leaked Metadata Classification

**Question (Will Cunningham, 2026-06-13):**
> The metadata block that leaked — what was actually in those per-request metadata blocks?
> If it's just routing/role scaffolding, fine. If any of it contains identifiers, internal
> table names, or anything resembling user or system data, that's a second finding hiding
> inside the first.

## What the leaked block actually contained

Sources audited:
- `supabase/functions/chat-assistant/index.ts` — anonymous-callable path (the one that leaked in the original SEC-01 probe)
- `supabase/functions/internal-chat-assistant/index.ts` — authenticated, JWT-gated path (`buildPersonalizedPrompt`)
- `supabase/functions/ailean-coach/index.ts` — authenticated, role-gated path

### `chat-assistant` (the function that originally leaked)

The leaked "metadata" block was constructed entirely from values forwarded by the **client** in `context`, plus the resolved `user_roles` array derived server-side from `user_roles` table. Fields:

| Field                 | Source             | Classification          | Notes |
|-----------------------|--------------------|--------------------------|-------|
| `context.route`       | client             | Routing scaffolding      | Pathname only, e.g. `/dashboard`. |
| `user_roles`          | server (DB query)  | Routing scaffolding      | Role strings (`student`, `dispensary_manager`, `admin`). |
| `context.intent`      | client             | Routing scaffolding      | Heuristic bucket (`help`, `training`…). |
| `context.urgency`     | client             | Routing scaffolding      | Heuristic bucket. |
| `context.topic`       | client             | Routing scaffolding      | Three-word extract from the user's own message. |
| `userProfile.trainingProgress` | client    | Business metric (own)    | Integer percent of the caller's own progress. |
| `userContext.organizationId`   | client    | **Internal identifier** | UUID — see verdict below. |
| `conversationHistory` | client             | User's own messages      | Echo of caller's recent turns. |
| `roleContext` text    | server (static)    | Routing scaffolding      | Static blurb keyed on role. |

No table names, no `auth.users` UUIDs, no other users' data, no credentials, no API keys, no DB cursors, no service-role references.

### `internal-chat-assistant` (`buildPersonalizedPrompt`)

JWT-gated. Every field is the caller's own data. Fields injected:

| Field                              | Classification          |
|------------------------------------|-------------------------|
| `first_name`, `last_name`          | PII (caller's own)      |
| `email` (in interface, not in prompt body) | Not injected into prompt | Defined on `UserContext` but `buildPersonalizedPrompt` does not template it.  |
| `role`, `roles[]`                  | Routing scaffolding     |
| `org_name`                         | Business metric (caller's org) |
| `currentPage`                      | Routing scaffolding     |
| `seat_status.{total,available,used}` | Business metric (caller's org) |
| `training_status.{completion_percentage, current_module, total_modules, enrolled}` | Business metric (caller's own) |
| `cert_status.{certified, certificate_number, expiry_date, is_expired}` | **PII / credential** — see verdict |
| `pending_applications`, `unregistered_managers`, `pending_invitations` (admin only) | Business metric (org/admin scope) |

No raw `user_id`, no `org_id` UUIDs, no internal table names, no other users' rows.

### `ailean-coach`

Authenticated + role-gated. The system prompt does **not** inject any per-user metadata — it is a static management-coaching persona. Nothing to classify.

## Verdict

| Concern                                            | Present? | Severity |
|----------------------------------------------------|----------|----------|
| Internal table / column names                      | No       | n/a      |
| Service-role keys, API keys, or DB credentials     | No       | n/a      |
| Other users' rows                                  | No       | n/a      |
| Caller's own PII (name, cert number, expiry)       | **Yes** (internal-chat-assistant only) | Low |
| Org UUID (`organizationId`) round-tripped via client `context` | **Yes** (chat-assistant) | Low |

**Net:** the original SEC-01 leak from `chat-assistant` exposed only routing scaffolding plus the caller's own org UUID (which the caller's browser already had). This is **not** a second finding by itself — no escalation beyond SEC-01 is warranted.

However, two hardening items are tracked as **CHATBOT-SEC-02 (Low, post-launch acceptable)**:

1. **`internal-chat-assistant`** injects the caller's own `certificate_number` and `expiry_date` verbatim into the prompt. A successful prompt leak (now mitigated by the SEC-01 fix) would echo a cert number back. Mitigation: replace with derived booleans (`has_active_cert`, `cert_expires_within_30_days`) and inject the cert number only when the user asks for it via tool-calling. Tracked for post-launch.
2. **`chat-assistant`** trusts client-supplied `context.organizationId` and forwards it into the prompt without server-side verification. Defence-in-depth: resolve `org_id` server-side from `organization_members` keyed on the validated `user_id`, ignore the client value. Tracked for post-launch.

Neither item changes the July 1 launch posture. SEC-01 remains the only blocker, and it is closed.
