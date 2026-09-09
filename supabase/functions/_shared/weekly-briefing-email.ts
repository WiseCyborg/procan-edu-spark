/**
 * Weekly Review email builder.
 *
 * Converts the Monday briefing markdown (claude/WEEKLY_BRIEFING_{date}.md) into
 * STRUCTURED, email-safe HTML for the branded ProCann shell — plus a plain-text
 * alternative.
 *
 * DO NOT pass the raw briefing text into a single <p>. Gmail collapses the CRLF
 * newlines and the whole packet renders as one unreadable brick. Always call
 * buildWeeklyReviewEmail() and use `.html` for the body slot and `.text` for the
 * plain-text part.
 *
 * Format only: this module never invents facts. Everything rendered comes from
 * the source markdown.
 */

export interface WeeklyReviewEmailInput {
  /** Raw markdown of claude/WEEKLY_BRIEFING_{date}.md */
  markdown: string;
  /** e.g. "2026-09-07" — used in the subject/meta line and packet reference */
  briefingDate: string;
  /** Optional override for the subject line */
  subject?: string;
  dashboardUrl?: string;
}

export interface WeeklyReviewEmail {
  subject: string;
  html: string;
  text: string;
}

const GREEN = "#059669";
const GREEN_DARK = "#065f46";
const BORDER = "#e5e7eb";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Inline markdown: **bold**, *italic*, `code`, [text](url) */
export function inlineMd(raw: string): string {
  let s = escapeHtml(raw);
  s = s.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    `<a href="$2" style="color:${GREEN};text-decoration:underline;">$1</a>`,
  );
  s = s.replace(/`([^`]+)`/g, '<code style="font-size:12px;background:#f3f4f6;padding:1px 4px;border-radius:3px;">$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#111827;">$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  return s;
}

function stripMd(raw: string): string {
  return raw
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1 ($2)")
    .replace(/[`*]/g, "")
    .trim();
}

const sectionHeading = (title: string) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 12px;">
  <tr><td style="padding:0 0 10px;border-bottom:2px solid ${GREEN};">
    <div style="font-size:17px;font-weight:700;color:${GREEN_DARK};margin:0;">${inlineMd(title)}</div>
  </td></tr>
</table>`;

const card = (inner: string, shaded = false) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px;border:1px solid ${BORDER};border-radius:8px;${shaded ? "background:#fafafa;" : ""}">
  <tr><td style="padding:14px 16px;">${inner}</td></tr>
</table>`;

const badge = (label: string) => {
  const warn = /pick one/i.test(label);
  const bg = warn ? "#fef3c7" : "#dbeafe";
  const fg = warn ? "#92400e" : "#1e40af";
  return `<span style="display:inline-block;background:${bg};color:${fg};font-size:11px;font-weight:700;letter-spacing:0.04em;padding:3px 8px;border-radius:4px;margin-right:8px;vertical-align:middle;">${escapeHtml(label)}</span>`;
};

const para = (text: string) =>
  `<div style="font-size:14px;line-height:1.55;color:#1f2937;margin:0 0 8px;">${inlineMd(text)}</div>`;

/* ------------------------------------------------------------------ */
/* markdown block parsing                                              */
/* ------------------------------------------------------------------ */

