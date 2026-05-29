## Plan: UAT Tester Guide → PDF

Convert `docs/UAT_TESTER_GUIDE.md` into a branded, print-ready PDF saved to `/mnt/documents/UAT_TESTER_GUIDE.pdf`.

### Steps

1. Use ReportLab (Platypus) to render the guide with:
   - US Letter, 1" margins
   - ProCannEdu header (title + date), page numbers in footer
   - Heading hierarchy (H1/H2), credentials table with shaded header row, monospaced code blocks, bulleted/numbered lists
2. Write to `/mnt/documents/UAT_TESTER_GUIDE.pdf`.
3. QA: rasterize each page with `pdftoppm` and visually inspect for clipping, overlap, and table alignment; iterate until clean.
4. Deliver via `<presentation-artifact>` tag.

No code or app changes — pure artifact generation.