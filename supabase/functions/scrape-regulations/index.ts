// scrape-regulations
// Pulls Maryland COMAR Title 14 Subtitle 17 (cannabis) directly from the
// official State of Maryland Division of State Documents site, plus tracks
// document links on the MCA laws page.
//
// Primary source:   https://regs.maryland.gov/us/md/exec/comar/14.17.<chapter>[.<section>]
// Fallback source:  https://www.law.cornell.edu/regulations/maryland/COMAR-14-17-<chapter>-<section>
// Secondary track:  https://cannabis.maryland.gov/pages/law.aspx (link inventory only)
//
// Cron-callable (verify_jwt=false). Idempotent: only writes on hash change.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

// Minimum chapters we must always attempt, drawn from MCA's RVT Application
// Guidance required-curriculum list. Discovery may add more; it may never
// return fewer than these.
const FLOOR_CHAPTERS = [
  "04", "05", "06", "07", "08", "09", "12", "13", "14", "15", "16", "18", "20", "21",
] as const;
const BASE = "https://regs.maryland.gov/us/md/exec/comar/14.17";
const MCA_LAW_URL = "https://cannabis.maryland.gov/pages/law.aspx";
const UA = "ProCannEdu-RegBot/2.0 (+https://www.procannedu.com; compliance monitoring)";
const DELAY_MS = 500;