type Block =
  | { kind: "h1" | "h2" | "h3"; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul" | "ol"; items: string[] }
  | { kind: "table"; header: string[]; rows: string[][] }
  | { kind: "hr" };

export function parseMarkdownBlocks(md: string): Block[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  const isTableRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
  const splitRow = (l: string) =>
    l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();

    if (!t) { i++; continue; }

    if (/^(-{3,}|={3,}|_{3,})$/.test(t)) { blocks.push({ kind: "hr" }); i++; continue; }

    const h = t.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      blocks.push({ kind: h[1].length === 1 ? "h1" : h[1].length === 2 ? "h2" : "h3", text: h[2].trim() });
      i++;
      continue;
    }

    // pipe table
    if (isTableRow(t) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const header = splitRow(t);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      blocks.push({ kind: "table", header, rows });
      continue;
    }

    // lists
    if (/^[-*+]\s+/.test(t) || /^\d+[.)]\s+/.test(t)) {
      const ordered = /^\d+[.)]\s+/.test(t);
      const items: string[] = [];
      while (i < lines.length) {
        const lt = lines[i].trim();
        const m = ordered ? lt.match(/^\d+[.)]\s+(.*)$/) : lt.match(/^[-*+]\s+(.*)$/);
        if (m) { items.push(m[1]); i++; continue; }
        if (lt && !/^(#{1,3}\s|\|)/.test(lt) && items.length) {
          items[items.length - 1] += " " + lt; // continuation line
          i++;
          continue;
        }
        break;
      }
      blocks.push({ kind: ordered ? "ol" : "ul", items });
      continue;
    }

    // paragraph
    const buf: string[] = [];
    while (i < lines.length) {
      const lt = lines[i].trim();
      if (!lt || /^(#{1,3}\s|[-*+]\s|\d+[.)]\s|\|)/.test(lt) || /^(-{3,}|={3,})$/.test(lt)) break;
      // A line that opens with a bold label ("**Owner:** …") is its own block,
      // so meta lines and owner lines never merge into a run-on paragraph.
      if (buf.length && /^\*\*[^*]+\*\*/.test(lt)) break;
      buf.push(lt);
      i++;
    }
    blocks.push({ kind: "p", text: buf.join(" ") });
  }

  return blocks;
}

/* ------------------------------------------------------------------ */
/* rendering                                                           */
/* ------------------------------------------------------------------ */

const BADGE_RE = /^\s*(YES\s*\/\s*NO|PICK ONE)\s*[:—-]\s*/i;
const ITEM_RE = /^([BD])(\d+)[.)]\s*/i;

function renderTable(header: string[], rows: string[][]): string {
  const th = header
    .map(
      (c) =>
        `<th align="left" style="padding:10px 12px;background:#ecfdf5;border-bottom:1px solid #a7f3d0;font-size:12px;font-weight:700;color:${GREEN_DARK};text-transform:uppercase;letter-spacing:0.03em;">${inlineMd(c)}</th>`,
    )
    .join("");
  const tr = rows
    .map((r, idx) => {
      const tds = r
        .map(
          (c, ci) =>
            `<td style="padding:9px 12px;border-bottom:1px solid ${BORDER};font-size:13px;color:${ci === 0 ? "#111827;font-weight:600" : "#374151"};">${inlineMd(c)}</td>`,
        )
        .join("");
      return `<tr${idx % 2 ? ' style="background:#f9fafb;"' : ""}>${tds}</tr>`;
    })
    .join("");
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;border-collapse:collapse;border:1px solid ${BORDER};">
  <thead><tr>${th}</tr></thead>
  <tbody>${tr}</tbody>
</table>`;
}

function renderList(kind: "ul" | "ol", items: string[]): string {
  const li = items
    .map((it) => `<li style="margin:0 0 6px;">${inlineMd(it)}</li>`)
    .join("");
  return `<${kind} style="font-size:14px;line-height:1.55;color:#1f2937;margin:0 0 14px;padding-left:20px;">${li}</${kind}>`;
}

/**
 * Renders one B#/D# item as its own card:
 * - Owner line on its own bold line
 * - YES/NO or PICK ONE badge when the source marks it
 */
function renderItemCard(title: string, body: Block[]): string {
  let heading = title;
  let badgeHtml = "";
  const bm = heading.match(BADGE_RE);
  if (bm) {
    badgeHtml = badge(bm[1].toUpperCase().replace(/\s*\/\s*/, " / "));
    heading = heading.replace(BADGE_RE, "");
  }

  let inner = `<div style="margin:0 0 6px;">${badgeHtml}<span style="font-size:15px;font-weight:700;color:#111827;vertical-align:middle;">${inlineMd(heading)}</span></div>`;

  for (const b of body) {
    if (b.kind === "p") {
      const owner = b.text.match(/^\**\s*Owner\s*:?\**\s*(.+)$/i);
      if (owner) {
        inner += `<div style="font-size:13px;margin:0 0 8px;color:#374151;"><strong>Owner:</strong> ${inlineMd(owner[1].replace(/^\**|\**$/g, ""))}</div>`;
      } else {
        inner += para(b.text);
      }
    } else if (b.kind === "ul" || b.kind === "ol") {
      inner += renderList(b.kind, b.items);
    } else if (b.kind === "table") {
      inner += renderTable(b.header, b.rows);
    }
  }
  return card(inner, /^B/i.test(title.trim()));
}

function renderCallout(body: Block[]): string {
  const inner = body
    .map((b) =>
      b.kind === "p"
        ? `<div style="font-size:15px;line-height:1.55;color:#064e3b;margin:0 0 10px;">${inlineMd(b.text)}</div>`
        : b.kind === "ul" || b.kind === "ol"
        ? renderList(b.kind, b.items)
        : "",
    )
    .join("");
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;">
  <tr><td style="padding:16px 18px;">
    <div style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${GREEN_DARK};margin:0 0 8px;">State of the business</div>
    ${inner}
  </td></tr>
</table>`;
}

