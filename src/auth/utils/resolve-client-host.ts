import type { Request } from 'express';

/**
 * Host thật của trình duyệt khi request qua Next.js rewrite `/api` → Nest:
 * `Host` thường là `localhost:4500`, nên ưu tiên X-Client-Host / Origin / Referer.
 */
export function resolveHostForTenant(req: Request): string | undefined {
  const pick = (name: string): string | undefined => {
    const v = req.headers[name.toLowerCase()];
    if (typeof v === 'string') return v.trim() || undefined;
    if (Array.isArray(v) && v[0]) return String(v[0]).trim() || undefined;
    return undefined;
  };

  const xClient = pick('x-client-host');
  if (xClient) return xClient;
  const xTenant = pick('x-tenant-domain');
  if (xTenant) return xTenant;
  const xfh = pick('x-forwarded-host');
  if (xfh) return xfh.split(',')[0].trim();
  const origin = pick('origin');
  if (origin) {
    try {
      return new URL(origin).host;
    } catch {
      /* ignore */
    }
  }
  const referer = pick('referer');
  if (referer) {
    try {
      return new URL(referer).host;
    } catch {
      /* ignore */
    }
  }
  return pick('host');
}
