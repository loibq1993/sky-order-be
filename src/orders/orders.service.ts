import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { IsNull, In, Brackets } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { TenantOrder } from '../entities/tenant/tenant-order.entity';
import { TenantOrderItem } from '../entities/tenant/tenant-order-item.entity';
import { TenantProduct } from '../entities/tenant/tenant-product.entity';
import { TenantTable } from '../entities/tenant/tenant-table.entity';
import { TenantSchemaService } from '../tenant/tenant-schema.service';
import { TenantService } from '../tenant/tenant.service';
import { NotificationsService } from '../notifications/notifications.service';
import { VouchersService } from '../vouchers/vouchers.service';
import { PromotionsService } from '../promotions/promotions.service';
import { CombosService } from '../combos/combos.service';
import {
  CreateOrderDto,
  UpdateOrderDto,
  OrderResponseDto,
  OrderItemResponseDto,
  OrderType,
  OrderStatus,
  PaymentMethod,
} from './orders.dto';
import { generateOrderNumber } from './order-number.util';
import { getTenantOrderNumberPrefix } from './order-settings.util';
import { isUnpaidOpenOrder } from './order-status.util';
import {
  getVietnamTodayDateString,
  isValidIsoDate,
  vietnamDayEndExclusive,
  vietnamDayStart,
} from './order-date.util';
import { CLOSED_PAYMENT_STATUSES } from './order-status.util';
import { EntityManager, SelectQueryBuilder } from 'typeorm';

export interface OrderSearchOptions {
  statuses?: OrderStatus[];
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
  orderNumber?: string;
  /** Đơn hôm nay + đơn cũ vẫn chưa thanh toán (màn admin Đơn hàng). */
  includeOpenUnpaid?: boolean;
  restaurantId?: string;
}

@Injectable()
export class OrdersService {
  constructor(
    private tenantSchemaService: TenantSchemaService,
    private tenantService: TenantService,
    private notificationsService: NotificationsService,
    private vouchersService: VouchersService,
    private promotionsService: PromotionsService,
    private combosService: CombosService,
  ) {}

