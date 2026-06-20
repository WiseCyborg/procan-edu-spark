// Regression test for Gate 4 — direct PayPal course-purchase entitlement grant.
//
// What this test guards against:
//   The PayPal webhook (paypal-webhook/index.ts) MUST upsert a
//   course_entitlements row when a course payment is captured. Before the
//   2026-06-20 fix, the course branch only updated orders.status='completed'
//   and never granted access — buyers paid in PayPal sandbox and remained
//   paywalled because usePaymentStatus reads course_entitlements as truth.
//
// How it works:
//   - Posts a synthetic PAYMENT.CAPTURE.COMPLETED webhook event to the
//     deployed paypal-webhook (signature verification is disabled in sandbox
//     when PAYPAL_WEBHOOK_ID is unset, so unsigned posts are accepted).
//   - Re-posts the same event id and asserts idempotency (duplicate flag).
//   - Re-posts a different event id for the same user/course and asserts no
//     duplicate entitlement row is created (UNIQUE(user_id, course_id)).
//
// Bootstrap + cleanup are intentionally omitted: this test reads env at
// runtime and skips itself when SUPABASE_SERVICE_ROLE_KEY isn't available
// locally (it isn't in .env by default — only the gateway has it).
//
// Manual verification baseline (2026-06-20):
//   - synthetic event v8-final → entitlement id f4de50d1-… (status=active, source=paypal)
//   - synthetic event v9 (different id) → same entitlement id, metadata refreshed
//   - synthetic event v9 reposted → {received:true, duplicate:true}
//   - synthetic event v6 (pre-fix) → no entitlement, payment_events stuck at 'received'
//
// See: docs/audit/2026-07/evidence/launch_closeout_2026-06-18/gate4_paypal_roundtrip.md
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") || Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const TEST_USER_ID = Deno.env.get("GATE4_TEST_USER_ID") || "";
const TEST_COURSE_ID = Deno.env.get("GATE4_TEST_COURSE_ID") || "";

const canRun = Boolean(SUPABASE_URL && SERVICE_ROLE && TEST_USER_ID && TEST_COURSE_ID);

function webhookUrl() {
  return `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/paypal-webhook`;
}

function syntheticEvent(eventId: string, userId: string, courseId: string) {
  return {
    id: eventId,
    event_type: "PAYMENT.CAPTURE.COMPLETED",
    resource_type: "capture",
    create_time: new Date().toISOString(),
    resource: {
      id: `CAP-${eventId}`,
      status: "COMPLETED",
      amount: { currency_code: "USD", value: "49.99" },
      custom_id: `course_${courseId}_user_${userId}`,
      supplementary_data: { related_ids: { order_id: `ORDER-${eventId}` } },
      payer: { payer_id: `PAYER-${eventId}` },
    },
  };
}

async function postWebhook(payload: unknown) {
  const res = await fetch(webhookUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  return { status: res.status, body };
}

async function sql(query: string): Promise<unknown[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SERVICE_ROLE,
      "Authorization": `Bearer ${SERVICE_ROLE}`,
    },
    body: JSON.stringify({ q: query }),
  });
  return await res.json();
}

Deno.test({
  name: "paypal-webhook: course capture grants entitlement, is idempotent, rejects duplicates",
  ignore: !canRun,
  fn: async () => {
    const stamp = `regression-${Date.now()}`;

    // 1. Insert a pending order for the test user+course via REST
    const orderInsert = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SERVICE_ROLE,
        "Authorization": `Bearer ${SERVICE_ROLE}`,
        "Prefer": "return=representation",
      },
      body: JSON.stringify({
        user_id: TEST_USER_ID,
        course_id: TEST_COURSE_ID,
        paypal_order_id: `ORDER-WH-${stamp}`,
        amount: 4999,
        currency: "usd",
        status: "pending",
        metadata: { test: true, scope: "gate4_regression" },
      }),
    });
    assert(orderInsert.ok, `order insert failed: ${await orderInsert.text()}`);

    // 2. Post the capture event
    const first = await postWebhook(syntheticEvent(`WH-${stamp}`, TEST_USER_ID, TEST_COURSE_ID));
    assertEquals(first.status, 200);
    assertEquals((first.body as any).received, true);
    assert(!(first.body as any).duplicate, "first post should not be duplicate");

    // 3. Idempotency at the entitlement layer: different event id, same user/course
    const second = await postWebhook(
      syntheticEvent(`WH-${stamp}-second`, TEST_USER_ID, TEST_COURSE_ID),
    );
    assertEquals(second.status, 200);
    assert(!(second.body as any).duplicate, "different event id is not a payment_events duplicate");

    // 4. Idempotency at the event layer: same event id rejected
    const replay = await postWebhook(
      syntheticEvent(`WH-${stamp}-second`, TEST_USER_ID, TEST_COURSE_ID),
    );
    assertEquals(replay.status, 200);
    assertEquals((replay.body as any).duplicate, true);

    // 5. Read back via REST to confirm there's exactly one entitlement
    const entRes = await fetch(
      `${SUPABASE_URL}/rest/v1/course_entitlements?user_id=eq.${TEST_USER_ID}&course_id=eq.${TEST_COURSE_ID}`,
      {
        headers: {
          "apikey": SERVICE_ROLE,
          "Authorization": `Bearer ${SERVICE_ROLE}`,
        },
      },
    );
    const ents = await entRes.json();
    assertEquals(Array.isArray(ents), true);
    assertEquals(ents.length, 1, `expected exactly 1 entitlement, got ${ents.length}`);
    assertEquals(ents[0].source, "paypal");
    assertEquals(ents[0].status, "active");

    // 6. Cleanup
    await fetch(
      `${SUPABASE_URL}/rest/v1/course_entitlements?user_id=eq.${TEST_USER_ID}&course_id=eq.${TEST_COURSE_ID}`,
      {
        method: "DELETE",
        headers: {
          "apikey": SERVICE_ROLE,
          "Authorization": `Bearer ${SERVICE_ROLE}`,
        },
      },
    );
    await fetch(
      `${SUPABASE_URL}/rest/v1/orders?paypal_order_id=eq.ORDER-WH-${stamp}`,
      {
        method: "DELETE",
        headers: {
          "apikey": SERVICE_ROLE,
          "Authorization": `Bearer ${SERVICE_ROLE}`,
        },
      },
    );
    await fetch(
      `${SUPABASE_URL}/rest/v1/payment_events?paypal_event_id=like.WH-${stamp}*`,
      {
        method: "DELETE",
        headers: {
          "apikey": SERVICE_ROLE,
          "Authorization": `Bearer ${SERVICE_ROLE}`,
        },
      },
    );
  },
});
