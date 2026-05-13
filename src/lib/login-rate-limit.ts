/**
 * In-process login attempt rate limiting for the credentials `authorize` path.
 *
 * **Production limitations (stub):**
 * - Memory is per Node/Vercel isolate; limits do not coordinate across instances.
 * - Counters reset on cold start / redeploy.
 * - IP extraction trusts `x-forwarded-for` / `x-real-ip` (configure your edge proxy honestly).
 *
 * Replace with Redis / Upstash / Cloudflare rate limiting before relying on this for abuse prevention.
 */

const WINDOW_MS = 60_000;
const MAX_FAILURES_PER_WINDOW = 40;

type Bucket = { count: number; windowStart: number };
const failureBuckets = new Map<string, Bucket>();

export function clientIpFromRequest(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function assertCredentialsRateAllowed(request: Request): void {
  const ip = clientIpFromRequest(request);
  const now = Date.now();
  let b = failureBuckets.get(ip);
  if (!b || now - b.windowStart > WINDOW_MS) {
    b = { count: 0, windowStart: now };
    failureBuckets.set(ip, b);
  }
  if (b.count >= MAX_FAILURES_PER_WINDOW) {
    const err = new Error("credentials_rate_limited");
    err.name = "CredentialsRateLimited";
    throw err;
  }
}

export function recordCredentialsFailure(request: Request): void {
  const ip = clientIpFromRequest(request);
  const now = Date.now();
  let b = failureBuckets.get(ip);
  if (!b || now - b.windowStart > WINDOW_MS) {
    b = { count: 0, windowStart: now };
  }
  b.count += 1;
  failureBuckets.set(ip, b);
}
