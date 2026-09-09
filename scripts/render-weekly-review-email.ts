/**
 * Dry-run renderer for the Monday Weekly Review email.
 *
 * Usage (no email is sent):
 *   bun scripts/render-weekly-review-email.ts <path-to-WEEKLY_BRIEFING.md> [outDir]
 *
 * Writes <outDir>/weekly-review-<date>.html and .txt so the format can be
 * eyeballed in a browser before any harness change goes live.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename } from 'node:path';
import { buildWeeklyReviewEmail } from '../supabase/functions/_shared/weekly-briefing-email.ts';

const src = process.argv[2] ?? 'docs/samples/WEEKLY_BRIEFING_SAMPLE.md';
const outDir = process.argv[3] ?? 'docs/samples/out';

const markdown = readFileSync(src, 'utf8');
const briefingDate =
  basename(src).match(/(\d{4}-\d{2}-\d{2})/)?.[1] ?? new Date().toISOString().slice(0, 10);

const email = buildWeeklyReviewEmail({ markdown, briefingDate });

mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/weekly-review-${briefingDate}.html`, email.html);
writeFileSync(`${outDir}/weekly-review-${briefingDate}.txt`, email.text);

console.log('Subject:', email.subject);
console.log('HTML   :', `${outDir}/weekly-review-${briefingDate}.html`, `(${email.html.length} bytes)`);
console.log('Text   :', `${outDir}/weekly-review-${briefingDate}.txt`, `(${email.text.length} bytes)`);
console.log('No email was sent.');
