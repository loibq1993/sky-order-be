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
