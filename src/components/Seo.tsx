import { Helmet } from 'react-helmet-async';

interface SeoProps {
  title: string;
  description: string;
  path: string; // e.g. "/faq"
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const SITE_ORIGIN = 'https://www.procannedu.com';

/**
 * Per-route head metadata.
 *
 * - `<title>` + `<meta name="description">` (per-route override of sitewide)
 * - self-referencing `<link rel="canonical">` and `<meta property="og:url">`
 * - `<meta property="og:title">` + `og:description` so JS-executing crawlers
 *   pick up page-specific previews
 * - optional JSON-LD structured data
 *
 * The static `<link rel="canonical">` in index.html should stay removed —
 * each route owns its canonical here. Sitewide `og:*` in index.html stays as
 * the fallback for non-JS social crawlers (LinkedIn, Slack, Facebook).
 */
export function Seo({ title, description, path, jsonLd }: SeoProps) {
  const url = `${SITE_ORIGIN}${path}`;
  const schemas = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}
