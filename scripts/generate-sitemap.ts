// Runs before `vite dev` and `vite build` (predev/prebuild hooks).
// Writes public/sitemap.xml with the project's public, indexable routes.
// Update `entries` when public routes change.

import { writeFileSync } from 'fs';
import { resolve } from 'path';

const BASE_URL = 'https://www.procannedu.com';

interface SitemapEntry {
  path: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: string;
}

// Public marketing/content routes only. Excluded: auth flows, /admin/*,
// /dashboard, /profile, per-user/per-org routes, payment success/cancel,
// /accept-invite, /register/*, /exam, dynamic /course/* and /payment/*.
const entries: SitemapEntry[] = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/faq', changefreq: 'monthly', priority: '0.7' },
  { path: '/courses', changefreq: 'weekly', priority: '0.9' },
  { path: '/learn', changefreq: 'weekly', priority: '0.7' },
  { path: '/consumer-education', changefreq: 'weekly', priority: '0.7' },
  { path: '/verify', changefreq: 'monthly', priority: '0.6' },
  { path: '/verify-certificate', changefreq: 'monthly', priority: '0.6' },
  { path: '/welcome', changefreq: 'monthly', priority: '0.5' },
  { path: '/get-started', changefreq: 'monthly', priority: '0.8' },
  { path: '/employers', changefreq: 'monthly', priority: '0.8' },
  { path: '/why-procann', changefreq: 'monthly', priority: '0.6' },
  { path: '/success-stories', changefreq: 'monthly', priority: '0.6' },
  { path: '/state-officials', changefreq: 'monthly', priority: '0.5' },
  { path: '/about/team', changefreq: 'monthly', priority: '0.5' },
  { path: '/impact', changefreq: 'monthly', priority: '0.5' },
  { path: '/accessibility', changefreq: 'yearly', priority: '0.4' },
  { path: '/roi-calculator-public', changefreq: 'monthly', priority: '0.6' },
  { path: '/regulatory-explorer', changefreq: 'weekly', priority: '0.6' },
  { path: '/stoplight-standard', changefreq: 'monthly', priority: '0.5' },
  { path: '/live', changefreq: 'weekly', priority: '0.5' },
  { path: '/org/apply', changefreq: 'monthly', priority: '0.7' },
];

function generateSitemap(items: SitemapEntry[]) {
  const urls = items.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join('\n'),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
    '',
  ].join('\n');
}

writeFileSync(resolve('public/sitemap.xml'), generateSitemap(entries));
console.log(`sitemap.xml written (${entries.length} entries)`);
