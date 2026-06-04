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

@Injectable()
export class PromotionsService {
  constructor(private readonly tenantSchemaService: TenantSchemaService) {}

  async ensurePromotionsTable(manager: EntityManager): Promise<void> {
    await manager.query(`
      CREATE TABLE IF NOT EXISTS product_promotions (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        name character varying(200) NOT NULL,
        scope character varying(20) NOT NULL DEFAULT 'product',
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

    if (scope === 'product' && !productId) {
      throw new BadRequestException('productId is required for product scope');
    }
    if (scope === 'category' && !categoryId) {
      throw new BadRequestException('categoryId is required for category scope');
    }

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

    return {
      id: promo.id,
      name: promo.name,
      scope: promo.scope,
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
  ): ResolvedPromotion | null {
    const matching = activePromos.filter((p) => {
      if (p.scope === 'product') return p.productId === product.id;
      if (p.scope === 'category') {
        return product.categoryId != null && p.categoryId === product.categoryId;
      }
      return false;
    });
    return pickBestPromotion(Number(product.price), matching);
  }

  async resolveProductPrices(
    manager: EntityManager,
    products: TenantProduct[],
  ): Promise<Map<string, ResolvedPromotion>> {
    const activePromos = await this.getActivePromotions(manager);
    const map = new Map<string, ResolvedPromotion>();
    for (const product of products) {
      const resolved = this.resolveForProduct(product, activePromos);
      if (resolved) map.set(product.id, resolved);
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
      const promo = repo.create({
        name: dto.name,
        scope: dto.scope,
        productId: dto.scope === 'product' ? dto.productId ?? null : null,
        categoryId: dto.scope === 'category' ? dto.categoryId ?? null : null,
        discountMode: dto.discountMode,
        discountValue: Number(dto.discountValue),
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
