import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe | null;
  private readonly currency: string;
  private readonly frontendUrl: string;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('app.stripe.secretKey') || '';
    this.currency = this.configService.get<string>('app.stripe.currency') || 'vnd';
    this.frontendUrl = this.configService.get<string>('app.stripe.frontendUrl') || 'http://localhost:3000';
    this.stripe = secretKey ? new Stripe(secretKey) : null;
  }

  isConfigured(): boolean {
    return this.stripe !== null;
  }

  getCurrency(): string {
    return this.currency;
  }

  getFrontendUrl(): string {
    return this.frontendUrl;
  }

  getWebhookSecret(): string {
    return this.configService.get<string>('app.stripe.webhookSecret') || '';
  }

  private client(): Stripe {
    if (!this.stripe) {
      throw new ServiceUnavailableException('Stripe is not configured (STRIPE_SECRET_KEY missing)');
    }
    return this.stripe;
  }

  /** VND and other zero-decimal currencies: amount is in whole units. */
  toStripeAmount(total: number): number {
    const rounded = Math.round(Number(total));
    return Math.max(rounded, 1);
  }

  /** Stripe minimum charge (whole units). See https://stripe.com/docs/currencies#minimum-and-maximum-charge-amounts */
  getMinimumChargeAmount(): number {
    const c = this.currency.toLowerCase();
    if (c === 'vnd') return 10_000;
    if (c === 'usd' || c === 'eur' || c === 'gbp') return 50;
    return 1;
  }

  assertMeetsMinimumCharge(amount: number): void {
    const min = this.getMinimumChargeAmount();
    if (amount < min) {
      const label =
        this.currency.toLowerCase() === 'vnd'
          ? `${min.toLocaleString('vi-VN')}đ`
          : `${min} ${this.currency.toUpperCase()}`;
      throw new BadRequestException(
        `Số tiền thanh toán tối thiểu là ${label}. Vui lòng kiểm tra giá món trong đơn.`,
      );
    }
  }

  /** Origin only, no trailing slash — from client or FRONTEND_URL fallback. */
  resolveFrontendBase(frontendOrigin?: string): string {
    const fallback = this.frontendUrl.replace(/\/$/, '');
    if (!frontendOrigin?.trim()) return fallback;
    try {
      const u = new URL(frontendOrigin.trim());
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return fallback;
      return `${u.protocol}//${u.host}`;
    } catch {
      return fallback;
    }
  }

  async createCheckoutSession(params: {
    orderId: string;
    orderNumber: string;
    restaurantId: string;
    amount: number;
    lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
    tableNumber?: number;
    returnTo?: string;
    frontendOrigin?: string;
  }): Promise<Stripe.Checkout.Session> {
    const stripe = this.client();
    const base = this.resolveFrontendBase(params.frontendOrigin);
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

  async retrieveSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    return this.client().checkout.sessions.retrieve(sessionId);
  }

  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    const secret = this.getWebhookSecret();
    if (!secret) {
      throw new ServiceUnavailableException('STRIPE_WEBHOOK_SECRET is not configured');
    }
    return this.client().webhooks.constructEvent(payload, signature, secret);
  }
}