interface SectionRecord {
  number: string; // e.g. "14.17.12.04"
  title: string;
  content: string;
  sourceUrl: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function discoverChapters(): Promise<string[]> {
  const found = new Set<string>(FLOOR_CHAPTERS);
  try {
    const res = await fetchText(BASE); // https://regs.maryland.gov/us/md/exec/comar/14.17
    if (res.ok) {
      for (const m of res.body.matchAll(/\/us\/md\/exec\/comar\/14\.17\.(\d{2})(?![\d.])/g)) {
        found.add(m[1]);
      }
    } else {
      console.warn(`[scrape-regulations] chapter discovery HTTP ${res.status}; using floor list only`);
    }
  } catch (e) {
    console.warn('[scrape-regulations] chapter discovery failed; using floor list only:', e instanceof Error ? e.message : e);
  }
  return [...found].sort();
}

async function fetchText(url: string): Promise<{ ok: boolean; status: number; body: string }> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,*/*" } });
    const body = res.ok ? await res.text() : "";
    return { ok: res.ok, status: res.status, body };
  } catch (e) {
    console.error(`[scrape-regulations] fetch error ${url}:`, e instanceof Error ? e.message : e);
    return { ok: false, status: 0, body: "" };
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ")
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, " ")
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMain(html: string): string {
  // Prefer #area__content, then <main>, then <article>, else full body.
  const patterns = [
    /<div[^>]*id=["']area__content["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i,
    /<div[^>]*id=["']area__content["'][^>]*>([\s\S]*?)$/i,
    /<main\b[^>]*>([\s\S]*?)<\/main>/i,
    /<article\b[^>]*>([\s\S]*?)<\/article>/i,
    /<body\b[^>]*>([\s\S]*?)<\/body>/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1] && m[1].length > 200) return m[1];
  }
  return html;
}

function extractTitle(html: string, fallback: string): string {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return stripHtml(h1[1]).slice(0, 300);
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (t) return stripHtml(t[1]).slice(0, 300);
  return fallback;
}

function extractSectionLinksFromChapter(html: string, chapter: string): string[] {
  // Look for links like /us/md/exec/comar/14.17.<chapter>.<section>
  const re = new RegExp(`/us/md/exec/comar/14\\.17\\.${chapter}\\.(\\d{2,3})`, "g");
  const found = new Set<string>();
  for (const m of html.matchAll(re)) found.add(m[1]);
  return [...found].sort();
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function fetchSection(chapter: string, section: string): Promise<SectionRecord | null> {
  const number = `14.17.${chapter}.${section}`;
  const primary = `${BASE}.${chapter}.${section}`;
  let res = await fetchText(primary);
  let sourceUrl = primary;

  if (!res.ok) {
    const fallback = `https://www.law.cornell.edu/regulations/maryland/COMAR-14-17-${chapter}-${section}`;
    console.warn(`[scrape-regulations] primary ${primary} → ${res.status}; trying ${fallback}`);
    await sleep(DELAY_MS);
    res = await fetchText(fallback);
    sourceUrl = fallback;
    if (!res.ok) {
      console.error(`[scrape-regulations] both sources failed for ${number}`);
      return null;
    }
  }

  const main = extractMain(res.body);
  const content = stripHtml(main);
  if (content.length < 100) {
    console.warn(`[scrape-regulations] ${number} content too short (${content.length}), skipping`);
    return null;
  }
  const title = extractTitle(res.body, `COMAR ${number}`);
  return { number, title, content: content.slice(0, 20000), sourceUrl };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = new Date();
  const t0 = performance.now();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  let sectionsChecked = 0;
  let sectionsUpdated = 0;
  let changesDetected = 0;
  const errors: Array<{ where: string; message: string }> = [];

  try {
    // ---- 1. Walk each chapter and collect section numbers ----
    const CHAPTERS = await discoverChapters();
    console.log(`[scrape-regulations] scraping ${CHAPTERS.length} chapters: ${CHAPTERS.join(', ')}`);

    for (const chapter of CHAPTERS) {
      const chapterUrl = `${BASE}.${chapter}`;
      const chRes = await fetchText(chapterUrl);
      await sleep(DELAY_MS);

      if (!chRes.ok) {
        errors.push({ where: `chapter:${chapter}`, message: `HTTP ${chRes.status}` });
        continue;
      }

      const sections = extractSectionLinksFromChapter(chRes.body, chapter);
      if (sections.length === 0) {
        // Some chapters render sections as .01–.20 without explicit anchors — probe .01 through .30.
        for (let i = 1; i <= 30; i++) sections.push(String(i).padStart(2, "0"));
      }

      for (const section of sections) {
        sectionsChecked++;
        try {
          const rec = await fetchSection(chapter, section);
          await sleep(DELAY_MS);
          if (!rec) continue;

          const hash = await sha256Hex(rec.content);

          const { data: existing } = await supabase
            .from("regulatory_content")
            .select("id, version_hash, content_text")
            .eq("section_number", rec.number)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!existing || existing.version_hash !== hash) {
            changesDetected++;
            sectionsUpdated++;

            const { error: insErr } = await supabase.from("regulatory_content").insert({
              section_number: rec.number,
              section_title: rec.title,
              content_text: rec.content,
              source_url: rec.sourceUrl,
              version_hash: hash,
              last_modified_at: new Date().toISOString(),
            });
            if (insErr) {
              errors.push({ where: `insert:${rec.number}`, message: insErr.message });
              continue;
            }

            await supabase.from("regulatory_updates").insert({
              section_number: rec.number,
              change_type: existing ? "modified" : "added",
              previous_content: existing?.content_text ?? null,
              new_content: rec.content,
              detected_at: new Date().toISOString(),
              review_status: "pending",
            });

            // Best-effort AI analysis; do not fail the run if this errors.
            supabase.functions
              .invoke("analyze-regulatory-impact", {
                body: {
                  section_number: rec.number,
                  old_content: existing?.content_text ?? null,
                  new_content: rec.content,
                },
              })
              .catch((e) =>
                console.error(`[scrape-regulations] analyze-regulatory-impact ${rec.number}:`, e?.message ?? e),
              );
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          errors.push({ where: `section:14.17.${chapter}.${section}`, message: msg });
        }
      }
    }

    // ---- 2. MCA laws page: link inventory only ----
    try {
      const mca = await fetchText(MCA_LAW_URL);
      if (mca.ok) {
        const links = new Set<string>();
        for (const m of mca.body.matchAll(/href=["']([^"']+\.pdf)["']/gi)) {
          const href = m[1].startsWith("http") ? m[1] : new URL(m[1], MCA_LAW_URL).toString();
          links.add(href);
        }
        const linkList = [...links].sort().join("\n");
        const hash = await sha256Hex(linkList);

        const { data: existing } = await supabase
          .from("regulatory_content")
          .select("id, version_hash")
          .eq("section_number", "MCA.laws.index")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!existing || existing.version_hash !== hash) {
          await supabase.from("regulatory_content").insert({
            section_number: "MCA.laws.index",
            section_title: "MCA Laws & Regulations — document index",
            content_text: linkList || "(no PDF links found)",
            source_url: MCA_LAW_URL,
            version_hash: hash,
            last_modified_at: new Date().toISOString(),
          });
          if (existing) {
            await supabase.from("regulatory_updates").insert({
              section_number: "MCA.laws.index",
              change_type: "modified",
              new_content: linkList,
              detected_at: new Date().toISOString(),
              review_status: "pending",
            });
            changesDetected++;
          }
        }
      } else {
        errors.push({ where: "mca:law.aspx", message: `HTTP ${mca.status}` });
      }
    } catch (e) {
      errors.push({ where: "mca:law.aspx", message: e instanceof Error ? e.message : String(e) });
    }

    const durationMs = Math.round(performance.now() - t0);
    const status: "success" | "partial" | "failed" =
      errors.length === 0 ? "success" : sectionsChecked > errors.length ? "partial" : "failed";

    await supabase.from("cron_job_executions").insert({
      job_name: "scrape-regulations",
      executed_at: startedAt.toISOString(),
      status,
      execution_time_ms: durationMs,
      error_message: JSON.stringify({
        sectionsChecked,
        sectionsUpdated,
        changesDetected,
        errorCount: errors.length,
        errors: errors.slice(0, 25),
      }),
    });

    return new Response(
      JSON.stringify({
        success: status !== "failed",
        status,
        sections_checked: sectionsChecked,
        sections_updated: sectionsUpdated,
        changes_detected: changesDetected,
        errors,
        duration_ms: durationMs,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? `${e.message}\n${e.stack ?? ""}` : String(e);
    console.error("[scrape-regulations] fatal:", msg);
    await supabase.from("cron_job_executions").insert({
      job_name: "scrape-regulations",
      executed_at: startedAt.toISOString(),
      status: "failed",
      execution_time_ms: Math.round(performance.now() - t0),
      error_message: JSON.stringify({ fatal: msg, sectionsChecked, errors }),
    });
    return new Response(
      JSON.stringify({ success: false, status: "failed", error: msg, sections_checked: sectionsChecked, errors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