/** Convert the briefing markdown into the structured body slot HTML. */
export function briefingMarkdownToHtml(markdown: string): { title: string; body: string } {
  const blocks = parseMarkdownBlocks(markdown);
  let title = "";
  let out = "";

  // Leading meta block (before the first h2) renders as separate lines.
  let i = 0;
  if (blocks[i]?.kind === "h1") {
    title = (blocks[i] as { text: string }).text;
    i++;
  }
  const meta: string[] = [];
  while (i < blocks.length && blocks[i].kind !== "h2" && blocks[i].kind !== "h3") {
    const b = blocks[i];
    if (b.kind === "p") meta.push(b.text);
    if (b.kind === "ul" || b.kind === "ol") meta.push(...b.items);
    i++;
  }
  if (meta.length) {
    out += `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
  <tr><td style="font-size:14px;line-height:1.6;color:#374151;padding:0;">
    ${meta.map((m) => `<div style="margin:0 0 4px;">${inlineMd(m)}</div>`).join("")}
  </td></tr></table>`;
  }

  // Remaining sections
  while (i < blocks.length) {
    const b = blocks[i];

    if (b.kind === "h2") {
      const isCallout = /state of the business/i.test(b.text);
      const body: Block[] = [];
      let j = i + 1;
      while (j < blocks.length && blocks[j].kind !== "h2" && blocks[j].kind !== "h3") {
        body.push(blocks[j]);
        j++;
      }
      out += isCallout ? renderCallout(body) : sectionHeading(b.text) + body.map(renderLoose).join("");
      i = j;
      continue;
    }

    if (b.kind === "h3") {
      const body: Block[] = [];
      let j = i + 1;
      while (j < blocks.length && blocks[j].kind !== "h2" && blocks[j].kind !== "h3") {
        body.push(blocks[j]);
        j++;
      }
      out += ITEM_RE.test(b.text)
        ? renderItemCard(b.text, body)
        : `<div style="font-size:15px;font-weight:700;color:#111827;margin:14px 0 8px;">${inlineMd(b.text)}</div>` +
          body.map(renderLoose).join("");
      i = j;
      continue;
    }

    out += renderLoose(b);
    i++;
  }

  return { title, body: out };
}

function renderLoose(b: Block): string {
  switch (b.kind) {
    case "p":
      return para(b.text);
    case "ul":
    case "ol":
      return renderList(b.kind, b.items);
    case "table":
      return renderTable(b.header, b.rows);
    case "hr":
      return `<hr style="border:0;border-top:1px solid ${BORDER};margin:16px 0;" />`;
    default:
      return "";
  }
}

