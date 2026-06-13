/**
 * Quick check: merge Stripe secrets into tenant settings (DB-only path).
 * Run: npx ts-node scripts/test-stripe-settings-merge.ts
 */
import { mergeTenantSettings, getTenantStripeSettings } from '../src/payments/stripe-config.util';
import { Tenant } from '../src/entities/tenant.entity';

function tenantWithSettings(settings: Record<string, unknown>): Tenant {
  return { id: 'test', settings } as Tenant;
}

const existing = { stripe: { enabled: true, publishableKey: 'pk_test_x' } };
const incoming = {
  stripe: {
    enabled: true,
    secretKey: 'sk_test_merge_check_1234567890',
    webhookSecret: 'whsec_merge_check_1234567890',
  },
};

const merged = mergeTenantSettings(existing, incoming);
const t = tenantWithSettings(merged);
const stripe = getTenantStripeSettings(t);

const ok =
  stripe.secretKey === 'sk_test_merge_check_1234567890' &&
  stripe.webhookSecret === 'whsec_merge_check_1234567890';

console.log('merged.stripe:', merged.stripe);
console.log(ok ? 'PASS: secrets in merged settings' : 'FAIL: secrets missing');

process.exit(ok ? 0 : 1);
