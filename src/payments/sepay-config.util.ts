import { Tenant } from '../entities/tenant.entity';
import { resolveTenantWebhookPublicBase } from './stripe-config.util';

export interface TenantSepaySettings {
  enabled?: boolean;
  accountNumber?: string;
  bankCode?: string;
  /** Optional prefix prepended to orderNumber in transfer content (e.g. SKY_). */
  orderCodePrefix?: string;
}

export interface PublicSepaySettings {
  enabled: boolean;
}

export interface AdminSepaySettings extends PublicSepaySettings {
  active: boolean;
  accountNumber?: string;
  bankCode?: string;
  orderCodePrefix?: string;
  webhookPublicBase?: string;
  webhookUrl?: string;
}

const SEPAY_QR_BASE = 'https://qr.sepay.vn/img';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function getTenantSepaySettings(tenant: Tenant): TenantSepaySettings {
  const settings = asRecord(tenant.settings);
  const sepay = asRecord(settings?.sepay);
  if (!sepay) return {};
  return {
    enabled: sepay.enabled === true ? true : sepay.enabled === false ? false : undefined,
    accountNumber:
      typeof sepay.accountNumber === 'string' ? sepay.accountNumber.trim() : undefined,
    bankCode: typeof sepay.bankCode === 'string' ? sepay.bankCode.trim().toUpperCase() : undefined,
    orderCodePrefix:
      typeof sepay.orderCodePrefix === 'string' ? sepay.orderCodePrefix.trim() : undefined,
  };
}

export function buildSepayTransferContent(orderNumber: string, prefix?: string): string {
  const code = orderNumber.trim();
  if (!prefix) return code;
  return `${prefix}${code}`;
}

export function normalizeTransferContent(value: string): string {
  return value.trim().toUpperCase();
}

/** Match webhook content to order number (with optional prefix). */
export function transferContentMatchesOrder(
  webhookContent: string,
  orderNumber: string,
  prefix?: string,
): boolean {
  const normalized = normalizeTransferContent(webhookContent);
  const expected = normalizeTransferContent(buildSepayTransferContent(orderNumber, prefix));
  if (normalized === expected) return true;
  if (normalized.includes(expected) || expected.includes(normalized)) return true;
  return normalized.endsWith(orderNumber.trim().toUpperCase());
}

export function isSepayConfigured(tenant: Tenant): boolean {
  const s = getTenantSepaySettings(tenant);
  return Boolean(s.accountNumber && s.bankCode);
}

export function isSepayEnabledForTenant(tenant: Tenant): boolean {
  const s = getTenantSepaySettings(tenant);
  if (s.enabled !== true) return false;
  return isSepayConfigured(tenant);
}

export function buildSepayQrImageUrl(params: {
  accountNumber: string;
  bankCode: string;
  amount: number;
  transferContent: string;
}): string {
  const url = new URL(SEPAY_QR_BASE);
  url.searchParams.set('acc', params.accountNumber);
  url.searchParams.set('bank', params.bankCode);
  url.searchParams.set('amount', String(Math.round(params.amount)));
  url.searchParams.set('des', params.transferContent);
  return url.toString();
}

export function buildSepayWebhookUrl(
  tenant: Tenant,
  apiPublicBaseFallback?: string,
): string {
  const origin = resolveTenantWebhookPublicBase(tenant, apiPublicBaseFallback);
  return `${origin}/api/payments/sepay/webhook/${tenant.id}`;
}

export function toPublicSepaySettings(tenant: Tenant): PublicSepaySettings {
  return { enabled: isSepayEnabledForTenant(tenant) };
}

export function toAdminSepaySettings(tenant: Tenant, apiPublicBase?: string): AdminSepaySettings {
  const s = getTenantSepaySettings(tenant);
  const fallback = apiPublicBase || 'http://localhost:4500';
  const webhookPublicBase = resolveTenantWebhookPublicBase(tenant, fallback);
  const toggledOn = s.enabled === true;
  const active = isSepayEnabledForTenant(tenant);
  if (!toggledOn) {
    return { enabled: false, active: false };
  }
  return {
    enabled: true,
    active,
    accountNumber: s.accountNumber,
    bankCode: s.bankCode,
    orderCodePrefix: s.orderCodePrefix,
    webhookPublicBase,
    webhookUrl: buildSepayWebhookUrl(tenant, fallback),
  };
}
