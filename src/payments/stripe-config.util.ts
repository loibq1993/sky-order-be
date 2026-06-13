import { Tenant } from '../entities/tenant.entity';
import { normalizeDomain } from '../utils/domain';

export interface TenantStripeSettings {
  enabled?: boolean;
  secretKey?: string;
  publishableKey?: string;
  webhookSecret?: string;
  currency?: string;
}

export interface ResolvedStripeConfig {
  secretKey: string;
  webhookSecret: string;
  currency: string;
}

export interface PublicStripeSettings {
  /** Admin toggle (public API mirrors persisted value when checkout is available). */
  enabled: boolean;
  /** Checkout ready — toggle on + secret key configured. */
  active: boolean;
  publishableKey?: string;
}

export interface AdminStripeSettings extends PublicStripeSettings {
  /** Admin toggle stored in DB (Settings → Stripe). */
  enabled: boolean;
  /** Toggle on + keys configured — checkout actually available. */
  active: boolean;
  /** Secret key stored in tenant DB (not env fallback). */
  hasSecretKey: boolean;
  /** Webhook secret stored in tenant DB (not env fallback). */
  hasWebhookSecret: boolean;
  /** Publishable key stored in tenant DB. */
  hasPublishableKey: boolean;
  currency?: string;
  /** Host used to build webhook URL (tenant customDomain or platform fallback). */
  webhookPublicBase?: string;
  /** Full URL to register on this tenant's Stripe Dashboard (unique per restaurant). */
  webhookUrl?: string;
  /** Masked preview (~10 ký tự đầu) — admin API không trả full key. */
  publishableKeyPreview?: string;
  secretKeyPreview?: string;
  webhookSecretPreview?: string;
}

/** Normalize API_BASE_URL → origin used in webhook URL (always ends with /api/...). */
export function normalizeApiPublicBase(apiBaseUrl: string): string {
  const trimmed = (apiBaseUrl || 'http://localhost:4500').trim().replace(/\/$/, '');
  if (!trimmed) return 'http://localhost:4500';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/api$/i, '');
  }
  return `http://${trimmed}`.replace(/\/api$/i, '');
}

function isLocalWebhookHost(hostWithOptionalPort: string): boolean {
  const host = (hostWithOptionalPort.split(':')[0] ?? '').toLowerCase();
  if (!host) return true;
  if (host === 'localhost' || host === '127.0.0.1') return true;
  if (host.endsWith('.localhost') || host.endsWith('.local')) return true;
  return /^\d+\.\d+\.\d+\.\d+$/.test(host);
}

/**
 * Public origin for tenant webhooks: tenant.customDomain from DB first, else platform API_BASE_URL.
 * Stripe/SePay call this URL; Next.js on custom domain proxies /api/* to Nest.
 */
export function resolveTenantWebhookPublicBase(
  tenant: Tenant,
  apiPublicBaseFallback = 'http://localhost:4500',
): string {
  const domain = normalizeDomain(tenant.customDomain);
  if (domain) {
    const scheme = isLocalWebhookHost(domain) ? 'http' : 'https';
    return `${scheme}://${domain}`;
  }
  return normalizeApiPublicBase(apiPublicBaseFallback);
}

