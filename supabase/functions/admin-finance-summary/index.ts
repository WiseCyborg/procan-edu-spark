import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });
function monthRange(year: number, monthIndex0: number) {
  const start = new Date(Date.UTC(year, monthIndex0, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex0 + 1, 1, 0, 0, 0));
  return { start, end };
}
function iso(d: Date) { return d.toISOString().replace(/\.\d{3}Z$/, ".000Z"); }
async function resolvePaypal(svc: any) {
  let env = (Deno.env.get("PAYPAL_ENVIRONMENT") || "sandbox").toLowerCase();
  try {
    const { data } = await svc.from("paypal_configuration").select("environment").order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (data?.environment) env = String(data.environment).toLowerCase();
  } catch (_e) {}
  const production = env === "production";
  const id = (production ? Deno.env.get("PAYPAL_PRODUCTION_CLIENT_ID") : Deno.env.get("PAYPAL_SANDBOX_CLIENT_ID")) || Deno.env.get("PAYPAL_CLIENT_ID");
  const secret = (production ? Deno.env.get("PAYPAL_PRODUCTION_CLIENT_SECRET") : Deno.env.get("PAYPAL_SANDBOX_CLIENT_SECRET")) || Deno.env.get("PAYPAL_CLIENT_SECRET");
  const baseUrl = production ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  return { env: production ? "production" : "sandbox", id, secret, baseUrl };
}
async function paypalReport(svc: any, start: Date, end: Date) {
  const { env, id, secret, baseUrl } = await resolvePaypal(svc);
  if (!id || !secret) return { available: false, environment: env, reason: "credentials_missing" };
  try {
    const tokRes = await fetch(`${baseUrl}/v1/oauth2/token`, { method: "POST", headers: { "Authorization": `Basic ${btoa(`${id}:${secret}`)}`, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" });
    const tok = await tokRes.json();
    if (!tokRes.ok || !tok.access_token) return { available: false, environment: env, reason: "auth_failed", detail: tok.error_description || tok.error || null };
    let page = 1, totalPages = 1, gross = 0, refunds = 0, fees = 0, count = 0, refundCount = 0;
    do {
      const url = `${baseUrl}/v1/reporting/transactions?start_date=${encodeURIComponent(iso(start))}&end_date=${encodeURIComponent(iso(new Date(end.getTime() - 1000)))}&fields=all&page_size=500&page=${page}`;
      const r = await fetch(url, { headers: { "Authorization": `Bearer ${tok.access_token}`, "Content-Type": "application/json" } });
      const d = await r.json();
      if (!r.ok) {
        const msg = d?.message || d?.name || "reporting_error";
        const needsScope = (d?.name === "NOT_AUTHORIZED") || /Transaction Search/i.test(JSON.stringify(d || {}));
        return { available: false, environment: env, reason: needsScope ? "transaction_search_not_enabled" : "reporting_error", detail: msg };
      }
      totalPages = d.total_pages || 1;
      for (const t of (d.transaction_details || [])) {
        const info = t.transaction_info || {};
        const amt = parseFloat(info.transaction_amount?.value ?? "0");
        const fee = parseFloat(info.fee_amount?.value ?? "0");
        if (amt >= 0) { gross += amt; count++; } else { refunds += -amt; refundCount++; }
        fees += fee;
      }
      page++;
    } while (page <= totalPages && page <= 20);
    const net = gross - refunds + fees;
    return { available: true, environment: env, gross_sales: Math.round(gross * 100) / 100, refunds: Math.round(refunds * 100) / 100, fees: Math.round(Math.abs(fees) * 100) / 100, net: Math.round(net * 100) / 100, sale_count: count, refund_count: refundCount };
  } catch (e) { return { available: false, environment: env, reason: "exception", detail: String(e?.message || e) }; }
}
async function appNative(svc: any, start: Date, end: Date) {
  const s = start.toISOString(), e = end.toISOString();
  const out: any = { available: true };
  try {
    const { data: ords } = await svc.from("orders").select("amount,currency,status,paid_at,created_at").gte("created_at", s).lt("created_at", e);
    let paidCents = 0, paidCount = 0, pendingCount = 0;
    for (const o of (ords || [])) {
      if (["paid", "completed", "captured", "succeeded"].includes(String(o.status))) { paidCents += Number(o.amount || 0); paidCount++; }
      else if (String(o.status) === "pending") pendingCount++;
    }
    out.orders_paid_revenue = Math.round(paidCents) / 100; out.orders_paid_count = paidCount; out.orders_pending_count = pendingCount;
  } catch (e) { out.orders_error = String(e?.message || e); }
  try {
    const { data: rvt } = await svc.from("rvt_purchases").select("amount_paid,status,completed_at,created_at").gte("created_at", s).lt("created_at", e);
    let cents = 0, n = 0;
    for (const p of (rvt || [])) { if (String(p.status) === "completed") { cents += Number(p.amount_paid || 0); n++; } }
    out.rvt_completed_revenue = Math.round(cents) / 100; out.rvt_completed_count = n;
  } catch (e) { out.rvt_error = String(e?.message || e); }
  try {
    const { count } = await svc.from("course_entitlements").select("id", { count: "exact", head: true }).eq("status", "active").gte("created_at", s).lt("created_at", e);
    out.new_entitlements = count ?? 0;
  } catch (e) { out.entitlements_error = String(e?.message || e); }
  return out;
}
async function quickbooks(start: Date, end: Date) {
  const clientId = Deno.env.get("QBO_CLIENT_ID"); const clientSecret = Deno.env.get("QBO_CLIENT_SECRET");
  const refreshToken = Deno.env.get("QBO_REFRESH_TOKEN"); const realmId = Deno.env.get("QBO_REALM_ID");
  if (!clientId || !clientSecret || !refreshToken || !realmId) return { connected: false, reason: "not_configured", needs: ["QBO_CLIENT_ID", "QBO_CLIENT_SECRET", "QBO_REFRESH_TOKEN", "QBO_REALM_ID"] };
  const production = (Deno.env.get("QBO_ENVIRONMENT") || "production").toLowerCase() !== "sandbox";
  const apiBase = production ? "https://quickbooks.api.intuit.com" : "https://sandbox-quickbooks.api.intuit.com";
  try {
    const tokRes = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", { method: "POST", headers: { "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}`, "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" }, body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}` });
    const tok = await tokRes.json();
    if (!tokRes.ok || !tok.access_token) return { connected: false, reason: "auth_failed", detail: tok.error_description || tok.error || null };
    const at = tok.access_token; const sd = start.toISOString().slice(0, 10); const ed = new Date(end.getTime() - 1000).toISOString().slice(0, 10);
    const q = async (path: string) => { const r = await fetch(`${apiBase}/v3/company/${realmId}/${path}`, { headers: { "Authorization": `Bearer ${at}`, "Accept": "application/json" } }); return { ok: r.ok, body: await r.json() }; };
    const pnl = await q(`reports/ProfitAndLoss?start_date=${sd}&end_date=${ed}&minorversion=70`);
    const walk = (rows: any[], want: string): number | null => {
      if (!rows) return null;
      for (const row of rows) {
        const label = row?.Summary?.ColData?.[0]?.value || row?.Header?.ColData?.[0]?.value || "";
        if (String(label).toLowerCase() === want.toLowerCase()) { const cols = row?.Summary?.ColData || row?.Header?.ColData || []; const v = cols[cols.length - 1]?.value; if (v != null) return parseFloat(v); }
        const nested = row?.Rows?.Row; if (nested) { const rr = walk(nested, want); if (rr != null) return rr; }
      }
      return null;
    };
    const rows = pnl.body?.Rows?.Row || [];
    return { connected: pnl.ok === true, environment: production ? "production" : "sandbox", profit_and_loss: pnl.ok ? { income: walk(rows, "Total Income"), expenses: walk(rows, "Total Expenses"), net_income: walk(rows, "Net Income") } : { error: pnl.body?.Fault || "report_error" } };
  } catch (e) { return { connected: false, reason: "exception", detail: String(e?.message || e) }; }
}
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || ""; const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "unauthorized" }, 401);
    const anon = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");
    const { data: userData } = await anon.auth.getUser(token);
    const user = userData?.user; if (!user) return json({ error: "unauthorized" }, 401);
    const svc = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false } });
    const { data: adminRow } = await svc.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!adminRow) return json({ error: "forbidden", detail: "admin role required" }, 403);
    const now = new Date();
    const thisM = monthRange(now.getUTCFullYear(), now.getUTCMonth()); thisM.end = new Date(now.getTime());
    const lastM = monthRange(now.getUTCFullYear(), now.getUTCMonth() - 1);
    const [ppThis, ppLast, appThis, appLast, qb] = await Promise.all([
      paypalReport(svc, thisM.start, thisM.end), paypalReport(svc, lastM.start, lastM.end),
      appNative(svc, thisM.start, thisM.end), appNative(svc, lastM.start, lastM.end), quickbooks(thisM.start, thisM.end),
    ]);
    let reconciliation: any = { available: false };
    if (ppThis?.available) {
      const appPaid = (appThis.orders_paid_revenue || 0) + (appThis.rvt_completed_revenue || 0);
      reconciliation = { available: true, paypal_net_mtd: ppThis.net, app_recorded_paid_mtd: Math.round(appPaid * 100) / 100, variance: Math.round((ppThis.net - appPaid) * 100) / 100, note: qb.connected ? "QuickBooks connected — full deposit reconciliation active." : "QuickBooks not connected yet; comparing PayPal net vs app-recorded revenue." };
    }
    return json({ generated_at: now.toISOString(), currency: "USD", period: { this_month: { start: thisM.start.toISOString(), end: thisM.end.toISOString() }, last_month: { start: lastM.start.toISOString(), end: lastM.end.toISOString() } }, paypal: { this_month: ppThis, last_month: ppLast }, app_native: { this_month: appThis, last_month: appLast }, quickbooks: qb, reconciliation });
  } catch (e) { return json({ error: "exception", detail: String(e?.message || e) }, 500); }
});
