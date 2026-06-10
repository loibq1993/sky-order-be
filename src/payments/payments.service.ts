import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { EntityManager, IsNull, Repository } from 'typeorm';
import Stripe from 'stripe';
import { TenantOrder } from '../entities/tenant/tenant-order.entity';
import { TenantOrderItem } from '../entities/tenant/tenant-order-item.entity';
import { TenantSchemaService } from '../tenant/tenant-schema.service';
import { TenantService } from '../tenant/tenant.service';
import { OrderStatus } from '../orders/orders.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { StripeService } from './stripe.service';
import { SepayService } from './sepay.service';
import { SepayPgService } from './sepay-pg.service';
import { ResolvedStripeConfig, resolveTenantWebhookConfig, getTenantStripeSettings } from './stripe-config.util';
import {
  buildSepayTransferContent,
  collectSepayMatchTexts,
  extractOrderNumberCore,
  getTenantSepaySettings,
  orderMatchesSepayWebhook,
  transferContentMatchesOrder,
} from './sepay-config.util';
import {
  sepayWebhookHasHmacHeaders,
  verifySepayWebhookSignature,
} from './sepay-webhook.util';
import {
  CheckoutSessionResponseDto,
  PaymentStatusResponseDto,
  VietQrPaymentResponseDto,
  SepayPgCheckoutResponseDto,
  CreateSepayPgCheckoutDto,
} from './payments.dto';

