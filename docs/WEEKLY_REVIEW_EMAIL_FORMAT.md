# Weekly Review email — structured HTML format (William-approved, format only)

**Status:** format fix applied in-repo. No live send, no harness deploy performed.

## Problem

The Monday harness sends `ProCannEdu Weekly Review - {date} - {N} decisions needed`
from `no-reply@procannedu.com`. The branded green shell is correct, but the briefing
body was passed into the template as **one `<p>` containing the whole plaintext
packet**. Gmail collapses the CRLF newlines, so sections, B-items, D-items and the
pipe-delimited scorecard render as a single unreadable brick.

## Fix

`supabase/functions/_shared/weekly-briefing-email.ts` converts the briefing markdown
(`claude/WEEKLY_BRIEFING_{date}.md`) into structured, email-safe HTML plus a
plain-text alternative:

| Source markdown | Rendered as |
| --- | --- |
| `# Title` | Branded header headline |
| Lines before the first `##` (`**Meeting date:** …`) | Separate meta lines, one per row |
| `## State of the business` | Green callout box |
| `### B1. …` + `**Owner:** …` | Individual card, Owner on its own bold line |
| `### D1. YES / NO — …` or `PICK ONE — …` | Card with a YES / NO (blue) or PICK ONE (amber) badge |
| `## 3. Scorecard` + pipe table | Real `<table>` (Measure / This week / Last week / Direction) |
| `## Next week starts here` | Its own section under a green rule |
| — | Dashboard CTA `https://www.procannedu.com/dashboard` + ProCann Edu footer |

Email-safe throughout: table-based layout, inline CSS, `max-width:600px`, no
flex/grid. The module never invents content — every string comes from the markdown.

### API

```ts
import { buildWeeklyReviewEmail } from "../_shared/weekly-briefing-email.ts";

const { subject, html, text } = buildWeeklyReviewEmail({
  markdown,                 // contents of claude/WEEKLY_BRIEFING_{date}.md
  briefingDate: "2026-09-07",
});
// send with html AND text (plain-text alternative keeps the newlines)
```

`countDecisions(markdown)` counts `D#` headings for the `- {N} decisions needed`
subject suffix.

## Where the harness lives

The Monday sender is **not in this repository**. Searched: `supabase/functions/**`
(210 functions), `src/**`, `scripts/**` — no weekly-review builder, no
`WEEKLY_BRIEFING` reference, and no `claude/` directory. The email is produced by the
**scheduled Claude/Lovable Monday agent** that writes `claude/WEEKLY_BRIEFING_{date}.md`
and sends the four emails (~9:15–9:42 AM ET Mondays).

**Action required in that scheduled prompt** (outside this repo — edit the Monday
agent prompt / ProCannEdu project doc):

> When sending the weekly review email, do not paste the briefing text into a single
> `<p>`. Convert `claude/WEEKLY_BRIEFING_{date}.md` to structured HTML using the rules
> in `docs/WEEKLY_REVIEW_EMAIL_FORMAT.md` (headings → section headers, `B#`/`D#` →
> cards with Owner line and YES/NO or PICK ONE badges, pipe tables → real `<table>`,
> callout for State of the business), keep the Dashboard CTA and ProCann Edu footer,
> and always include the plain-text alternative. Reference implementation:
> `supabase/functions/_shared/weekly-briefing-email.ts`.

If the sender is ever moved into an edge function, import the shared module directly
rather than re-implementing the conversion.

## How to verify (no send)

```bash
bun scripts/render-weekly-review-email.ts docs/samples/WEEKLY_BRIEFING_SAMPLE.md
# → docs/samples/out/weekly-review-<date>.html and .txt
```

Open the HTML in a browser and confirm: meta lines separate, green callout, one card
per B-item with a bold Owner line, badges on D-items, scorecard as a table, Dashboard
button, footer. Point the script at a real `WEEKLY_BRIEFING_*.md` to preview an actual
week. The script only writes files — it sends nothing.
