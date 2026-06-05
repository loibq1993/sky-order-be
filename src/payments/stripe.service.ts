import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Tenant } from '../entities/tenant.entity';
import {
  ResolvedStripeConfig,
  StripeEnvFallback,
  isStripeEnabledForTenant,
  resolveStripeConfig,
} from './stripe-config.util';

@Injectable()
export class StripeService {
  private readonly envFallback: StripeEnvFallback;
  private readonly clientCache = new Map<string, Stripe>();

  constructor(private readonly configService: ConfigService) {
    this.envFallback = {
      secretKey: this.configService.get<string>('app.stripe.secretKey') || '',
      webhookSecret: this.configService.get<string>('app.stripe.webhookSecret') || '',
      currency: (this.configService.get<string>('app.stripe.currency') || 'vnd').toLowerCase(),
      frontendUrl: (
        this.configService.get<string>('app.stripe.frontendUrl') || 'http://localhost:3000'
      ).replace(/\/$/, ''),
    };
  }

  getEnvFallback(): StripeEnvFallback {
    return this.envFallback;
  }

  resolveConfig(tenant: Tenant): ResolvedStripeConfig | null {
    return resolveStripeConfig(tenant, this.envFallback);
  }

  /** Platform-wide env fallback (when tenant has no own keys). */
  resolveEnvConfig(): ResolvedStripeConfig | null {
    if (!this.envFallback.secretKey) return null;
    return { ...this.envFallback };
  }

  isConfiguredForTenant(tenant: Tenant): boolean {
    return this.resolveConfig(tenant) !== null;
  }

  isEnabledForTenant(tenant: Tenant): boolean {
    return isStripeEnabledForTenant(tenant, this.envFallback);
  }

  /** @deprecated Use isEnabledForTenant(tenant). Kept for backward compatibility. */
  isConfigured(): boolean {
    return Boolean(this.envFallback.secretKey);
  }

  private client(config: ResolvedStripeConfig): Stripe {
    let stripe = this.clientCache.get(config.secretKey);
    if (!stripe) {
      stripe = new Stripe(config.secretKey);
      this.clientCache.set(config.secretKey, stripe);
    }
    return stripe;
  }

  requireConfig(tenant: Tenant): ResolvedStripeConfig {
    const config = this.resolveConfig(tenant);
    if (!config) {
      throw new ServiceUnavailableException(
        'Stripe is not configured for this restaurant (add keys in Settings → Payment)',
      );
    }
    return config;
  }

  /** VND and other zero-decimal currencies: amount is in whole units. */
  toStripeAmount(total: number): number {
    const rounded = Math.round(Number(total));
    return Math.max(rounded, 1);
  }

  getMinimumChargeAmount(currency: string): number {
    return getMinimumChargeAmount(currency);
  }

  assertMeetsMinimumCharge(amount: number, currency: string): void {
    const min = this.getMinimumChargeAmount(currency);
    if (amount < min) {
      const label =
        currency.toLowerCase() === 'vnd'
          ? `${min.toLocaleString('vi-VN')}đ`
          : `${min} ${currency.toUpperCase()}`;
      throw new BadRequestException(
        `Số tiền thanh toán tối thiểu là ${label}. Vui lòng kiểm tra giá món trong đơn.`,
      );
    }
  }

  /** Origin only, no trailing slash — from client or FRONTEND_URL fallback. */
  resolveFrontendBase(config: ResolvedStripeConfig, frontendOrigin?: string): string {
    const fallback = config.frontendUrl.replace(/\/$/, '');
    if (!frontendOrigin?.trim()) return fallback;
    try {
      const u = new URL(frontendOrigin.trim());
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return fallback;
      return `${u.protocol}//${u.host}`;
    } catch {
      return fallback;
    }
  }

  async createCheckoutSession(
    config: ResolvedStripeConfig,
    params: {
      orderId: string;
      orderNumber: string;
      restaurantId: string;
      amount: number;
      lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
      tableNumber?: number;
      returnTo?: string;
      frontendOrigin?: string;
    },
  ): Promise<Stripe.Checkout.Session> {
    const stripe = this.client(config);
    const base = this.resolveFrontendBase(config, params.frontendOrigin);
    const returnQuery = params.returnTo
      ? `&return_to=${encodeURIComponent(params.returnTo)}`
      : '';
    const originQuery = `&return_origin=${encodeURIComponent(base)}`;
    const restaurantQuery = `&restaurantId=${encodeURIComponent(params.restaurantId)}`;
    const successUrl = `${base}/payment/success?session_id={CHECKOUT_SESSION_ID}${originQuery}${restaurantQuery}${returnQuery}`;
    const cancelUrl = `${base}/payment/cancel?order_id=${params.orderId}${originQuery}${restaurantQuery}${returnQuery}`;

    return stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: params.lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: params.orderId,
      metadata: {
        orderId: params.orderId,
        orderNumber: params.orderNumber,
        restaurantId: params.restaurantId,
        tableNumber: params.tableNumber != null ? String(params.tableNumber) : '',
      },
    });
  }

  async retrieveSession(
    config: ResolvedStripeConfig,
    sessionId: string,
  ): Promise<Stripe.Checkout.Session> {
    return this.client(config).checkout.sessions.retrieve(sessionId);
  }

  constructWebhookEvent(
    config: ResolvedStripeConfig,
    payload: Buffer,
    signature: string,
  ): Stripe.Event {
    if (!config.webhookSecret) {
      throw new ServiceUnavailableException('Stripe webhook secret is not configured for this restaurant');
    }
    return this.client(config).webhooks.constructEvent(payload, signature, config.webhookSecret);
  }
}

/** Stripe minimum charge (whole units). See https://stripe.com/docs/currencies#minimum-and-maximum-charge-amounts */
export function getMinimumChargeAmount(currency: string): number {
  const c = currency.toLowerCase();
  if (c === 'vnd') return 10_000;
  if (c === 'usd' || c === 'eur' || c === 'gbp') return 50;
  return 1;
}
