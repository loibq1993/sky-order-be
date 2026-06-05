import { Tenant } from '../entities/tenant.entity';

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
  frontendUrl: string;
}

export interface StripeEnvFallback {
  secretKey: string;
  webhookSecret: string;
  currency: string;
  frontendUrl: string;
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

export function buildStripeWebhookUrl(apiPublicBase: string, tenantId: string): string {
  const origin = normalizeApiPublicBase(apiPublicBase);
  return `${origin}/api/payments/stripe/webhook/${tenantId}`;
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

export function resolveStripeConfig(
  tenant: Tenant,
  env: StripeEnvFallback,
): ResolvedStripeConfig | null {
  const fromTenant = getTenantStripeSettings(tenant);
  const secretKey = fromTenant.secretKey || env.secretKey;
  if (!secretKey) return null;

  const tenantCurrency = tenant.currency?.trim().toLowerCase();
  const currency = fromTenant.currency || tenantCurrency || env.currency || 'vnd';

  return {
    secretKey,
    webhookSecret: fromTenant.webhookSecret || env.webhookSecret,
    currency,
    frontendUrl: env.frontendUrl,
  };
}

export function isStripeEnabledForTenant(tenant: Tenant, env: StripeEnvFallback): boolean {
  const stripe = getTenantStripeSettings(tenant);
  if (stripe.enabled !== true) return false;
  return resolveStripeConfig(tenant, env) !== null;
}

export function maskSecret(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value.length <= 8) return SECRET_PLACEHOLDER;
  return `${value.slice(0, 7)}…${value.slice(-4)}`;
}

export function toPublicStripeSettings(
  tenant: Tenant,
  env: StripeEnvFallback,
): PublicStripeSettings {
  const stripe = getTenantStripeSettings(tenant);
  const enabled = isStripeEnabledForTenant(tenant, env);
  return {
    enabled,
    publishableKey: stripe.publishableKey || undefined,
  };
}

export function toAdminStripeSettings(
  tenant: Tenant,
  env: StripeEnvFallback,
  apiPublicBase?: string,
): AdminStripeSettings {
  const stripe = getTenantStripeSettings(tenant);
  const resolved = resolveStripeConfig(tenant, env);
  const base = apiPublicBase || env.frontendUrl.replace(/\/$/, '');
  const toggledOn = stripe.enabled === true;
  const active = isStripeEnabledForTenant(tenant, env);
  return {
    enabled: toggledOn,
    active,
    publishableKey: stripe.publishableKey,
    hasSecretKey: Boolean(stripe.secretKey || env.secretKey),
    hasWebhookSecret: Boolean(stripe.webhookSecret),
    webhookUrl: buildStripeWebhookUrl(base, tenant.id),
    currency: stripe.currency || tenant.currency?.toLowerCase() || env.currency,
    secretKeyPreview: maskSecret(
      stripe.secretKey || (resolved?.secretKey === env.secretKey ? env.secretKey : stripe.secretKey),
    ),
    webhookSecretPreview: maskSecret(stripe.webhookSecret),
  };
}

/** Webhook verify for tenant-scoped endpoint — requires whsec in tenant settings (no env fallback). */
export function resolveTenantWebhookConfig(
  tenant: Tenant,
  env: StripeEnvFallback,
): ResolvedStripeConfig | null {
  const fromTenant = getTenantStripeSettings(tenant);
  if (!fromTenant.webhookSecret || !fromTenant.secretKey) return null;
  const tenantCurrency = tenant.currency?.trim().toLowerCase();
  return {
    secretKey: fromTenant.secretKey,
    webhookSecret: fromTenant.webhookSecret,
    currency: fromTenant.currency || tenantCurrency || env.currency || 'vnd',
    frontendUrl: env.frontendUrl,
  };
}

export function sanitizeTenantSettingsForPublic(
  tenant: Tenant,
  env: StripeEnvFallback,
): Record<string, unknown> {
  const settings = { ...(asRecord(tenant.settings) || {}) };
  settings.stripe = toPublicStripeSettings(tenant, env);
  return settings;
}

export function sanitizeTenantSettingsForAdmin(
  tenant: Tenant,
  env: StripeEnvFallback,
  apiPublicBase?: string,
): Record<string, unknown> {
  const settings = { ...(asRecord(tenant.settings) || {}) };
  settings.stripe = toAdminStripeSettings(tenant, env, apiPublicBase);
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

    base[key] = value;
  }

  return base;
}