export function buildStripeWebhookUrl(
  tenant: Tenant,
  apiPublicBaseFallback?: string,
): string {
  const origin = resolveTenantWebhookPublicBase(tenant, apiPublicBaseFallback);
  return `${origin}/api/payments/stripe/webhook/${tenant.id}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function getTenantStripeSettings(tenant: Tenant): TenantStripeSettings {
  const settings = asRecord(tenant.settings);
  const stripe = asRecord(settings?.stripe);
  if (!stripe) return {};
  return {
    enabled: stripe.enabled === true ? true : stripe.enabled === false ? false : undefined,
    secretKey: typeof stripe.secretKey === 'string' ? stripe.secretKey.trim() : undefined,
    publishableKey:
      typeof stripe.publishableKey === 'string' ? stripe.publishableKey.trim() : undefined,
    webhookSecret:
      typeof stripe.webhookSecret === 'string' ? stripe.webhookSecret.trim() : undefined,
    currency: typeof stripe.currency === 'string' ? stripe.currency.trim().toLowerCase() : undefined,
  };
}

/** Stripe keys from tenant DB only (settings.stripe). */
export function resolveStripeConfig(tenant: Tenant): ResolvedStripeConfig | null {
  const fromTenant = getTenantStripeSettings(tenant);
  if (!fromTenant.secretKey?.trim()) return null;

  const tenantCurrency = tenant.currency?.trim().toLowerCase();
  const currency = fromTenant.currency || tenantCurrency || 'vnd';

  return {
    secretKey: fromTenant.secretKey.trim(),
    webhookSecret: fromTenant.webhookSecret?.trim() || '',
    currency,
  };
}

export function isStripeEnabledForTenant(tenant: Tenant): boolean {
  const stripe = getTenantStripeSettings(tenant);
  if (stripe.enabled !== true) return false;
  return resolveStripeConfig(tenant) !== null;
}

export function maskSecret(value: string | undefined, visibleChars = 10): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed.length <= visibleChars) {
    return `${trimmed}••••`;
  }
  return `${trimmed.slice(0, visibleChars)}••••`;
}

export function toPublicStripeSettings(tenant: Tenant): PublicStripeSettings {
  const stripe = getTenantStripeSettings(tenant);
  const active = isStripeEnabledForTenant(tenant);
  return {
    enabled: stripe.enabled === true,
    active,
    publishableKey: active ? stripe.publishableKey || undefined : undefined,
  };
}

export function toAdminStripeSettings(
  tenant: Tenant,
  apiPublicBase?: string,
): AdminStripeSettings {
  const stripe = getTenantStripeSettings(tenant);
  const hasSecretKeyInDb = Boolean(stripe.secretKey?.trim());
  const hasWebhookSecretInDb = Boolean(stripe.webhookSecret?.trim());
  const hasPublishableKeyInDb = Boolean(stripe.publishableKey?.trim());
  const config = resolveStripeConfig(tenant);
  const fallback = apiPublicBase || 'http://localhost:4500';
  const webhookPublicBase = resolveTenantWebhookPublicBase(tenant, fallback);
  const toggledOn = stripe.enabled === true;
  const active = toggledOn && config !== null;
  const keyFlags = {
    hasSecretKey: hasSecretKeyInDb,
    hasWebhookSecret: hasWebhookSecretInDb,
    hasPublishableKey: hasPublishableKeyInDb,
    publishableKeyPreview: hasPublishableKeyInDb ? maskSecret(stripe.publishableKey) : undefined,
    secretKeyPreview: hasSecretKeyInDb ? maskSecret(stripe.secretKey) : undefined,
    webhookSecretPreview: hasWebhookSecretInDb ? maskSecret(stripe.webhookSecret) : undefined,
  };
  if (!toggledOn) {
    return { enabled: false, active: false, ...keyFlags };
  }
  return {
    enabled: true,
    active,
    ...keyFlags,
    webhookPublicBase,
    webhookUrl: buildStripeWebhookUrl(tenant, fallback),
    currency: stripe.currency || tenant.currency?.toLowerCase() || 'vnd',
  };
}

/** Webhook verify for tenant-scoped endpoint. */
export function resolveTenantWebhookConfig(tenant: Tenant): ResolvedStripeConfig | null {
  const config = resolveStripeConfig(tenant);
  if (!config?.webhookSecret) return null;
  return config;
}

export function sanitizeTenantSettingsForPublic(
  tenant: Tenant,
  sepay?: Record<string, unknown>,
): Record<string, unknown> {
  const settings = { ...(asRecord(tenant.settings) || {}) };
  settings.stripe = toPublicStripeSettings(tenant);
  if (sepay) settings.sepay = sepay;
  return settings;
}

export function sanitizeTenantSettingsForAdmin(
  tenant: Tenant,
  apiPublicBase?: string,
  sepay?: Record<string, unknown>,
): Record<string, unknown> {
  const settings = { ...(asRecord(tenant.settings) || {}) };
  settings.stripe = toAdminStripeSettings(tenant, apiPublicBase);
  if (sepay) settings.sepay = sepay;
  return settings;
}

/** Deep-merge tenant.settings; empty secret fields keep existing values. */
export function mergeTenantSettings(
  existing: Record<string, unknown> | null | undefined,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const base: Record<string, unknown> = { ...(existing || {}) };

  for (const [key, value] of Object.entries(incoming)) {
    if (key === 'stripe' && value && typeof value === 'object' && !Array.isArray(value)) {
      const prevStripe = asRecord(base.stripe) || {};
      const nextStripe: Record<string, unknown> = { ...prevStripe };

      const stripeReadOnlyKeys = new Set([
        'active',
        'hasSecretKey',
        'hasWebhookSecret',
        'hasPublishableKey',
        'publishableKeyPreview',
        'secretKeyPreview',
        'webhookSecretPreview',
        'webhookPublicBase',
        'webhookUrl',
        'secretKeyInput',
        'webhookSecretInput',
        'publishableKeyInput',
      ]);
      for (const k of stripeReadOnlyKeys) {
        delete nextStripe[k];
      }
      for (const [stripeKey, stripeValue] of Object.entries(value as Record<string, unknown>)) {
        if (stripeReadOnlyKeys.has(stripeKey)) {
          continue;
        }
        if (
          (stripeKey === 'secretKey' ||
            stripeKey === 'webhookSecret' ||
            stripeKey === 'publishableKey') &&
          (stripeValue === '' || stripeValue === undefined || stripeValue === null)
        ) {
          continue;
        }
        nextStripe[stripeKey] = stripeValue;
      }

      base.stripe = nextStripe;
      continue;
    }

    if (key === 'orders' && value && typeof value === 'object' && !Array.isArray(value)) {
      const prevOrders = asRecord(base.orders) || {};
      base.orders = { ...prevOrders, ...(value as Record<string, unknown>) };
      continue;
    }

    if (key === 'sepay' && value && typeof value === 'object' && !Array.isArray(value)) {
      const prevSepay = asRecord(base.sepay) || {};
      const nextSepay: Record<string, unknown> = { ...prevSepay };

      const sepayReadOnlyKeys = new Set([
        'active',
        'vietqrEnabled',
        'hasWebhookSecret',
        'webhookSecretPreview',
        'webhookPublicBase',
        'webhookUrl',
        'hasPgMerchantId',
        'pgMerchantIdPreview',
        'hasPgSecretKey',
        'pgSecretKeyPreview',
        'pgIpnUrl',
        'webhookSecretInput',
        'pgMerchantIdInput',
        'pgSecretKeyInput',
      ]);
      const sepaySkipEmptyKeys = new Set([
        'accountNumber',
        'bankCode',
        'pgMerchantId',
        'webhookSecret',
        'pgSecretKey',
      ]);
      for (const [sepayKey, sepayValue] of Object.entries(value as Record<string, unknown>)) {
        if (sepayReadOnlyKeys.has(sepayKey)) {
          continue;
        }
        if (
          sepaySkipEmptyKeys.has(sepayKey) &&
          (sepayValue === '' || sepayValue === undefined || sepayValue === null)
        ) {
          continue;
        }
        nextSepay[sepayKey] = sepayValue;
      }
      for (const k of sepayReadOnlyKeys) {
        delete nextSepay[k];
      }

      base.sepay = nextSepay;
      continue;
    }

    base[key] = value;
  }

  return base;
}
