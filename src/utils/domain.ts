export const slugify = (value: string): string => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const getRootDomain = (): string | null => {
  return process.env.APP_ROOT_DOMAIN || null;
};

/** Normalize to host:port (no protocol, no path) for tenant lookup. e.g. "http://edu.vn:3000/path" → "edu.vn:3000" */
export function normalizeDomain(value: string | undefined | null): string {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim().toLowerCase();
  const withoutProtocol = trimmed.replace(/^https?:\/\//i, '').split('/')[0] ?? '';
  return withoutProtocol.trim();
}

/** Host phần trước ":" (dev: không hỗ trợ IPv6 trong customDomain). */
export function domainHostOnly(normalized: string): string {
  if (!normalized) return '';
  return normalized.split(':')[0] ?? '';
}

/**
 * Hai domain đã normalize có cùng tenant không.
 * - Khớp tuyệt đối: `a.com` = `a.com`, `a.com:3000` = `a.com:3000`
 * - Dev / local: DB lưu `host:3000` nhưng browser chỉ gửi `host` → vẫn khớp
 * - Hai bên cùng host nhưng port khác nhau (cả hai có port) → không khớp
 */
export function domainMatchesTenantLookup(storedRaw: string | null | undefined, queryNormalized: string): boolean {
  if (!storedRaw || !queryNormalized) return false;
  const s = normalizeDomain(storedRaw);
  if (!s) return false;
  if (s === queryNormalized) return true;
  const sh = domainHostOnly(s);
  const qh = domainHostOnly(queryNormalized);
  if (!sh || sh !== qh) return false;
  const sPort = s.includes(':');
  const qPort = queryNormalized.includes(':');
  if (!qPort && sPort) return true;
  if (qPort && !sPort) return true;
  return false;
}