  private async ensureOrderVoucherColumns(manager: EntityManager): Promise<void> {
    await manager.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS "voucherId" uuid;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS "voucherCode" character varying(50);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS "voucherDiscount" numeric(10,2) NOT NULL DEFAULT 0;
    `);
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

  /** Backfill columns on tenant schemas created before payment/voucher migrations. */
  private async ensureOrderSchemaColumns(manager: EntityManager): Promise<void> {
    await this.ensureOrderVoucherColumns(manager);
    await this.ensurePaymentColumns(manager);
    await this.promotionsService.ensureOrderItemPromotionColumns(manager);
    await this.combosService.ensureOrderItemComboIdColumn(manager);
  }

  async createOrder(createOrderDto: CreateOrderDto, restaurantId: string): Promise<OrderResponseDto> {
    const tenant = await this.tenantService.findById(restaurantId);
    const orderNumberPrefix = getTenantOrderNumberPrefix(tenant);

    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      await this.ensureOrderSchemaColumns(manager);
      const tableRepo = manager.getRepository(TenantTable);
      const orderRepo = manager.getRepository(TenantOrder);
      const orderItemRepo = manager.getRepository(TenantOrderItem);
      const productRepo = manager.getRepository(TenantProduct);

      let table: TenantTable | null = null;
      if (createOrderDto.tableId || createOrderDto.tableNumber) {
        if (createOrderDto.tableId) {
          table = await tableRepo.findOne({
            where: { id: createOrderDto.tableId, deletedAt: IsNull() },
          });
        } else if (createOrderDto.tableNumber) {
          table = await tableRepo.findOne({
            where: { tableNumber: createOrderDto.tableNumber, deletedAt: IsNull() },
          });
        }
        if ((createOrderDto.tableId || createOrderDto.tableNumber) && !table) {
          throw new BadRequestException('Table not found');
        }
        if (table) {
          const candidates = await orderRepo.find({
            where: { tableId: table.id, deletedAt: IsNull() },
            order: { createdAt: 'DESC' },
            take: 20,
          });
          const activeOrder = candidates.find((o) =>
            isUnpaidOpenOrder(o.status, o.paymentStatus),
          );
          if (activeOrder) {
            throw new BadRequestException(
              `Table ${table.tableNumber} already has an active order (Order #${activeOrder.orderNumber})`,
            );
          }
        }
      }

      const productItems = createOrderDto.items ?? [];
      const comboOrders = createOrderDto.combos ?? [];
      if (productItems.length === 0 && comboOrders.length === 0) {
        throw new BadRequestException('Order must include at least one item or combo');
      }

      if (
        createOrderDto.orderType === OrderType.DINE_IN &&
        !createOrderDto.tableId &&
        (createOrderDto.tableNumber == null ||
          !Number.isFinite(Number(createOrderDto.tableNumber)) ||
          Number(createOrderDto.tableNumber) < 1)
      ) {
        throw new BadRequestException(
          'Table number is required for dine-in orders. Open the menu via table QR or add ?table= to the URL.',
        );
      }

      let totalAmount = 0;
      const orderItems: Array<{
        productId: string;
        productName: string;
        quantity: number;
        unitPrice: number;
        originalUnitPrice: number;
        promotionId: string | null;
        promotionDiscount: number;
        totalPrice: number;
        specialInstructions: string | null;
        comboId: string | null;
      }> = [];

      for (const item of productItems) {
        const product = await productRepo.findOne({
          where: {
            id: item.productId,
            deletedAt: IsNull(),
            available: true,
            visible: true,
          },
        });
        if (!product) {
          throw new BadRequestException(`Product with ID ${item.productId} not found or unavailable`);
        }
        const pricing = await this.promotionsService.resolveUnitPrice(manager, product);
        const itemTotal = pricing.unitPrice * item.quantity;
        totalAmount += itemTotal;
        orderItems.push({
          productId: item.productId,
          productName: product.name,
          quantity: item.quantity,
          unitPrice: pricing.unitPrice,
          originalUnitPrice: pricing.originalUnitPrice,
          promotionId: pricing.promotionId,
          promotionDiscount: pricing.promotionDiscount,
          totalPrice: itemTotal,
          specialInstructions: item.notes || null,
          comboId: null,
        });
      }

      for (const comboOrder of comboOrders) {
        const expanded = await this.combosService.expandComboToOrderLines(
          manager,
          comboOrder.comboId,
          comboOrder.quantity,
        );
        for (const line of expanded) {
          totalAmount += line.totalPrice;
          orderItems.push({
            productId: line.productId,
            productName: line.productName,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            originalUnitPrice: line.originalUnitPrice,
            promotionId: line.promotionId,
            promotionDiscount: line.promotionDiscount,
            totalPrice: line.totalPrice,
            specialInstructions: null,
            comboId: line.comboId,
          });
        }
      }

      const linesWithBxgy = await this.promotionsService.applyBuyXGetYToOrderLines(
        manager,
        orderItems,
      );
      orderItems.length = 0;
      orderItems.push(...linesWithBxgy);
      totalAmount = orderItems.reduce((sum, line) => sum + line.totalPrice, 0);

      let voucherApplication: Awaited<
        ReturnType<VouchersService['applyForOrder']>
      > | null = null;
      if (createOrderDto.voucherCode?.trim()) {
        const cartItems = orderItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }));
        voucherApplication = await this.vouchersService.applyForOrder(
          manager,
          createOrderDto.voucherCode.trim(),
          cartItems,
        );
        if (voucherApplication.freeItem) {
          const alreadyInCart = orderItems.some(
            (i) => i.productId === voucherApplication!.freeItem!.productId,
          );
          if (!alreadyInCart) {
            orderItems.push({
              productId: voucherApplication.freeItem.productId,
              productName: `[Tặng] ${voucherApplication.freeItem.productName}`,
              quantity: voucherApplication.freeItem.quantity,
              unitPrice: 0,
              originalUnitPrice: 0,
              promotionId: null,
              promotionDiscount: 0,
              totalPrice: 0,
              specialInstructions: null,
              comboId: null,
            });
          }
        }
      }

      const subtotal = totalAmount;
      const voucherDiscount = voucherApplication?.discountAmount ?? 0;
      const orderTotal = voucherApplication?.finalTotal ?? totalAmount;

      const order = orderRepo.create({
        orderNumber: generateOrderNumber(orderNumberPrefix),
        status: OrderStatus.PENDING,
        orderType: createOrderDto.orderType as string,
        tableId: table?.id ?? null,
        tableNumber: table?.tableNumber ?? null,
        customerName: createOrderDto.customerName || '',
        customerPhone: createOrderDto.customerPhone ?? null,
        customerAddress: createOrderDto.customerAddress ?? null,
        notes: createOrderDto.notes ?? null,
        subtotal,
        tax: 0,
        deliveryFee: 0,
        total: orderTotal,
        voucherId: voucherApplication?.voucher.id ?? null,
        voucherCode: voucherApplication?.voucher.code ?? null,
        voucherDiscount,
      });
      const savedOrder = await orderRepo.save(order);

      if (voucherApplication) {
        await this.vouchersService.incrementUsage(manager, voucherApplication.voucher.id);
      }

      const savedOrderItems: TenantOrderItem[] = [];
      for (const item of orderItems) {
        const oi = orderItemRepo.create({
          orderId: savedOrder.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          originalUnitPrice: item.originalUnitPrice,
          promotionId: item.promotionId,
          promotionDiscount: item.promotionDiscount,
          totalPrice: item.totalPrice,
          specialInstructions: item.specialInstructions,
          comboId: item.comboId,
        });
        const saved = await orderItemRepo.save(oi);
        savedOrderItems.push(saved);
      }

      // Build response from saved entities (no extra query; findOne in new transaction may not see uncommitted data)
      (savedOrder as TenantOrder & { orderItems: TenantOrderItem[] }).orderItems = savedOrderItems;

      await this.notificationsService.create(restaurantId, {
        type: 'new_order',
        title: `Bàn ${savedOrder.tableNumber ?? '?'} vừa tạo đơn hàng mới`,
        message: `Đơn #${savedOrder.orderNumber}`,
        orderId: savedOrder.id,
        tableNumber: savedOrder.tableNumber,
      });

      return this.mapToResponseDto(savedOrder);
    });
  }

  async findOne(id: string, restaurantId?: string): Promise<OrderResponseDto> {
    if (!restaurantId) throw new NotFoundException('Order not found');
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      await this.ensureOrderSchemaColumns(manager);
      const repo = manager.getRepository(TenantOrder);
      const order = await repo.findOne({
        where: { id },
        relations: ['orderItems'],
      });
      if (!order) throw new NotFoundException(`Order with ID ${id} not found`);
      return this.mapToResponseDto(order);
    });
  }

  async findByOrderNumber(orderNumber: string, restaurantId?: string): Promise<OrderResponseDto> {
    if (!restaurantId) throw new NotFoundException('Order not found');
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      await this.ensureOrderSchemaColumns(manager);
      const repo = manager.getRepository(TenantOrder);
      const order = await repo.findOne({
        where: { orderNumber },
        relations: ['orderItems'],
      });
      if (!order) throw new NotFoundException(`Order with number ${orderNumber} not found`);
      return this.mapToResponseDto(order);
    });
  }

  async applyVoucherToOrder(
    id: string,
    voucherCode: string,
    restaurantId: string,
  ): Promise<OrderResponseDto> {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      await this.ensureOrderSchemaColumns(manager);
      const orderRepo = manager.getRepository(TenantOrder);
      const orderItemRepo = manager.getRepository(TenantOrderItem);
      const order = await orderRepo.findOne({ where: { id }, relations: ['orderItems'] });
      if (!order) throw new NotFoundException(`Order with ID ${id} not found`);

      if (!isUnpaidOpenOrder(order.status, order.paymentStatus)) {
        throw new BadRequestException(
          'Đơn đã thanh toán hoặc đã đóng — không thể áp dụng voucher.',
        );
      }
      if (order.voucherCode) {
        throw new BadRequestException('Đơn đã áp dụng voucher.');
      }

      const code = voucherCode.trim();
      if (!code) {
        throw new BadRequestException('Vui lòng nhập mã voucher');
      }

      const cartItems = (order.orderItems || [])
        .filter((item) => Number(item.unitPrice) > 0)
        .map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
        }));

      if (cartItems.length === 0) {
        throw new BadRequestException('Đơn không có món để áp dụng voucher');
      }

      const voucherApplication = await this.vouchersService.applyForOrder(
        manager,
        code,
        cartItems,
      );

      if (voucherApplication.freeItem) {
        const alreadyInOrder = (order.orderItems || []).some(
          (i) => i.productId === voucherApplication.freeItem!.productId,
        );
        if (!alreadyInOrder) {
          const freeItem = orderItemRepo.create({
            orderId: id,
            productId: voucherApplication.freeItem.productId,
            productName: `[Tặng] ${voucherApplication.freeItem.productName}`,
            quantity: voucherApplication.freeItem.quantity,
            unitPrice: 0,
            originalUnitPrice: 0,
            promotionId: null,
            promotionDiscount: 0,
            totalPrice: 0,
            specialInstructions: null,
            comboId: null,
          });
          await orderItemRepo.save(freeItem);
        }
      }

      order.voucherId = voucherApplication.voucher.id;
      order.voucherCode = voucherApplication.voucher.code;
      order.voucherDiscount = voucherApplication.discountAmount;
      order.total = voucherApplication.finalTotal;
      await orderRepo.save(order);

      await this.vouchersService.incrementUsage(manager, voucherApplication.voucher.id);

      const updated = await orderRepo.findOne({ where: { id }, relations: ['orderItems'] });
      if (!updated) throw new NotFoundException('Order not found after applying voucher');
      return this.mapToResponseDto(updated);
    });
  }

  async updateOrder(
    id: string,
    updateOrderDto: UpdateOrderDto,
    restaurantId: string,
  ): Promise<OrderResponseDto> {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      await this.ensureOrderSchemaColumns(manager);
      const orderRepo = manager.getRepository(TenantOrder);
      const orderItemRepo = manager.getRepository(TenantOrderItem);
      const productRepo = manager.getRepository(TenantProduct);
      const order = await orderRepo.findOne({ where: { id }, relations: ['orderItems'] });
      if (!order) throw new NotFoundException(`Order with ID ${id} not found`);

      if (updateOrderDto.additionalItems && updateOrderDto.additionalItems.length > 0) {
        if (!isUnpaidOpenOrder(order.status, order.paymentStatus)) {
          throw new BadRequestException(
            'Đơn đã thanh toán hoặc đã đóng — không thể thêm món. Vui lòng tạo đơn mới.',
          );
        }
        let additionalTotal = 0;
        for (const item of updateOrderDto.additionalItems) {
          const product = await productRepo.findOne({
            where: {
              id: item.productId,
              deletedAt: IsNull(),
              available: true,
              visible: true,
            },
          });
          if (!product) {
            throw new BadRequestException(`Product with ID ${item.productId} not found or unavailable`);
          }
          const pricing = await this.promotionsService.resolveUnitPrice(manager, product);
          const itemTotal = pricing.unitPrice * item.quantity;
          additionalTotal += itemTotal;
          const oi = orderItemRepo.create({
            orderId: id,
            productId: item.productId,
            productName: product.name,
            quantity: item.quantity,
            unitPrice: pricing.unitPrice,
            originalUnitPrice: pricing.originalUnitPrice,
            promotionId: pricing.promotionId,
            promotionDiscount: pricing.promotionDiscount,
            totalPrice: itemTotal,
            specialInstructions: item.notes || null,
          });
          await orderItemRepo.save(oi);
        }
        order.subtotal = Number(order.subtotal) + additionalTotal;
        order.total = Number(order.total) + additionalTotal;
        order.status = OrderStatus.PENDING;
        // Update only order row; do not save(order) or TypeORM will cascade UPDATE to order_items with orderId = undefined
        await orderRepo.update(id, {
          subtotal: order.subtotal,
          total: order.total,
          status: order.status,
        });
        await this.notificationsService.create(restaurantId, {
          type: 'order_updated',
          title: `Bàn ${order.tableNumber ?? '?'} đã thêm món vào đơn`,
          message: `Đơn #${order.orderNumber} – khách đặt thêm ${updateOrderDto.additionalItems.length} món`,
          orderId: id,
          tableNumber: order.tableNumber ?? undefined,
        });
      }

      if (updateOrderDto.status !== undefined) order.status = updateOrderDto.status;
      if (updateOrderDto.customerName !== undefined) order.customerName = updateOrderDto.customerName;
      if (updateOrderDto.customerPhone !== undefined) order.customerPhone = updateOrderDto.customerPhone;
      if (updateOrderDto.customerAddress !== undefined) order.customerAddress = updateOrderDto.customerAddress;
      if (updateOrderDto.notes !== undefined) order.notes = updateOrderDto.notes;
      if (updateOrderDto.estimatedDeliveryTime !== undefined)
        order.estimatedDeliveryTime = updateOrderDto.estimatedDeliveryTime;
      if (updateOrderDto.actualDeliveryTime !== undefined)
        order.actualDeliveryTime = updateOrderDto.actualDeliveryTime;
      // Save order without relations so TypeORM does not cascade UPDATE to order_items (which could set orderId = undefined)
      const orderToSave = await orderRepo.findOne({ where: { id } });
      if (!orderToSave) throw new NotFoundException(`Order with ID ${id} not found`);
      orderToSave.status = order.status;
      orderToSave.customerName = order.customerName;
      orderToSave.customerPhone = order.customerPhone;
      orderToSave.customerAddress = order.customerAddress;
      orderToSave.notes = order.notes;
      orderToSave.subtotal = order.subtotal;
      orderToSave.total = order.total;
      orderToSave.estimatedDeliveryTime = order.estimatedDeliveryTime;
      orderToSave.actualDeliveryTime = order.actualDeliveryTime;
      await orderRepo.save(orderToSave);

      const updated = await orderRepo.findOne({ where: { id }, relations: ['orderItems'] });
      if (!updated) throw new NotFoundException('Order not found after update');
      return this.mapToResponseDto(updated);
    });
  }

  async getActiveOrderByTable(
    tableId: string,
    restaurantId?: string,
  ): Promise<OrderResponseDto | null> {
    if (!restaurantId) return null;
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      await this.ensureOrderSchemaColumns(manager);
      const repo = manager.getRepository(TenantOrder);
      const orders = await repo
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.orderItems', 'orderItems')
        .where('order.tableId = :tableId', { tableId })
        .andWhere('order.deletedAt IS NULL')
        .andWhere('order.status NOT IN (:...closed)', {
          closed: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
        })
        .andWhere(
          '(order.paymentStatus IS NULL OR LOWER(order.paymentStatus) NOT IN (:...closedPay))',
          { closedPay: [...CLOSED_PAYMENT_STATUSES] },
        )
        .orderBy('order.createdAt', 'DESC')
        .getMany();
      const order = orders.find((o) => isUnpaidOpenOrder(o.status, o.paymentStatus));
      return order ? this.mapToResponseDto(order) : null;
    });
  }

  async getUnpaidOrdersByTable(
    tableId: string,
    restaurantId?: string,
  ): Promise<OrderResponseDto[]> {
    if (!restaurantId) return [];
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      await this.ensureOrderSchemaColumns(manager);
      const repo = manager.getRepository(TenantOrder);
      const orders = await repo
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.orderItems', 'orderItems')
        .where('order.tableId = :tableId', { tableId })
        .andWhere('order.deletedAt IS NULL')
        .andWhere('order.status NOT IN (:...closed)', {
          closed: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
        })
        .andWhere(
          '(order.paymentStatus IS NULL OR LOWER(order.paymentStatus) NOT IN (:...closedPay))',
          { closedPay: [...CLOSED_PAYMENT_STATUSES] },
        )
        .orderBy('order.createdAt', 'DESC')
        .getMany();
      return orders
        .filter((o) => isUnpaidOpenOrder(o.status, o.paymentStatus))
        .map((o) => this.mapToResponseDto(o));
    });
  }

  async getTotalOrdersCount(restaurantId?: string): Promise<number> {
    if (!restaurantId) return 0;
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantOrder);
      return repo.count({ where: { deletedAt: IsNull() } });
    });
  }

  async getOrdersCountByStatuses(
    statuses: OrderStatus[],
    restaurantId?: string,
    fromDate?: string,
    toDate?: string,
    includeOpenUnpaid?: boolean,
  ): Promise<number> {
    if (!restaurantId) return 0;
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      await this.ensureOrderSchemaColumns(manager);
      const qb = manager
        .getRepository(TenantOrder)
        .createQueryBuilder('order')
        .where('order.deletedAt IS NULL')
        .andWhere('order.status IN (:...statuses)', { statuses });
      this.applyOrderDateFilters(qb, fromDate, toDate, includeOpenUnpaid);
      return qb.getCount();
    });
  }

  async getTodayRevenue(restaurantId?: string): Promise<number> {
    if (!restaurantId) return 0;
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const repo = manager.getRepository(TenantOrder);
      const qb = repo
        .createQueryBuilder('order')
        .select('SUM(order.total)', 'total')
        .where('order.deletedAt IS NULL')
        .andWhere('order.paymentStatus = :paid', { paid: 'paid' })
        .andWhere('order.createdAt >= :today', { today });
      const result = await qb.getRawOne();
      return Number(result?.total ?? 0);
    });
  }

  async getRecentOrders(
    limit: number = 5,
    restaurantId?: string,
  ): Promise<OrderResponseDto[]> {
    if (!restaurantId) return [];
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      await this.ensureOrderSchemaColumns(manager);
      const repo = manager.getRepository(TenantOrder);
      const orders = await repo.find({
        where: { deletedAt: IsNull() },
        relations: ['orderItems'],
        order: { createdAt: 'DESC' },
        take: limit,
      });
      return orders.map((o) => this.mapToResponseDto(o));
    });
  }

  async getOrdersByMultipleStatuses(
    statuses: OrderStatus[],
    restaurantId?: string,
    options?: Omit<OrderSearchOptions, 'statuses' | 'restaurantId'>,
  ): Promise<OrderResponseDto[]> {
    return this.searchOrders({
      statuses,
      restaurantId,
      ...options,
    });
  }

  private applyOrderDateFilters(
    qb: SelectQueryBuilder<TenantOrder>,
    fromDate?: string,
    toDate?: string,
    includeOpenUnpaid?: boolean,
  ): void {
    const hasFrom = isValidIsoDate(fromDate);
    const hasTo = isValidIsoDate(toDate);

    if (includeOpenUnpaid && (hasFrom || hasTo)) {
      qb.andWhere(
        new Brackets((sub) => {
          if (hasFrom && hasTo) {
            sub.where(
              'order.createdAt >= :fromStart AND order.createdAt < :toEnd',
              {
                fromStart: vietnamDayStart(fromDate!.trim()),
                toEnd: vietnamDayEndExclusive(toDate!.trim()),
              },
            );
          } else if (hasFrom) {
            sub.where('order.createdAt >= :fromStart', {
              fromStart: vietnamDayStart(fromDate!.trim()),
            });
          } else if (hasTo) {
            sub.where('order.createdAt < :toEnd', {
              toEnd: vietnamDayEndExclusive(toDate!.trim()),
            });
          }
          sub.orWhere(
            `order.status NOT IN (:...closedStatuses)
             AND (order.paymentStatus IS NULL OR LOWER(order.paymentStatus) NOT IN (:...openPayment))`,
            {
              closedStatuses: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
              openPayment: [...CLOSED_PAYMENT_STATUSES],
            },
          );
        }),
      );
      return;
    }

    if (hasFrom) {
      qb.andWhere('order.createdAt >= :fromStart', {
        fromStart: vietnamDayStart(fromDate!.trim()),
      });
    }
    if (hasTo) {
      qb.andWhere('order.createdAt < :toEnd', {
        toEnd: vietnamDayEndExclusive(toDate!.trim()),
      });
    }
  }

  async searchOrders(options: OrderSearchOptions): Promise<OrderResponseDto[]> {
    const {
      restaurantId,
      statuses,
      fromDate,
      toDate,
      page,
      limit,
      orderNumber,
      includeOpenUnpaid,
    } = options;
    if (!restaurantId) return [];
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      await this.ensureOrderSchemaColumns(manager);
      const qb = manager
        .getRepository(TenantOrder)
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.orderItems', 'orderItems')
        .where('order.deletedAt IS NULL');

      if (statuses?.length) {
        qb.andWhere('order.status IN (:...statuses)', { statuses });
      }
      this.applyOrderDateFilters(qb, fromDate, toDate, includeOpenUnpaid);

      const q = orderNumber?.trim();
      if (q) {
        qb.andWhere('order.orderNumber ILIKE :orderNumberQ', {
          orderNumberQ: `%${q}%`,
        });
      }

      qb.orderBy('order.createdAt', 'DESC');

      if (limit && limit > 0) {
        const pageNum = page && page > 0 ? page : 1;
        qb.skip((pageNum - 1) * limit).take(limit);
      }

      const orders = await qb.getMany();
      return orders.map((o) => this.mapToResponseDto(o));
    });
  }

  /** Today (VN) — used by admin live orders screen. */
  getTodayDateString(): string {
    return getVietnamTodayDateString();
  }

  /**
   * Đóng ca: đơn tạo trước hôm nay (VN) còn mở & chưa thanh toán
   * → status completed, paymentStatus cancelled (không ghi nhận doanh thu).
   */
  async autoClosePreviousDayUnpaidOrders(): Promise<{ closedCount: number }> {
    const cutoff = vietnamDayStart(getVietnamTodayDateString());
    const tenants = await this.tenantService.listActiveTenants();
    let closedCount = 0;

    for (const tenant of tenants) {
      const n = await this.tenantSchemaService.runInTenant(tenant.id, async (manager) => {
        await this.ensureOrderSchemaColumns(manager);
        const repo = manager.getRepository(TenantOrder);
        const candidates = await repo
          .createQueryBuilder('order')
          .where('order.deletedAt IS NULL')
          .andWhere('order.createdAt < :cutoff', { cutoff })
          .andWhere('order.status NOT IN (:...closed)', {
            closed: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
          })
          .getMany();

        const stale = candidates.filter((o) =>
          isUnpaidOpenOrder(o.status, o.paymentStatus),
        );
        if (stale.length === 0) return 0;

        const now = new Date();
        for (const order of stale) {
          order.status = OrderStatus.COMPLETED;
          order.paymentStatus = 'cancelled';
          order.updatedAt = now;
        }
        await repo.save(stale);
        return stale.length;
      });
      closedCount += n;
    }

    return { closedCount };
  }

  private paymentMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      cash: 'tiền mặt',
      transfer: 'chuyển khoản',
      qr: 'QR',
      card: 'thẻ',
      stripe: 'thẻ tín dụng',
      vietqr: 'chuyển khoản QR',
      sepay_pg: 'SePay PG',
    };
    return labels[method] || method;
  }

  async updateOrderStatus(
    id: string,
    status: OrderStatus,
    restaurantId?: string,
    paymentMethod?: PaymentMethod,
  ): Promise<OrderResponseDto> {
    if (!restaurantId) throw new BadRequestException('restaurantId is required');
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      await this.ensureOrderSchemaColumns(manager);
      const repo = manager.getRepository(TenantOrder);
      const order = await repo.findOne({ where: { id } });
      if (!order) throw new NotFoundException(`Order with ID ${id} not found`);

      const wasCompleted = order.status === OrderStatus.COMPLETED;
      order.status = status as string;

      if (status === OrderStatus.COMPLETED) {
        if (order.paymentStatus !== 'paid') {
          order.paymentStatus = 'paid';
          order.paymentMethod = paymentMethod || PaymentMethod.CASH;
          order.paidAt = new Date();
        }
      }

      await repo.save(order);

      if (status === OrderStatus.COMPLETED && !wasCompleted) {
        const method = order.paymentMethod || paymentMethod || PaymentMethod.CASH;
        await this.notificationsService.create(restaurantId, {
          type: 'order_completed',
          title: `Thanh toán ${this.paymentMethodLabel(method)} — đơn ${order.orderNumber}`,
          message: `Đơn đã được xác nhận thanh toán tại quầy (${this.paymentMethodLabel(method)}).`,
          tableNumber: order.tableNumber ?? null,
        });
      }

      const updated = await repo.findOne({ where: { id }, relations: ['orderItems'] });
      if (!updated) throw new NotFoundException('Order not found');
      return this.mapToResponseDto(updated);
    });
  }

  private mapToResponseDto(order: TenantOrder): OrderResponseDto {
    const items = (order.orderItems || []).map((item: TenantOrderItem) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      price: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
      notes: item.specialInstructions ?? undefined,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      product: undefined,
    }));
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status as OrderStatus,
      orderType: order.orderType as OrderType,
      tableId: order.tableId ?? undefined,
      tableNumber: order.tableNumber ?? undefined,
      items,
      totalAmount: Number(order.total),
      subtotal: Number(order.subtotal),
      voucherDiscount: Number(order.voucherDiscount ?? 0),
      voucherCode: order.voucherCode ?? undefined,
      voucherName: undefined,
      customerName: order.customerName ?? undefined,
      customerPhone: order.customerPhone ?? undefined,
      customerAddress: order.customerAddress ?? undefined,
      notes: order.notes ?? undefined,
      specialInstructions: undefined,
      estimatedDeliveryTime: order.estimatedDeliveryTime ?? undefined,
      actualDeliveryTime: order.actualDeliveryTime ?? undefined,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      paymentStatus: order.paymentStatus ?? 'unpaid',
      paymentMethod: order.paymentMethod ?? undefined,
      paidAt: order.paidAt ?? undefined,
    };
  }
}
