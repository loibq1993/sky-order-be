import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { EntityManager, IsNull } from 'typeorm';
import Stripe from 'stripe';
import { TenantOrder } from '../entities/tenant/tenant-order.entity';
import { TenantOrderItem } from '../entities/tenant/tenant-order-item.entity';
import { TenantSchemaService } from '../tenant/tenant-schema.service';
import { OrderStatus } from '../orders/orders.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { StripeService } from './stripe.service';
import {
  CheckoutSessionResponseDto,
  PaymentStatusResponseDto,
} from './payments.dto';

const UNPAID_STATUSES = ['unpaid', 'failed'];

@Injectable()
export class PaymentsService {
  constructor(
    private readonly tenantSchemaService: TenantSchemaService,
    private readonly stripeService: StripeService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async ensurePaymentColumns(manager: EntityManager): Promise<void> {
    await manager.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS "paymentStatus" character varying(20) NOT NULL DEFAULT 'unpaid';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS "paymentMethod" character varying(30);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS "stripeCheckoutSessionId" character varying(255);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" character varying(255);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP;
    `);
  }

  async createCheckoutSession(
    orderId: string,
    restaurantId: string,
  ): Promise<CheckoutSessionResponseDto> {
    if (!this.stripeService.isConfigured()) {
      throw new ServiceUnavailableException('Stripe payments are not enabled');
    }

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

      const currency = this.stripeService.getCurrency();
      const amount = this.stripeService.toStripeAmount(Number(order.total));
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

      const session = await this.stripeService.createCheckoutSession({
        orderId: order.id,
        orderNumber: order.orderNumber,
        restaurantId,
        amount,
        lineItems,
        tableNumber: order.tableNumber ?? undefined,
      });

      if (!session.url) {
        throw new BadRequestException('Failed to create Stripe checkout session');
      }

      order.paymentStatus = 'processing';
      order.paymentMethod = 'stripe';
      order.stripeCheckoutSessionId = session.id;
      await orderRepo.save(order);

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
    if (!this.stripeService.isConfigured()) {
      throw new ServiceUnavailableException('Stripe payments are not enabled');
    }

    const session = await this.stripeService.retrieveSession(sessionId);
    const metaRestaurantId = session.metadata?.restaurantId;
    if (metaRestaurantId && metaRestaurantId !== restaurantId) {
      throw new BadRequestException('Session does not belong to this restaurant');
    }

    const orderId = session.metadata?.orderId || session.client_reference_id;
    if (!orderId) {
      throw new BadRequestException('Invalid checkout session');
    }

    if (session.payment_status === 'paid') {
      await this.markOrderPaidFromStripe(session, restaurantId);
    }

    return this.getPaymentStatus(orderId, restaurantId);
  }

  async handleStripeWebhook(payload: Buffer, signature: string): Promise<void> {
    const event = this.stripeService.constructWebhookEvent(payload, signature);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      await this.markOrderPaidFromStripe(session);
      return;
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
      const restaurantId = session.metadata?.restaurantId;
      const orderId = session.metadata?.orderId;
      if (!restaurantId || !orderId) return;
      await this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
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
    restaurantIdOverride?: string,
  ): Promise<void> {
    const restaurantId = restaurantIdOverride || session.metadata?.restaurantId;
    const orderId = session.metadata?.orderId || session.client_reference_id;
    if (!restaurantId || !orderId) return;
    if (session.payment_status !== 'paid') return;

    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id;

    await this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      await this.ensurePaymentColumns(manager);
      const orderRepo = manager.getRepository(TenantOrder);
      const order = await orderRepo.findOne({
        where: { id: orderId, deletedAt: IsNull() },
        relations: ['orderItems'],
      });
      if (!order) return;
      if (order.paymentStatus === 'paid') return;

      order.paymentStatus = 'paid';
      order.paymentMethod = 'stripe';
      order.stripeCheckoutSessionId = session.id;
      order.stripePaymentIntentId = paymentIntentId ?? null;
      order.paidAt = new Date();
      order.status = OrderStatus.COMPLETED;
      await orderRepo.save(order);
    });

    await this.notificationsService.create(restaurantId, {
      type: 'order_completed',
      title: `Thanh toán Stripe — đơn ${session.metadata?.orderNumber || orderId}`,
      message: 'Khách đã thanh toán online qua Stripe.',
      tableNumber: session.metadata?.tableNumber
        ? parseInt(session.metadata.tableNumber, 10) || null
        : null,
    });
  }
}
