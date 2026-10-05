// Minimal AWS SigV4 signer + helpers for Cloudflare R2 (S3 API).
// Shared by video-migrate and render-video. No external deps.

export interface R2Config {
  accountId: string;
  bucket: string;
  endpoint: string; // e.g. https://<account>.r2.cloudflarestorage.com
  region: string; // "auto"
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
}

const LIVE_BUCKET = "procannedu-videos";
const LEGACY_BUCKETS = new Set(["procannvideos", "training-videos", "procann-videos"]);
const WORKER_PUBLIC_BASE = "https://procannedu-video.wisecyborg.workers.dev";

function readEnv(name: string): string {
  return (Deno.env.get(name) ?? "").trim().replace(/^['"]|['"]$/g, "").trim();
}

export function loadR2Config(): R2Config {
  const accountId = readEnv("R2_ACCOUNT_ID");
  let endpoint = readEnv("R2_ENDPOINT").replace(/\/+$/, "");
  if (!endpoint && accountId) {
    endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  }
  // Path-style requests add the bucket themselves. An endpoint that already
  // includes /<bucket> makes the signed path disagree with the URL R2 sees.
  if (endpoint) {
    try {
      const parsed = new URL(endpoint);
      if (parsed.pathname && parsed.pathname !== "/") endpoint = parsed.origin;
    } catch {
      // Leave a malformed endpoint for the missing-field check below.
    }
  }

  let bucket = readEnv("R2_BUCKET");
  if (LEGACY_BUCKETS.has(bucket.toLowerCase())) bucket = LIVE_BUCKET;

  // Cloudflare R2 SigV4 only validates the region name "auto".
  const region = "auto";
  const publicBaseUrl = (readEnv("R2_PUBLIC_BASE_URL") || WORKER_PUBLIC_BASE).replace(/\/+$/, "");

  const cfg: R2Config = {
    accountId,
    bucket,
    endpoint,
    region,
    accessKeyId: readEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: readEnv("R2_SECRET_ACCESS_KEY"),
    publicBaseUrl,
  };
  const missing = Object.entries(cfg)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    throw new Error(`r2_config_incomplete: missing ${missing.join(", ")}`);
  }
  return cfg;
}

const enc = new TextEncoder();

async function sha256Hex(data: Uint8Array | string): Promise<string> {
  const bytes = typeof data === "string" ? enc.encode(data) : data;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return hex(new Uint8Array(digest));
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmac(key: Uint8Array, msg: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(msg));
  return new Uint8Array(sig);
}

function encodeKey(key: string): string {
  // Encode each path segment, keep "/" separators.
  return key
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

/**
 * Sign and execute an S3 request against R2.
 * Path-style addressing: {endpoint}/{bucket}/{key}
 */
export async function r2Request(
  cfg: R2Config,
  method: "GET" | "PUT" | "HEAD" | "DELETE",
  key: string,
  body?: Uint8Array,
  contentType?: string,
): Promise<Response> {
  const url = new URL(`${cfg.endpoint}/${cfg.bucket}/${encodeKey(key)}`);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ""); // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = await sha256Hex(body ?? new Uint8Array());

  const headers: Record<string, string> = {
    host: url.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  if (contentType) headers["content-type"] = contentType;

  const signedHeaderNames = Object.keys(headers).sort();
  const canonicalHeaders = signedHeaderNames.map((h) => `${h}:${headers[h]}\n`).join("");
  const signedHeaders = signedHeaderNames.join(";");

  const canonicalRequest = [
    method,
    url.pathname,
    "", // no query string
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const scope = `${dateStamp}/${cfg.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  let signingKey = await hmac(enc.encode(`AWS4${cfg.secretAccessKey}`), dateStamp);
  signingKey = await hmac(signingKey, cfg.region);
  signingKey = await hmac(signingKey, "s3");
  signingKey = await hmac(signingKey, "aws4_request");
  const signature = hex(await hmac(signingKey, stringToSign));

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return await fetch(url.toString(), {
    method,
    headers: { ...headers, Authorization: authorization },
    body: body ?? undefined,
  });
}

async function r2ErrorCode(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  const code = text.match(/<Code>([A-Za-z0-9]+)<\/Code>/)?.[1];
  return code ? `${res.status} ${code}` : String(res.status);
}

export async function r2Head(
  cfg: R2Config,
  key: string,
): Promise<{ exists: boolean; size: number }> {
  const res = await r2Request(cfg, "HEAD", key);
  if (res.status === 404) return { exists: false, size: 0 };
  if (!res.ok) {
    throw new Error(`r2_head_failed [${await r2ErrorCode(res)}]`);
  }
  await res.body?.cancel();
  return { exists: true, size: Number(res.headers.get("content-length") ?? 0) };
}

export async function r2Put(
  cfg: R2Config,
  key: string,
  bytes: Uint8Array,
  contentType = "video/mp4",
): Promise<void> {
  const res = await r2Request(cfg, "PUT", key, bytes, contentType);
  if (!res.ok) {
    throw new Error(`r2_put_failed [${await r2ErrorCode(res)}]`);
  }
  await res.body?.cancel();
}

export async function r2Delete(cfg: R2Config, key: string): Promise<void> {
  const res = await r2Request(cfg, "DELETE", key);
  if (!res.ok && res.status !== 404) {
    throw new Error(`r2_delete_failed [${res.status}]`);
  }
  await res.body?.cancel();
}

export function r2PublicUrl(cfg: R2Config, key: string): string {
  return `${cfg.publicBaseUrl}/${encodeKey(key)}`;
}

/** Slugify a string into a filename-safe token. */
export function slugify(input: string): string {
  return (input || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "asset";
}

/**
 * Canonical R2 key: {course_slug}_module_{NN}_{slug}.mp4
 * Unmapped assets fall back to unmapped/{asset_key}.mp4
 */
export function canonicalKey(opts: {
  courseSlug?: string | null;
  moduleNumber?: number | null;
  assetKey: string;
  title?: string | null;
}): { key: string; unmapped: boolean } {
  const { courseSlug, moduleNumber, assetKey, title } = opts;
  if (!courseSlug || !moduleNumber || moduleNumber < 1) {
    return { key: `unmapped/${slugify(assetKey)}.mp4`, unmapped: true };
  }
  const nn = String(moduleNumber).padStart(2, "0");
  const tail = slugify(assetKey || title || "video");
  return { key: `${slugify(courseSlug)}_module_${nn}_${tail}.mp4`, unmapped: false };
}