const UNPAID_STATUSES = ['unpaid', 'failed'];

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly tenantSchemaService: TenantSchemaService,
    private readonly tenantService: TenantService,
    private readonly stripeService: StripeService,
    private readonly sepayService: SepayService,
    private readonly sepayPgService: SepayPgService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private normalizeStripeMetaId(value: string | null | undefined): string | undefined {
    if (value == null) return undefined;
    const s = String(value).trim();
    if (!s || s === 'null' || s === 'undefined') return undefined;
    return s;
  }

  /** Metadata from Checkout, else order linked by stripeCheckoutSessionId when checkout was created via API. */
  private async resolveStripeCheckoutContext(
    session: Stripe.Checkout.Session,
  ): Promise<{ restaurantId: string; orderId: string } | null> {
    const restaurantId = this.normalizeStripeMetaId(session.metadata?.restaurantId);
    const orderId = this.normalizeStripeMetaId(
      session.metadata?.orderId || session.client_reference_id,
    );
    if (restaurantId && orderId) {
      return { restaurantId, orderId };
    }

    const tenantIds = await this.tenantService.listActiveTenantIds();
    for (const tenantId of tenantIds) {
      const foundOrderId = await this.tenantSchemaService.runInTenant(
        tenantId,
        async (manager) => {
          await this.ensurePaymentColumns(manager);
          const order = await manager.getRepository(TenantOrder).findOne({
            where: { stripeCheckoutSessionId: session.id, deletedAt: IsNull() },
            select: ['id'],
          });
          return order?.id ?? null;
        },
      );
      if (foundOrderId) {
        this.logger.log(
          `Stripe session ${session.id} matched order ${foundOrderId} in tenant ${tenantId} (DB lookup)`,
        );
        return { restaurantId: tenantId, orderId: foundOrderId };
      }
    }
    return null;
  }

  private async ensurePaymentColumns(manager: EntityManager): Promise<void> {
    await manager.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS "paymentStatus" character varying(20) NOT NULL DEFAULT 'unpaid';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS "paymentMethod" character varying(30);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS "stripeCheckoutSessionId" character varying(255);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" character varying(255);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS "sepayTransactionId" character varying(64);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS "sepayReferenceCode" character varying(255);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP;
    `);
  }

  private async requireTenantStripe(restaurantId: string) {
    const tenant = await this.tenantService.findById(restaurantId);
    const stripe = getTenantStripeSettings(tenant);
    if (stripe.enabled !== true) {
      throw new ServiceUnavailableException(
        'Thanh toán Stripe chưa được bật cho nhà hàng này (Admin → Cài đặt → Stripe).',
      );
    }
    if (!this.stripeService.isEnabledForTenant(tenant)) {
      throw new ServiceUnavailableException(
        'Stripe chưa sẵn sàng: thiếu secret key hoặc cấu hình chưa đủ (Admin → Cài đặt → Stripe).',
      );
    }
    const config = this.stripeService.requireConfig(tenant);
    return { tenant, config };
  }

  async createCheckoutSession(
    orderId: string,
    restaurantId: string,
    returnTo?: string,
    frontendOrigin?: string,
  ): Promise<CheckoutSessionResponseDto> {
    const { config } = await this.requireTenantStripe(restaurantId);

    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      await this.ensurePaymentColumns(manager);
      const orderRepo = manager.getRepository(TenantOrder);
      const order = await orderRepo.findOne({
        where: { id: orderId, deletedAt: IsNull() },
        relations: ['orderItems'],
      });
      if (!order) {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }
      if (order.paymentStatus === 'paid') {
        throw new BadRequestException('Order is already paid');
      }
      if (order.status === OrderStatus.CANCELLED) {
        throw new BadRequestException('Cannot pay a cancelled order');
      }
      if (order.status === OrderStatus.COMPLETED) {
        throw new BadRequestException('Order is already completed');
      }

      const currency = config.currency;
      const amount = this.stripeService.toStripeAmount(Number(order.total));
      if ((order.orderItems || []).length === 0) {
        throw new BadRequestException(
          'Đơn hàng không có món. Không thể thanh toán thẻ.',
        );
      }
      this.stripeService.assertMeetsMinimumCharge(amount, currency);
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = (
        order.orderItems || []
      ).map((item: TenantOrderItem) => ({
        quantity: item.quantity,
        price_data: {
          currency,
          unit_amount: this.stripeService.toStripeAmount(Number(item.unitPrice)),
          product_data: {
            name: item.productName,
          },
        },
      }));

      if (lineItems.length === 0) {
        lineItems.push({
          quantity: 1,
          price_data: {
            currency,
            unit_amount: amount,
            product_data: {
              name: `Order ${order.orderNumber}`,
            },
          },
        });
      }

      const session = await this.stripeService.createCheckoutSession(config, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        restaurantId,
        amount,
        lineItems,
        tableNumber: order.tableNumber ?? undefined,
        returnTo,
        frontendOrigin,
      });

      if (!session.url) {
        throw new BadRequestException('Failed to create Stripe checkout session');
      }

      order.paymentStatus = 'processing';
      order.paymentMethod = 'stripe';
      order.stripeCheckoutSessionId = session.id;
      await orderRepo.save(order);

      this.logger.log(
        `Stripe Checkout ${session.id} created for order ${order.id} (tenant ${restaurantId})`,
      );

      return {
        sessionId: session.id,
        url: session.url,
      };
    });
  }

  async getPaymentStatus(
    orderId: string,
    restaurantId: string,
  ): Promise<PaymentStatusResponseDto> {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      await this.ensurePaymentColumns(manager);
      const orderRepo = manager.getRepository(TenantOrder);
      const order = await orderRepo.findOne({
        where: { id: orderId, deletedAt: IsNull() },
      });
      if (!order) {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }
      return {
        orderId: order.id,
        paymentStatus: order.paymentStatus || 'unpaid',
        paymentMethod: order.paymentMethod ?? undefined,
        paidAt: order.paidAt ?? undefined,
      };
    });
  }

  async syncCheckoutSession(
    sessionId: string,
    restaurantId: string,
  ): Promise<PaymentStatusResponseDto> {
    const { config } = await this.requireTenantStripe(restaurantId);

    const session = await this.stripeService.retrieveSession(config, sessionId);
    const ctx = await this.resolveStripeCheckoutContext(session);
    if (!ctx) {
      throw new BadRequestException('Invalid checkout session');
    }
    if (ctx.restaurantId !== restaurantId) {
      throw new BadRequestException('Session does not belong to this restaurant');
    }

    const stripePaid = session.payment_status === 'paid';
    if (stripePaid) {
      const linked = await this.tenantSchemaService.runInTenant(
        ctx.restaurantId,
        async (manager) => {
          await this.ensurePaymentColumns(manager);
          const order = await manager.getRepository(TenantOrder).findOne({
            where: { id: ctx.orderId, deletedAt: IsNull() },
            select: ['id', 'paymentStatus', 'stripeCheckoutSessionId'],
          });
          return (
            order != null &&
            order.stripeCheckoutSessionId === session.id &&
            order.paymentStatus !== 'paid'
          );
        },
      );
      if (linked) {
        const updated = await this.markOrderPaidFromStripe(session, ctx.restaurantId);
        if (updated) {
          this.logger.log(
            `syncCheckoutSession: order ${ctx.orderId} marked paid (session ${sessionId})`,
          );
        }
      }
    }

    const status = await this.getPaymentStatus(ctx.orderId, ctx.restaurantId);
    return {
      ...status,
      checkoutPaidOnStripe: stripePaid && status.paymentStatus !== 'paid',
    };
  }

  private async verifyTenantWebhookEvent(
    restaurantId: string,
    payload: Buffer,
    signature: string,
  ): Promise<{ event: Stripe.Event; config: ResolvedStripeConfig }> {
    const tenant = await this.tenantService.findById(restaurantId);
    const config = resolveTenantWebhookConfig(tenant);
    if (!config) {
      throw new BadRequestException(
        'Stripe webhook not configured for this restaurant. Set secret key and webhook secret in Admin → Settings → Stripe, then register the webhook URL shown there.',
      );
    }
    try {
      const event = this.stripeService.constructWebhookEvent(config, payload, signature);
      return { event, config };
    } catch (err) {
      this.logger.error(
        `Stripe webhook signature failed for tenant ${restaurantId}. ` +
          'Ensure whsec_ matches the endpoint URL for this restaurant on Stripe Dashboard.',
      );
      throw err;
    }
  }

  async handleStripeWebhook(
    payload: Buffer,
    signature: string,
    restaurantId: string,
  ): Promise<void> {
    const { event } = await this.verifyTenantWebhookEvent(restaurantId, payload, signature);

    this.logger.log(`Stripe webhook received for tenant ${restaurantId}: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const metaRestaurantId = this.normalizeStripeMetaId(session.metadata?.restaurantId);
      if (metaRestaurantId && metaRestaurantId !== restaurantId) {
        this.logger.warn(
          `checkout.session.completed: URL tenant ${restaurantId} != metadata restaurantId ${metaRestaurantId}`,
        );
        throw new BadRequestException('Checkout session does not belong to this restaurant');
      }
      const updated = await this.markOrderPaidFromStripe(session, restaurantId);
      if (!updated) {
        this.logger.warn(
          `checkout.session.completed: order not updated (metadata orderId=${session.metadata?.orderId ?? session.client_reference_id}, restaurantId=${session.metadata?.restaurantId}, payment_status=${session.payment_status})`,
        );
      }
      return;
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderRestaurantId =
        this.normalizeStripeMetaId(session.metadata?.restaurantId) || restaurantId;
      const orderId = session.metadata?.orderId;
      if (!orderId) return;
      if (orderRestaurantId !== restaurantId) {
        throw new BadRequestException('Checkout session does not belong to this restaurant');
      }
      await this.tenantSchemaService.runInTenant(orderRestaurantId, async (manager) => {
        await this.ensurePaymentColumns(manager);
        const orderRepo = manager.getRepository(TenantOrder);
        const order = await orderRepo.findOne({ where: { id: orderId, deletedAt: IsNull() } });
        if (!order || order.paymentStatus === 'paid') return;
        if (UNPAID_STATUSES.includes(order.paymentStatus) || order.paymentStatus === 'processing') {
          order.paymentStatus = 'unpaid';
          order.stripeCheckoutSessionId = null;
          await orderRepo.save(order);
        }
      });
    }
  }

  private async markOrderPaidFromStripe(
    session: Stripe.Checkout.Session,
    restaurantIdHint?: string,
  ): Promise<boolean> {
    const resolved = await this.resolveStripeCheckoutContext(session);
    if (!resolved) {
      this.logger.warn(
        'markOrderPaidFromStripe: cannot resolve order (no metadata and no order with this Checkout session id). ' +
          'Pay from the app (Thẻ / Stripe button), not `stripe trigger`, unless an order is in processing with this session id.',
      );
      return false;
    }
    if (restaurantIdHint && resolved.restaurantId !== restaurantIdHint) {
      this.logger.warn(
        `markOrderPaidFromStripe: tenant mismatch (hint ${restaurantIdHint}, resolved ${resolved.restaurantId})`,
      );
      return false;
    }

    const { restaurantId, orderId } = resolved;
    if (session.payment_status !== 'paid') {
      this.logger.warn(
        `markOrderPaidFromStripe: session ${session.id} payment_status=${session.payment_status}`,
      );
      return false;
    }

    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id;

    let saved = false;
    await this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      await this.ensurePaymentColumns(manager);
      const orderRepo = manager.getRepository(TenantOrder);
      const order = await orderRepo.findOne({
        where: { id: orderId, deletedAt: IsNull() },
        relations: ['orderItems'],
      });
      if (!order) {
        this.logger.warn(
          `markOrderPaidFromStripe: order ${orderId} not found in tenant ${restaurantId}`,
        );
        return;
      }
      if (order.paymentStatus === 'paid') {
        saved = true;
        return;
      }

      order.paymentStatus = 'paid';
      order.paymentMethod = 'stripe';
      order.stripeCheckoutSessionId = session.id;
      order.stripePaymentIntentId = paymentIntentId ?? null;
      order.paidAt = new Date();
      order.status = OrderStatus.COMPLETED;
      await orderRepo.save(order);
      saved = true;
      this.logger.log(
        `Order ${order.orderNumber} (${orderId}) marked paid via Stripe session ${session.id}`,
      );
    });

    if (saved) {
      await this.notificationsService.create(restaurantId, {
        type: 'order_completed',
        title: `Thanh toán thẻ tín dụng — đơn ${session.metadata?.orderNumber || orderId}`,
        message: 'Khách đã thanh toán online bằng thẻ tín dụng.',
        tableNumber: session.metadata?.tableNumber
          ? parseInt(session.metadata.tableNumber, 10) || null
          : null,
      });
    }

    return saved;
  }

  async getVietQrPayment(orderId: string, restaurantId: string): Promise<VietQrPaymentResponseDto> {
    const tenant = await this.tenantService.findById(restaurantId);
    if (!this.sepayService.isEnabledForTenant(tenant)) {
      throw new ServiceUnavailableException(
        'Thanh toán VietQR chưa được bật (Admin → Cài đặt → SePay).',
      );
    }

    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      await this.ensurePaymentColumns(manager);
      const order = await manager.getRepository(TenantOrder).findOne({
        where: { id: orderId, deletedAt: IsNull() },
      });
      if (!order) {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }
      if (order.paymentStatus === 'paid') {
        throw new BadRequestException('Order is already paid');
      }
      if (order.status === OrderStatus.CANCELLED) {
        throw new BadRequestException('Cannot pay a cancelled order');
      }

      const amount = Math.round(Number(order.total));
      const qr = this.sepayService.buildQrForOrder(tenant, order.orderNumber, amount);

      if (order.paymentStatus !== 'paid') {
        order.paymentStatus = 'processing';
        order.paymentMethod = 'vietqr';
        await manager.getRepository(TenantOrder).save(order);
      }

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: qr.amount,
        transferContent: qr.transferContent,
        qrImageUrl: qr.qrImageUrl,
        paymentStatus: order.paymentStatus || 'unpaid',
      };
    });
  }

  async createSepayPgCheckout(
    orderId: string,
    restaurantId: string,
    frontendOrigin: string | undefined,
    paymentMethod?: 'BANK_TRANSFER' | 'NAPAS_BANK_TRANSFER',
  ): Promise<SepayPgCheckoutResponseDto> {
    const tenant = await this.tenantService.findById(restaurantId);
    if (!this.sepayPgService.isEnabledForTenant(tenant)) {
      throw new ServiceUnavailableException(
        'SePay PG chưa bật (Admin → Cài đặt → SePay → Cổng thanh toán).',
      );
    }
    const origin = frontendOrigin?.trim();
    if (!origin) {
      throw new BadRequestException('frontendOrigin is required for SePay PG checkout');
    }

    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      await this.ensurePaymentColumns(manager);
      const order = await manager.getRepository(TenantOrder).findOne({
        where: { id: orderId, deletedAt: IsNull() },
      });
      if (!order) {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }
      if (order.paymentStatus === 'paid') {
        throw new BadRequestException('Order is already paid');
      }
      if (order.status === OrderStatus.CANCELLED) {
        throw new BadRequestException('Cannot pay a cancelled order');
      }

      const amount = Math.round(Number(order.total));
      const checkout = this.sepayPgService.buildCheckoutForOrder({
        tenant,
        orderNumber: order.orderNumber,
        amount,
        frontendOrigin: origin,
        orderId: order.id,
        restaurantId,
        paymentMethod,
      });

      if (order.paymentStatus !== 'paid') {
        order.paymentStatus = 'processing';
        order.paymentMethod = 'sepay_pg';
        await manager.getRepository(TenantOrder).save(order);
      }

      return {
        orderId: order.id,
        checkoutUrl: checkout.checkoutUrl,
        formFields: checkout.formFields,
      };
    });
  }

  async handleSepayPgIpn(restaurantId: string, body: Record<string, unknown>): Promise<void> {
    const tenant = await this.tenantService.findById(restaurantId);
    if (!this.sepayPgService.isEnabledForTenant(tenant)) {
      this.logger.warn(`SePay PG IPN ignored: PG disabled for tenant ${restaurantId}`);
      return;
    }

    const notificationType = String(body.notification_type ?? '');
    if (notificationType !== 'ORDER_PAID') {
      this.logger.log(`SePay PG IPN ignored: notification_type=${notificationType || 'n/a'}`);
      return;
    }

    const orderPayload = body.order as Record<string, unknown> | undefined;
    const invoiceNumber = String(orderPayload?.order_invoice_number ?? '').trim();
    if (!invoiceNumber) {
      this.logger.warn('SePay PG IPN ignored: missing order_invoice_number');
      return;
    }

    const txPayload = body.transaction as Record<string, unknown> | undefined;
    const txId = txPayload?.transaction_id != null ? String(txPayload.transaction_id) : '';
    const transferAmount = Number(orderPayload?.order_amount ?? txPayload?.transaction_amount);

    const matched = await this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      await this.ensurePaymentColumns(manager);
      const orderRepo = manager.getRepository(TenantOrder);
      const candidates = await orderRepo.find({
        where: { deletedAt: IsNull() },
        order: { createdAt: 'DESC' },
        take: 200,
      });

      const order = candidates.find((o) =>
        transferContentMatchesOrder(invoiceNumber, o.orderNumber),
      );
      if (!order) return null;
      if (order.paymentStatus === 'paid') {
        return { duplicate: true as const, order };
      }

      if (Number.isFinite(transferAmount) && transferAmount > 0) {
        const expectedAmount = Math.round(Number(order.total));
        if (Math.round(transferAmount) !== expectedAmount) {
          this.logger.warn(
            `SePay PG IPN amount mismatch for order ${order.orderNumber}: got ${transferAmount}, expected ${expectedAmount}`,
          );
          return null;
        }
      }

      order.paymentStatus = 'paid';
      order.paymentMethod = 'sepay_pg';
      order.status = OrderStatus.COMPLETED;
      order.paidAt = new Date();
      if (txId) order.sepayTransactionId = txId;
      await orderRepo.save(order);
      return { duplicate: false as const, order };
    });

    if (!matched) {
      this.logger.warn(
        `SePay PG IPN: no matching order for invoice="${invoiceNumber}" tenant=${restaurantId}`,
      );
      return;
    }

    if (!matched.duplicate) {
      this.logger.log(`Order ${matched.order.orderNumber} marked paid via SePay PG IPN`);
      await this.notificationsService.create(restaurantId, {
        type: 'order_completed',
        title: `Thanh toán SePay — đơn ${matched.order.orderNumber}`,
        message: 'Khách đã thanh toán qua cổng SePay.',
        tableNumber: matched.order.tableNumber ?? null,
      });
    }
  }

  /** Tìm đơn chưa paid theo core mã đơn trong content/code (không chỉ 200 đơn gần nhất). */
  private async findSepayWebhookOrderCandidates(
    orderRepo: Repository<TenantOrder>,
    matchTexts: string[],
  ): Promise<TenantOrder[]> {
    const cores = matchTexts
      .map((text) => extractOrderNumberCore(text))
      .filter((value): value is string => Boolean(value));

    const seen = new Set<string>();
    const results: TenantOrder[] = [];
    const pushUnique = (rows: TenantOrder[]) => {
      for (const row of rows) {
        if (!seen.has(row.id)) {
          seen.add(row.id);
          results.push(row);
        }
      }
    };

    for (const core of cores) {
      const digits = core.replace(/-/g, '');
      const rows = await orderRepo
        .createQueryBuilder('order')
        .where('order.deletedAt IS NULL')
        .andWhere('(order.paymentStatus IS NULL OR order.paymentStatus <> :paid)', { paid: 'paid' })
        .andWhere(
          `(REPLACE(order.orderNumber, '_', '') ILIKE :digits OR order.orderNumber ILIKE :fullCore)`,
          { digits: `%${digits}%`, fullCore: `%${core}%` },
        )
        .orderBy('order.createdAt', 'DESC')
        .take(20)
        .getMany();
      pushUnique(rows);
    }

    if (results.length > 0) {
      return results;
    }

    return orderRepo.find({
      where: { deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  async handleSepayWebhook(
    restaurantId: string,
    rawBody: Buffer,
    signatureHeader?: string,
    timestampHeader?: string,
  ): Promise<void> {
    const tenant = await this.tenantService.findById(restaurantId);
    if (!this.sepayService.isEnabledForTenant(tenant)) {
      this.logger.warn(`SePay webhook ignored: VietQR disabled for tenant ${restaurantId}`);
      return;
    }

    const sepaySettings = getTenantSepaySettings(tenant);
    const hasHmac = sepayWebhookHasHmacHeaders(signatureHeader, timestampHeader);

    if (sepaySettings.webhookSecret) {
      verifySepayWebhookSignature({
        rawBody,
        signatureHeader,
        timestampHeader,
        secret: sepaySettings.webhookSecret,
      });
    } else if (hasHmac) {
      throw new UnauthorizedException(
        'SePay sent HMAC headers but webhook secret is not configured. Set it in Admin → Settings → SePay.',
      );
    } else {
      this.logger.warn(
        `SePay webhook accepted without HMAC for tenant ${restaurantId}. Configure webhook secret in Admin → Settings → SePay.`,
      );
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>;
    } catch {
      throw new BadRequestException('Invalid SePay webhook JSON body');
    }

    const transferType = String(body.transferType ?? '').toLowerCase();
    if (transferType && transferType !== 'in') {
      this.logger.warn(`SePay webhook ignored: transferType=${transferType}`);
      return;
    }

    const transferAmount = Number(body.transferAmount);
    const sepayTxId = body.id != null ? String(body.id) : '';
    const referenceCode =
      typeof body.referenceCode === 'string' ? body.referenceCode : undefined;
    const matchTexts = collectSepayMatchTexts(body);

    if (matchTexts.length === 0 || !Number.isFinite(transferAmount) || transferAmount <= 0) {
      this.logger.warn('SePay webhook ignored: missing content/description/code or transferAmount');
      return;
    }

    const matched = await this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      await this.ensurePaymentColumns(manager);
      const orderRepo = manager.getRepository(TenantOrder);

      const candidates = await this.findSepayWebhookOrderCandidates(
        orderRepo,
        matchTexts,
      );

      const order = candidates.find(
        (o) =>
          o.paymentStatus !== 'paid' &&
          orderMatchesSepayWebhook(o.orderNumber, matchTexts),
      );
      if (!order) return null;

      const expectedAmount = Math.round(Number(order.total));
      const paidAmount = Math.round(transferAmount);
      if (paidAmount < expectedAmount) {
        this.logger.warn(
          `SePay webhook amount mismatch for order ${order.orderNumber}: got ${paidAmount}, expected >= ${expectedAmount}`,
        );
        return null;
      }

      if (sepayTxId && order.sepayTransactionId === sepayTxId) {
        this.logger.log(`SePay webhook duplicate tx ${sepayTxId} for order ${order.id}`);
        return { duplicate: true as const, order };
      }

      order.paymentStatus = 'paid';
      order.paymentMethod = 'vietqr';
      order.status = OrderStatus.COMPLETED;
      order.paidAt = new Date();
      if (sepayTxId) order.sepayTransactionId = sepayTxId;
      if (referenceCode) order.sepayReferenceCode = referenceCode;
      await orderRepo.save(order);
      return { duplicate: false as const, order };
    });

    if (!matched) {
      this.logger.warn(
        `SePay webhook: no matching unpaid order for texts=[${matchTexts.join(' | ')}] tenant=${restaurantId}`,
      );
      return;
    }

    if (!matched.duplicate) {
      this.logger.log(
        `Order ${matched.order.orderNumber} marked paid via SePay (tx ${sepayTxId || 'n/a'})`,
      );
      await this.notificationsService.create(restaurantId, {
        type: 'order_completed',
        title: `Thanh toán VietQR — đơn ${matched.order.orderNumber}`,
        message: 'Khách đã chuyển khoản qua mã QR SePay.',
        tableNumber: matched.order.tableNumber ?? null,
      });
    }
  }
}