/** Plain-text alternative — keeps the newlines the HTML part discards. */
export function briefingMarkdownToText(markdown: string): string {
  const blocks = parseMarkdownBlocks(markdown);
  const out: string[] = [];
  for (const b of blocks) {
    if (b.kind === "h1") out.push(stripMd(b.text).toUpperCase(), "=".repeat(Math.min(60, b.text.length)), "");
    else if (b.kind === "h2") out.push("", stripMd(b.text).toUpperCase(), "-".repeat(Math.min(60, b.text.length)), "");
    else if (b.kind === "h3") out.push("", stripMd(b.text), "");
    else if (b.kind === "p") out.push(stripMd(b.text), "");
    else if (b.kind === "ul") out.push(...b.items.map((x) => `  - ${stripMd(x)}`), "");
    else if (b.kind === "ol") out.push(...b.items.map((x, n) => `  ${n + 1}. ${stripMd(x)}`), "");
    else if (b.kind === "table") {
      const widths = b.header.map((h, ci) =>
        Math.max(h.length, ...b.rows.map((r) => (r[ci] ?? "").length)),
      );
      const fmt = (cells: string[]) =>
        "  " + cells.map((c, ci) => stripMd(c).padEnd(widths[ci])).join("  ");
      out.push(fmt(b.header), "  " + widths.map((w) => "-".repeat(w)).join("  "));
      for (const r of b.rows) out.push(fmt(r));
      out.push("");
    } else if (b.kind === "hr") out.push("---", "");
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/* ------------------------------------------------------------------ */
/* branded shell                                                       */
/* ------------------------------------------------------------------ */

export function wrapInBrandedShell(opts: {
  headline: string;
  bodyHtml: string;
  dashboardUrl?: string;
}): string {
  const dashboardUrl = opts.dashboardUrl ?? "https://www.procannedu.com/dashboard";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(opts.headline)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;-webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid ${BORDER};">
        <tr>
          <td style="background-color:${GREEN};background-image:linear-gradient(90deg,${GREEN},#10b981);padding:28px 28px 24px;">
            <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#d1fae5;font-weight:600;margin:0 0 6px;">ProCann EDU</div>
            <div style="font-size:11px;color:#a7f3d0;margin:0 0 10px;">Maryland Cannabis Training</div>
            <div style="font-size:22px;line-height:1.3;color:#ffffff;font-weight:700;margin:0;">${escapeHtml(opts.headline)}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 28px 8px;background:#ffffff;">
            ${opts.bodyHtml}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 8px;">
              <tr><td align="center" style="padding:8px 0 16px;">
                <a href="${dashboardUrl}" style="display:inline-block;background-color:${GREEN};background-image:linear-gradient(90deg,${GREEN},#10b981);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:12px 28px;border-radius:6px;border:0;">Go to Dashboard</a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 28px;background:#f9fafb;border-top:1px solid ${BORDER};text-align:center;">
            <div style="font-size:14px;font-weight:600;color:${GREEN_DARK};margin:0 0 4px;">ProCann Edu</div>
            <div style="font-size:13px;margin:0;">
              <a href="https://procannedu.com" style="color:${GREEN};text-decoration:none;">procannedu.com</a>
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Count "PICK ONE" / "YES / NO" decision markers for the subject line. */
export function countDecisions(markdown: string): number {
  const matches = markdown.match(/^#{1,3}\s*D\d+[.)]/gim);
  return matches ? matches.length : 0;
}

export function buildWeeklyReviewEmail(input: WeeklyReviewEmailInput): WeeklyReviewEmail {
  const { title, body } = briefingMarkdownToHtml(input.markdown);
  const decisions = countDecisions(input.markdown);
  const headline = title || `ProCannEdu Weekly Operations & Finance Review`;
  const subject =
    input.subject ??
    `ProCannEdu Weekly Review - ${input.briefingDate}${decisions ? ` - ${decisions} decisions needed` : ""}`;

  return {
    subject,
    html: wrapInBrandedShell({ headline, bodyHtml: body, dashboardUrl: input.dashboardUrl }),
    text: `${headline}\n\n${briefingMarkdownToText(input.markdown)}\n\nDashboard: ${
      input.dashboardUrl ?? "https://www.procannedu.com/dashboard"
    }\nProCann Edu — procannedu.com`,
  };
}
