import { Tenant } from '../entities/tenant.entity';

export const DEFAULT_ORDER_NUMBER_PREFIX = 'CF_';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Chuẩn hoá prefix: `CF` → `CF_`, giữ `CF_` / `SHOP-`. */
export function normalizeOrderNumberPrefix(raw?: string | null): string {
  const p = raw?.trim();
  if (!p) return DEFAULT_ORDER_NUMBER_PREFIX;
  if (p.endsWith('_') || p.endsWith('-')) return p;
  return `${p}_`;
}

export function getTenantOrderNumberPrefix(tenant: Tenant): string {
  const settings = asRecord(tenant.settings);
  const orders = asRecord(settings?.orders);
  const raw = orders?.orderNumberPrefix;
  if (typeof raw === 'string' && raw.trim()) {
    return normalizeOrderNumberPrefix(raw);
  }
  return DEFAULT_ORDER_NUMBER_PREFIX;
}

export function getTenantOrderSettings(tenant: Tenant): { orderNumberPrefix: string } {
  return { orderNumberPrefix: getTenantOrderNumberPrefix(tenant) };
}
