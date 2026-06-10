import { Tenant } from '../entities/tenant.entity';
import { normalizeSepayBankCode } from './sepay-bank-codes';
import { maskSecret, resolveTenantWebhookPublicBase } from './stripe-config.util';

export interface TenantSepaySettings {
  enabled?: boolean;
  /** VietQR trực tiếp (qr.sepay.vn + webhook ngân hàng). */
  accountNumber?: string;
  bankCode?: string;
  /** SePay Dashboard → Webhook tiền vào → HMAC secret. */
  webhookSecret?: string;
  /** Cổng thanh toán SePay (PG) — merchant checkout hosted. */
  pgEnabled?: boolean;
  pgMerchantId?: string;
  pgSecretKey?: string;
  pgEnv?: 'sandbox' | 'production';
}

export interface PublicSepaySettings {
  enabled: boolean;
  vietqrEnabled: boolean;
  pgEnabled: boolean;
}

export interface AdminSepaySettings extends PublicSepaySettings {
  active: boolean;
  accountNumber?: string;
  bankCode?: string;
  hasWebhookSecret?: boolean;
  webhookSecretPreview?: string;
  webhookPublicBase?: string;
  webhookUrl?: string;
  pgMerchantId?: string;
  hasPgSecretKey?: boolean;
  pgSecretKeyPreview?: string;
  pgEnv?: 'sandbox' | 'production';
  pgIpnUrl?: string;
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
  const str = (v: unknown): string | undefined => {
    if (typeof v !== 'string') return undefined;
    const t = v.trim();
    return t || undefined;
  };
  return {
    enabled: sepay.enabled === true ? true : sepay.enabled === false ? false : undefined,
    accountNumber: str(sepay.accountNumber),
    bankCode: normalizeSepayBankCode(str(sepay.bankCode)),
    webhookSecret:
      typeof sepay.webhookSecret === 'string' ? sepay.webhookSecret.trim() : undefined,
    pgEnabled: sepay.pgEnabled === true ? true : sepay.pgEnabled === false ? false : undefined,
    pgMerchantId:
      typeof sepay.pgMerchantId === 'string' ? sepay.pgMerchantId.trim() : undefined,
    pgSecretKey:
      typeof sepay.pgSecretKey === 'string' ? sepay.pgSecretKey.trim() : undefined,
    pgEnv:
      sepay.pgEnv === 'production' || sepay.pgEnv === 'sandbox'
        ? sepay.pgEnv
        : undefined,
  };
}

/** Nội dung CK VietQR = mã đơn (đã gồm prefix cấu hình admin). */
export function buildSepayTransferContent(orderNumber: string): string {
  return orderNumber.trim();
}

export function normalizeTransferContent(value: string): string {
  return value.trim().toUpperCase();
}

/** Lấy phần {timestamp}-{seq} từ nội dung CK (ngân hàng có thể bỏ `_`, lặp CF). */
export function extractOrderNumberCore(value: string): string | null {
  const normalized = value.trim().toUpperCase().replace(/_/g, '');
  const match = normalized.match(/(\d{10,}-\d{3})/);
  return match ? match[1] : null;
}

