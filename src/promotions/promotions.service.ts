import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EntityManager, IsNull } from 'typeorm';
import { TenantProductPromotion } from '../entities/tenant/tenant-product-promotion.entity';
import { TenantProduct } from '../entities/tenant/tenant-product.entity';
import { TenantCategory } from '../entities/tenant/tenant-category.entity';
import { TenantSchemaService } from '../tenant/tenant-schema.service';
import {
  CreatePromotionDto,
  UpdatePromotionDto,
  PromotionResponseDto,
} from './promotions.dto';
import {
  pickBestPromotion,
  ResolvedPromotion,
} from './promotion-pricing';
import {
  isHappyHourActive,
  formatHappyHourWindow,
  parseTimeHHmm,
} from './promotion-schedule';
import {
  pickBuyXGetYPromo,
  calcFreeQuantityFromBuyXGetY,
  buildBuyXGetYLabel,
  BuyXGetYOffer,
} from './buy-x-get-y';
import { PromotionType } from '../entities/tenant/tenant-product-promotion.entity';

export interface OrderLineForPromotion {
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
}

@Injectable()
export class PromotionsService {
  constructor(private readonly tenantSchemaService: TenantSchemaService) {}

  async ensurePromotionsTable(manager: EntityManager): Promise<void> {
    await manager.query(`
      CREATE TABLE IF NOT EXISTS product_promotions (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        name character varying(200) NOT NULL,
        scope character varying(20) NOT NULL DEFAULT 'product',
        "promotionType" character varying(20) NOT NULL DEFAULT 'standard',
        "timeStart" character varying(5),
        "timeEnd" character varying(5),
        "daysOfWeek" character varying(30),
        "buyQuantity" integer,
        "getQuantity" integer,
        "rewardProductId" uuid,
        "productId" uuid,
        "categoryId" uuid,
        "discountMode" character varying(20) NOT NULL DEFAULT 'percentage',
        "discountValue" numeric(10,2) NOT NULL,
        "maxDiscountAmount" numeric(10,2),
        "validFrom" TIMESTAMP NOT NULL,
        "validUntil" TIMESTAMP NOT NULL,
        priority integer NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        PRIMARY KEY (id)
      )
    `);
    await this.ensureAdvancedPromotionColumns(manager);
  }

  async ensureAdvancedPromotionColumns(manager: EntityManager): Promise<void> {
    await manager.query(`
      ALTER TABLE product_promotions ADD COLUMN IF NOT EXISTS "promotionType" character varying(20) NOT NULL DEFAULT 'standard';
      ALTER TABLE product_promotions ADD COLUMN IF NOT EXISTS "timeStart" character varying(5);
      ALTER TABLE product_promotions ADD COLUMN IF NOT EXISTS "timeEnd" character varying(5);
      ALTER TABLE product_promotions ADD COLUMN IF NOT EXISTS "daysOfWeek" character varying(30);
      ALTER TABLE product_promotions ADD COLUMN IF NOT EXISTS "buyQuantity" integer;
      ALTER TABLE product_promotions ADD COLUMN IF NOT EXISTS "getQuantity" integer;
      ALTER TABLE product_promotions ADD COLUMN IF NOT EXISTS "rewardProductId" uuid;
    `);
  }

  async ensureOrderItemPromotionColumns(manager: EntityManager): Promise<void> {
    await manager.query(`
      ALTER TABLE order_items ADD COLUMN IF NOT EXISTS "originalUnitPrice" numeric(10,2);
      ALTER TABLE order_items ADD COLUMN IF NOT EXISTS "promotionId" uuid;
      ALTER TABLE order_items ADD COLUMN IF NOT EXISTS "promotionDiscount" numeric(10,2) NOT NULL DEFAULT 0;
    `);
  }

  private getPromotionStatus(
    promo: TenantProductPromotion,
    now = new Date(),
  ): 'upcoming' | 'active' | 'expired' {
    if (now < new Date(promo.validFrom)) return 'upcoming';
    if (now > new Date(promo.validUntil)) return 'expired';
    return 'active';
  }

