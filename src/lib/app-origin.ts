/**
 * Canonical public origin for absolute links in emails and redirects.
 * Prefer `NEXTAUTH_URL` in production; Vercel previews set `VERCEL_URL`.
 */
export function getAppOrigin(): string {
  const fromAuth = process.env.NEXTAUTH_URL;
  if (fromAuth) {
    try {
      return new URL(fromAuth).origin;
    } catch {
      // fall through
    }
  }
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export function absoluteUrl(path: string): string {
  const base = getAppOrigin().replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
