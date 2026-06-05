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
  enabled: boolean;
  publishableKey?: string;
}

export interface AdminStripeSettings extends PublicStripeSettings {
  /** Admin toggle stored in DB (Settings → Stripe). */
  enabled: boolean;
  /** Toggle on + keys configured — checkout actually available. */
  active: boolean;
  hasSecretKey: boolean;
  hasWebhookSecret: boolean;
  currency?: string;
  /** Host used to build webhook URL (tenant customDomain or platform fallback). */
  webhookPublicBase?: string;
  /** Full URL to register on this tenant's Stripe Dashboard (unique per restaurant). */
  webhookUrl?: string;
  /** Masked preview for admin UI (e.g. sk_test_…AHLq). */
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

const SECRET_PLACEHOLDER = '••••••••';

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
  if (!fromTenant.secretKey) return null;

  const tenantCurrency = tenant.currency?.trim().toLowerCase();
  const currency = fromTenant.currency || tenantCurrency || 'vnd';

  return {
    secretKey: fromTenant.secretKey,
    webhookSecret: fromTenant.webhookSecret || '',
    currency,
  };
}

export function isStripeEnabledForTenant(tenant: Tenant): boolean {
  const stripe = getTenantStripeSettings(tenant);
  if (stripe.enabled !== true) return false;
  return resolveStripeConfig(tenant) !== null;
}

export function maskSecret(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value.length <= 8) return SECRET_PLACEHOLDER;
  return `${value.slice(0, 7)}…${value.slice(-4)}`;
}

export function toPublicStripeSettings(tenant: Tenant): PublicStripeSettings {
  const stripe = getTenantStripeSettings(tenant);
  const enabled = isStripeEnabledForTenant(tenant);
  return {
    enabled,
    publishableKey: stripe.publishableKey || undefined,
  };
}

export function toAdminStripeSettings(
  tenant: Tenant,
  apiPublicBase?: string,
): AdminStripeSettings {
  const stripe = getTenantStripeSettings(tenant);
  const fallback = apiPublicBase || 'http://localhost:4500';
  const webhookPublicBase = resolveTenantWebhookPublicBase(tenant, fallback);
  const toggledOn = stripe.enabled === true;
  const active = isStripeEnabledForTenant(tenant);
  if (!toggledOn) {
    return { enabled: false, active: false, hasSecretKey: false, hasWebhookSecret: false };
  }
  return {
    enabled: true,
    active,
    publishableKey: stripe.publishableKey,
    hasSecretKey: Boolean(stripe.secretKey),
    hasWebhookSecret: Boolean(stripe.webhookSecret),
    webhookPublicBase,
    webhookUrl: buildStripeWebhookUrl(tenant, fallback),
    currency: stripe.currency || tenant.currency?.toLowerCase() || 'vnd',
    secretKeyPreview: maskSecret(stripe.secretKey),
    webhookSecretPreview: maskSecret(stripe.webhookSecret),
  };
}

/** Webhook verify for tenant-scoped endpoint — keys from DB only. */
export function resolveTenantWebhookConfig(tenant: Tenant): ResolvedStripeConfig | null {
  const fromTenant = getTenantStripeSettings(tenant);
  if (!fromTenant.webhookSecret || !fromTenant.secretKey) return null;
  const tenantCurrency = tenant.currency?.trim().toLowerCase();
  return {
    secretKey: fromTenant.secretKey,
    webhookSecret: fromTenant.webhookSecret,
    currency: fromTenant.currency || tenantCurrency || 'vnd',
  };
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

      for (const [stripeKey, stripeValue] of Object.entries(value as Record<string, unknown>)) {
        if (
          (stripeKey === 'secretKey' || stripeKey === 'webhookSecret') &&
          (stripeValue === '' || stripeValue === undefined || stripeValue === null)
        ) {
          continue;
        }
        nextStripe[stripeKey] = stripeValue;
      }

      base.stripe = nextStripe;
      continue;
    }

    if (key === 'sepay' && value && typeof value === 'object' && !Array.isArray(value)) {
      base.sepay = { ...(asRecord(base.sepay) || {}), ...(value as Record<string, unknown>) };
      continue;
    }

    base[key] = value;
  }

  return base;
}