  private validatePromotionDto(
    dto: CreatePromotionDto | UpdatePromotionDto,
    existing?: TenantProductPromotion,
  ): void {
    const scope = dto.scope ?? existing?.scope ?? 'product';
    const productId =
      dto.productId !== undefined ? dto.productId : existing?.productId;
    const categoryId =
      dto.categoryId !== undefined ? dto.categoryId : existing?.categoryId;
    const promotionType: PromotionType =
      dto.promotionType ?? existing?.promotionType ?? 'standard';

    if (scope === 'product' && !productId) {
      throw new BadRequestException('productId is required for product scope');
    }
    if (scope === 'category' && !categoryId) {
      throw new BadRequestException('categoryId is required for category scope');
    }

    if (promotionType === 'happy_hour') {
      const timeStart = dto.timeStart ?? existing?.timeStart;
      const timeEnd = dto.timeEnd ?? existing?.timeEnd;
      if (!timeStart || !timeEnd) {
        throw new BadRequestException('Happy hour requires timeStart and timeEnd (HH:mm)');
      }
      if (parseTimeHHmm(timeStart) < 0 || parseTimeHHmm(timeEnd) < 0) {
        throw new BadRequestException('timeStart/timeEnd must be HH:mm (e.g. 17:00)');
      }
    }

    if (promotionType === 'buy_x_get_y') {
      const buy = dto.buyQuantity ?? existing?.buyQuantity;
      const get = dto.getQuantity ?? existing?.getQuantity;
      if (!buy || buy < 1 || !get || get < 1) {
        throw new BadRequestException('buy_x_get_y requires buyQuantity and getQuantity >= 1');
      }
    }

    if (promotionType !== 'buy_x_get_y') {
      const mode = dto.discountMode ?? existing?.discountMode ?? 'percentage';
      const value =
        dto.discountValue !== undefined
          ? Number(dto.discountValue)
          : Number(existing?.discountValue ?? 0);

      if (mode === 'percentage' && (value <= 0 || value > 100)) {
        throw new BadRequestException('Percentage must be between 0 and 100');
      }
      if (mode !== 'percentage' && value <= 0) {
        throw new BadRequestException('discountValue must be greater than 0');
      }
    }

    const validFrom =
      dto.validFrom !== undefined
        ? new Date(dto.validFrom)
        : existing?.validFrom;
    const validUntil =
      dto.validUntil !== undefined
        ? new Date(dto.validUntil)
        : existing?.validUntil;

    if (validFrom && validUntil && validFrom >= validUntil) {
      throw new BadRequestException('validFrom must be before validUntil');
    }
  }

  private async mapToResponse(
    manager: EntityManager,
    promo: TenantProductPromotion,
  ): Promise<PromotionResponseDto> {
    let productName: string | null = null;
    let categoryName: string | null = null;
    let rewardProductName: string | null = null;

    if (promo.rewardProductId) {
      const reward = await manager.getRepository(TenantProduct).findOne({
        where: { id: promo.rewardProductId, deletedAt: IsNull() },
      });
      rewardProductName = reward?.name ?? null;
    }

    if (promo.productId) {
      const product = await manager.getRepository(TenantProduct).findOne({
        where: { id: promo.productId, deletedAt: IsNull() },
      });
      productName = product?.name ?? null;
    }
    if (promo.categoryId) {
      const category = await manager.getRepository(TenantCategory).findOne({
        where: { id: promo.categoryId, deletedAt: IsNull() },
      });
      categoryName = category?.name ?? null;
    }

    const promotionType = promo.promotionType ?? 'standard';
    return {
      id: promo.id,
      name: promo.name,
      scope: promo.scope,
      promotionType,
      timeStart: promo.timeStart,
      timeEnd: promo.timeEnd,
      daysOfWeek: promo.daysOfWeek,
      buyQuantity: promo.buyQuantity,
      getQuantity: promo.getQuantity,
      rewardProductId: promo.rewardProductId,
      rewardProductName,
      scheduleLabel:
        promotionType === 'happy_hour' ? formatHappyHourWindow(promo) : null,
      productId: promo.productId,
      categoryId: promo.categoryId,
      productName,
      categoryName,
      discountMode: promo.discountMode,
      discountValue: Number(promo.discountValue),
      maxDiscountAmount:
        promo.maxDiscountAmount != null
          ? Number(promo.maxDiscountAmount)
          : null,
      validFrom: promo.validFrom,
      validUntil: promo.validUntil,
      priority: promo.priority,
      isActive: promo.isActive,
      status: this.getPromotionStatus(promo),
      createdAt: promo.createdAt,
      updatedAt: promo.updatedAt,
    };
  }