function compactAlphanumeric(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Match webhook content to order number (with optional prefix). */
export function transferContentMatchesOrder(
  webhookContent: string,
  orderNumber: string,
): boolean {
  const raw = webhookContent.trim();
  if (!raw) return false;

  const normalized = normalizeTransferContent(raw);
  const expected = normalizeTransferContent(buildSepayTransferContent(orderNumber));
  if (normalized === expected) return true;
  if (normalized.includes(expected) || expected.includes(normalized)) return true;

  const coreContent = extractOrderNumberCore(raw);
  const coreOrder = extractOrderNumberCore(orderNumber);
  if (coreContent && coreOrder && coreContent === coreOrder) return true;

  const compactContent = compactAlphanumeric(raw);
  const compactOrder = compactAlphanumeric(orderNumber);
  if (compactContent.length >= 8 && compactOrder.startsWith(compactContent)) return true;
  if (compactOrder.length >= 8 && compactContent.startsWith(compactOrder)) return true;

  return normalized.endsWith(orderNumber.trim().toUpperCase());
}

/** Gom các field SePay gửi để đối chiếu mã đơn (content / description / code). */
export function collectSepayMatchTexts(body: Record<string, unknown>): string[] {
  const texts = ['content', 'description', 'code']
    .map((key) => String(body[key] ?? '').trim())
    .filter(Boolean);
  return [...new Set(texts)];
}

export function orderMatchesSepayWebhook(
  orderNumber: string,
  matchTexts: string[],
): boolean {
  return matchTexts.some((text) => transferContentMatchesOrder(text, orderNumber));
}

export function isSepayVietQrConfigured(tenant: Tenant): boolean {
  const s = getTenantSepaySettings(tenant);
  return Boolean(s.accountNumber && s.bankCode);
}

export function isSepayPgConfigured(tenant: Tenant): boolean {
  const s = getTenantSepaySettings(tenant);
  return Boolean(s.pgMerchantId && s.pgSecretKey);
}

/** @deprecated use isSepayVietQrConfigured */
export function isSepayConfigured(tenant: Tenant): boolean {
  return isSepayVietQrConfigured(tenant);
}

export function isSepayVietQrEnabledForTenant(tenant: Tenant): boolean {
  const s = getTenantSepaySettings(tenant);
  if (s.enabled !== true) return false;
  return isSepayVietQrConfigured(tenant);
}

export function isSepayPgEnabledForTenant(tenant: Tenant): boolean {
  const s = getTenantSepaySettings(tenant);
  if (s.enabled !== true) return false;
  if (s.pgEnabled !== true) return false;
  return isSepayPgConfigured(tenant);
}

export function isSepayEnabledForTenant(tenant: Tenant): boolean {
  return isSepayVietQrEnabledForTenant(tenant) || isSepayPgEnabledForTenant(tenant);
}

export function buildSepayQrImageUrl(params: {
  accountNumber: string;
  bankCode: string;
  amount: number;
  transferContent: string;
}): string {
  const url = new URL(SEPAY_QR_BASE);
  url.searchParams.set('acc', params.accountNumber);
  url.searchParams.set('bank', normalizeSepayBankCode(params.bankCode) || params.bankCode);
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

export function buildSepayPgIpnUrl(
  tenant: Tenant,
  apiPublicBaseFallback?: string,
): string {
  const origin = resolveTenantWebhookPublicBase(tenant, apiPublicBaseFallback);
  return `${origin}/api/payments/sepay/pg/ipn/${tenant.id}`;
}

export function toPublicSepaySettings(tenant: Tenant): PublicSepaySettings {
  return {
    enabled: isSepayEnabledForTenant(tenant),
    vietqrEnabled: isSepayVietQrEnabledForTenant(tenant),
    pgEnabled: isSepayPgEnabledForTenant(tenant),
  };
}

export function toAdminSepaySettings(tenant: Tenant, apiPublicBase?: string): AdminSepaySettings {
  const s = getTenantSepaySettings(tenant);
  const fallback = apiPublicBase || 'http://localhost:4500';
  const webhookPublicBase = resolveTenantWebhookPublicBase(tenant, fallback);
  const toggledOn = s.enabled === true;
  const vietqrActive = isSepayVietQrEnabledForTenant(tenant);
  const pgActive = isSepayPgEnabledForTenant(tenant);
  if (!toggledOn) {
    return { enabled: false, active: false, vietqrEnabled: false, pgEnabled: false };
  }
  return {
    // `enabled` / `pgEnabled` = user toggle (persisted); `active` / `vietqrEnabled` = configured & ready
    enabled: toggledOn,
    active: vietqrActive || pgActive,
    vietqrEnabled: vietqrActive,
    pgEnabled: s.pgEnabled === true,
    accountNumber: s.accountNumber,
    bankCode: s.bankCode,
    hasWebhookSecret: Boolean(s.webhookSecret),
    webhookSecretPreview: maskSecret(s.webhookSecret),
    webhookPublicBase,
    webhookUrl: buildSepayWebhookUrl(tenant, fallback),
    pgMerchantId: s.pgMerchantId,
    hasPgSecretKey: Boolean(s.pgSecretKey),
    pgSecretKeyPreview: maskSecret(s.pgSecretKey),
    pgEnv: s.pgEnv || 'sandbox',
    pgIpnUrl: buildSepayPgIpnUrl(tenant, fallback),
  };
}