  async getActivePromotions(manager: EntityManager): Promise<TenantProductPromotion[]> {
    await this.ensurePromotionsTable(manager);
    const now = new Date();
    const repo = manager.getRepository(TenantProductPromotion);
    const promos = await repo.find({
      where: { isActive: true, deletedAt: IsNull() },
      order: { priority: 'DESC', createdAt: 'DESC' },
    });
    return promos.filter(
      (p) => now >= new Date(p.validFrom) && now <= new Date(p.validUntil),
    );
  }

  resolveForProduct(
    product: TenantProduct,
    activePromos: TenantProductPromotion[],
    now = new Date(),
  ): ResolvedPromotion | null {
    const matching = activePromos.filter((p) => {
      const type = p.promotionType ?? 'standard';
      if (type === 'buy_x_get_y') return false;
      if (p.scope === 'product') return p.productId === product.id;
      if (p.scope === 'category') {
        return product.categoryId != null && p.categoryId === product.categoryId;
      }
      return false;
    });
    return pickBestPromotion(Number(product.price), matching, now);
  }

  resolveBuyOfferForProduct(
    product: TenantProduct,
    activePromos: TenantProductPromotion[],
  ): BuyXGetYOffer | null {
    const promo = pickBuyXGetYPromo(product, activePromos);
    if (!promo || promo.buyQuantity == null || promo.getQuantity == null) {
      return null;
    }
    return {
      promotionId: promo.id,
      promotionName: promo.name,
      buyQuantity: promo.buyQuantity,
      getQuantity: promo.getQuantity,
      label: buildBuyXGetYLabel(promo.buyQuantity, promo.getQuantity),
    };
  }

  async applyBuyXGetYToOrderLines(
    manager: EntityManager,
    orderLines: OrderLineForPromotion[],
  ): Promise<OrderLineForPromotion[]> {
    const activePromos = await this.getActivePromotions(manager);
    const bxgyPromos = activePromos.filter((p) => p.promotionType === 'buy_x_get_y');
    if (!bxgyPromos.length) return [...orderLines];

    const productRepo = manager.getRepository(TenantProduct);
    const paidQtyByProduct = new Map<string, number>();

    for (const line of orderLines) {
      if (line.comboId) continue;
      if (line.productName.startsWith('[KM:') || line.productName.startsWith('[Tặng]')) {
        continue;
      }
      paidQtyByProduct.set(
        line.productId,
        (paidQtyByProduct.get(line.productId) ?? 0) + line.quantity,
      );
    }

    const extra: OrderLineForPromotion[] = [];

    for (const [productId, totalQty] of paidQtyByProduct) {
      const product = await productRepo.findOne({
        where: { id: productId, deletedAt: IsNull(), available: true },
      });
      if (!product) continue;

      const promo = pickBuyXGetYPromo(product, bxgyPromos);
      if (!promo?.buyQuantity || !promo.getQuantity) continue;

      const freeQty = calcFreeQuantityFromBuyXGetY(
        totalQty,
        promo.buyQuantity,
        promo.getQuantity,
      );
      if (freeQty <= 0) continue;

      const rewardId = promo.rewardProductId ?? product.id;
      const rewardProduct =
        rewardId === product.id
          ? product
          : await productRepo.findOne({
              where: { id: rewardId, deletedAt: IsNull(), available: true },
            });
      if (!rewardProduct) {
        throw new BadRequestException('Món tặng trong khuyến mãi không còn khả dụng');
      }

      const listPrice = Number(rewardProduct.price);
      extra.push({
        productId: rewardProduct.id,
        productName: `[KM: ${promo.name}] ${rewardProduct.name}`,
        quantity: freeQty,
        unitPrice: 0,
        originalUnitPrice: listPrice,
        promotionId: promo.id,
        promotionDiscount: listPrice,
        totalPrice: 0,
        specialInstructions: null,
        comboId: null,
      });
    }

    return [...orderLines, ...extra];
  }

  async resolveProductPrices(
    manager: EntityManager,
    products: TenantProduct[],
  ): Promise<Map<string, ResolvedPromotion>> {
    const activePromos = await this.getActivePromotions(manager);
    const map = new Map<string, ResolvedPromotion>();
    const now = new Date();
    for (const product of products) {
      const resolved = this.resolveForProduct(product, activePromos, now);
      if (resolved) map.set(product.id, resolved);
    }
    return map;
  }

  async resolveProductBuyOffers(
    manager: EntityManager,
    products: TenantProduct[],
  ): Promise<Map<string, BuyXGetYOffer>> {
    const activePromos = await this.getActivePromotions(manager);
    const map = new Map<string, BuyXGetYOffer>();
    for (const product of products) {
      const offer = this.resolveBuyOfferForProduct(product, activePromos);
      if (offer) map.set(product.id, offer);
    }
    return map;
  }

  async resolveUnitPrice(
    manager: EntityManager,
    product: TenantProduct,
  ): Promise<{
    unitPrice: number;
    originalUnitPrice: number;
    promotionId: string | null;
    promotionDiscount: number;
  }> {
    const map = await this.resolveProductPrices(manager, [product]);
    const resolved = map.get(product.id);
    const original = Number(product.price);
    if (!resolved) {
      return {
        unitPrice: original,
        originalUnitPrice: original,
        promotionId: null,
        promotionDiscount: 0,
      };
    }
    return {
      unitPrice: resolved.salePrice,
      originalUnitPrice: original,
      promotionId: resolved.promotionId,
      promotionDiscount: resolved.discountAmount,
    };
  }

  async create(
    dto: CreatePromotionDto,
    restaurantId: string,
  ): Promise<PromotionResponseDto> {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      await this.ensurePromotionsTable(manager);
      this.validatePromotionDto(dto);

      if (dto.scope === 'product' && dto.productId) {
        const product = await manager.getRepository(TenantProduct).findOne({
          where: { id: dto.productId, deletedAt: IsNull() },
        });
        if (!product) throw new BadRequestException('Product not found');
      }
      if (dto.scope === 'category' && dto.categoryId) {
        const category = await manager.getRepository(TenantCategory).findOne({
          where: { id: dto.categoryId, deletedAt: IsNull() },
        });
        if (!category) throw new BadRequestException('Category not found');
      }

      const repo = manager.getRepository(TenantProductPromotion);
      const promotionType = dto.promotionType ?? 'standard';
      if (dto.rewardProductId) {
        const reward = await manager.getRepository(TenantProduct).findOne({
          where: { id: dto.rewardProductId, deletedAt: IsNull() },
        });
        if (!reward) throw new BadRequestException('Reward product not found');
      }

      const promo = repo.create({
        name: dto.name,
        scope: dto.scope,
        promotionType,
        timeStart: promotionType === 'happy_hour' ? dto.timeStart ?? null : null,
        timeEnd: promotionType === 'happy_hour' ? dto.timeEnd ?? null : null,
        daysOfWeek:
          promotionType === 'happy_hour' ? dto.daysOfWeek?.trim() || null : null,
        buyQuantity:
          promotionType === 'buy_x_get_y' ? dto.buyQuantity ?? null : null,
        getQuantity:
          promotionType === 'buy_x_get_y' ? dto.getQuantity ?? null : null,
        rewardProductId:
          promotionType === 'buy_x_get_y' ? dto.rewardProductId ?? null : null,
        productId: dto.scope === 'product' ? dto.productId ?? null : null,
        categoryId: dto.scope === 'category' ? dto.categoryId ?? null : null,
        discountMode: dto.discountMode ?? 'percentage',
        discountValue:
          promotionType === 'buy_x_get_y' ? 0 : Number(dto.discountValue),
        maxDiscountAmount:
          dto.maxDiscountAmount != null ? Number(dto.maxDiscountAmount) : null,
        validFrom: new Date(dto.validFrom),
        validUntil: new Date(dto.validUntil),
        priority: dto.priority ?? 0,
        isActive: dto.isActive ?? true,
      });
      const saved = await repo.save(promo);
      return this.mapToResponse(manager, saved);
    });
  }

  async findAll(restaurantId: string): Promise<PromotionResponseDto[]> {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      await this.ensurePromotionsTable(manager);
      const repo = manager.getRepository(TenantProductPromotion);
      const promos = await repo.find({
        where: { deletedAt: IsNull() },
        order: { validFrom: 'DESC', priority: 'DESC' },
      });
      return Promise.all(promos.map((p) => this.mapToResponse(manager, p)));
    });
  }

  async findOne(id: string, restaurantId: string): Promise<PromotionResponseDto> {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      await this.ensurePromotionsTable(manager);
      const repo = manager.getRepository(TenantProductPromotion);
      const promo = await repo.findOne({ where: { id, deletedAt: IsNull() } });
      if (!promo) throw new NotFoundException(`Promotion ${id} not found`);
      return this.mapToResponse(manager, promo);
    });
  }

  async update(
    id: string,
    dto: UpdatePromotionDto,
    restaurantId: string,
  ): Promise<PromotionResponseDto> {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      await this.ensurePromotionsTable(manager);
      const repo = manager.getRepository(TenantProductPromotion);
      const promo = await repo.findOne({ where: { id, deletedAt: IsNull() } });
      if (!promo) throw new NotFoundException(`Promotion ${id} not found`);

      this.validatePromotionDto(dto, promo);

      if (dto.name !== undefined) promo.name = dto.name;
      if (dto.scope !== undefined) promo.scope = dto.scope;
      if (dto.promotionType !== undefined) promo.promotionType = dto.promotionType;
      if (dto.timeStart !== undefined) promo.timeStart = dto.timeStart;
      if (dto.timeEnd !== undefined) promo.timeEnd = dto.timeEnd;
      if (dto.daysOfWeek !== undefined) promo.daysOfWeek = dto.daysOfWeek;
      if (dto.buyQuantity !== undefined) promo.buyQuantity = dto.buyQuantity;
      if (dto.getQuantity !== undefined) promo.getQuantity = dto.getQuantity;
      if (dto.rewardProductId !== undefined) {
        if (dto.rewardProductId) {
          const reward = await manager.getRepository(TenantProduct).findOne({
            where: { id: dto.rewardProductId, deletedAt: IsNull() },
          });
          if (!reward) throw new BadRequestException('Reward product not found');
        }
        promo.rewardProductId = dto.rewardProductId;
      }
      const effectiveType = promo.promotionType ?? 'standard';
      if (effectiveType !== 'happy_hour') {
        promo.timeStart = null;
        promo.timeEnd = null;
        promo.daysOfWeek = null;
      }
      if (effectiveType !== 'buy_x_get_y') {
        promo.buyQuantity = null;
        promo.getQuantity = null;
        promo.rewardProductId = null;
      }
      if (dto.discountMode !== undefined) promo.discountMode = dto.discountMode;
      if (dto.discountValue !== undefined) {
        promo.discountValue = Number(dto.discountValue);
      }
      if (dto.maxDiscountAmount !== undefined) {
        promo.maxDiscountAmount =
          dto.maxDiscountAmount != null ? Number(dto.maxDiscountAmount) : null;
      }
      if (dto.validFrom !== undefined) promo.validFrom = new Date(dto.validFrom);
      if (dto.validUntil !== undefined) promo.validUntil = new Date(dto.validUntil);
      if (dto.priority !== undefined) promo.priority = dto.priority;
      if (dto.isActive !== undefined) promo.isActive = dto.isActive;

      const scope = promo.scope;
      if (dto.scope !== undefined || dto.productId !== undefined || dto.categoryId !== undefined) {
        if (scope === 'product') {
          const pid = dto.productId ?? promo.productId;
          if (!pid) throw new BadRequestException('productId is required');
          const product = await manager.getRepository(TenantProduct).findOne({
            where: { id: pid, deletedAt: IsNull() },
          });
          if (!product) throw new BadRequestException('Product not found');
          promo.productId = pid;
          promo.categoryId = null;
        } else {
          const cid = dto.categoryId ?? promo.categoryId;
          if (!cid) throw new BadRequestException('categoryId is required');
          const category = await manager.getRepository(TenantCategory).findOne({
            where: { id: cid, deletedAt: IsNull() },
          });
          if (!category) throw new BadRequestException('Category not found');
          promo.categoryId = cid;
          promo.productId = null;
        }
      }

      const saved = await repo.save(promo);
      return this.mapToResponse(manager, saved);
    });
  }

  async remove(id: string, restaurantId: string): Promise<{ message: string }> {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      await this.ensurePromotionsTable(manager);
      const repo = manager.getRepository(TenantProductPromotion);
      const promo = await repo.findOne({ where: { id, deletedAt: IsNull() } });
      if (!promo) throw new NotFoundException(`Promotion ${id} not found`);
      await repo.softDelete(id);
      return { message: 'Promotion deleted successfully' };
    });
  }

  async toggleActive(
    id: string,
    restaurantId: string,
  ): Promise<PromotionResponseDto> {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      await this.ensurePromotionsTable(manager);
      const repo = manager.getRepository(TenantProductPromotion);
      const promo = await repo.findOne({ where: { id, deletedAt: IsNull() } });
      if (!promo) throw new NotFoundException(`Promotion ${id} not found`);
      promo.isActive = !promo.isActive;
      const saved = await repo.save(promo);
      return this.mapToResponse(manager, saved);
    });
  }
}
