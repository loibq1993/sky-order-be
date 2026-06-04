import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { IsNull } from 'typeorm';
import { TenantProduct } from '../entities/tenant/tenant-product.entity';
import { TenantCategory } from '../entities/tenant/tenant-category.entity';
import { TenantOrderItem } from '../entities/tenant/tenant-order-item.entity';
import { TenantSchemaService } from '../tenant/tenant-schema.service';
import { UploadService } from '../upload/upload.service';
import { PromotionsService } from '../promotions/promotions.service';
import { ResolvedPromotion } from '../promotions/promotion-pricing';
import { BuyXGetYOffer } from '../promotions/buy-x-get-y';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductResponseDto,
  ProductPromotionInfoDto,
} from './products.dto';

@Injectable()
export class ProductsService {
  constructor(
    private tenantSchemaService: TenantSchemaService,
    private uploadService: UploadService,
    private promotionsService: PromotionsService,
  ) {}

  async create(
    createProductDto: CreateProductDto,
    tempImageFilename?: string,
    restaurantId?: string,
  ): Promise<ProductResponseDto> {
    if (!restaurantId) throw new BadRequestException('restaurantId (tenant) is required');
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const catRepo = manager.getRepository(TenantCategory);
      const category = await catRepo.findOne({
        where: { id: createProductDto.categoryId!, deletedAt: IsNull() },
      });
      if (!category) {
        throw new BadRequestException(`Category with ID ${createProductDto.categoryId} not found`);
      }
      const repo = manager.getRepository(TenantProduct);
      const product = repo.create({
        ...createProductDto,
        category: category.name,
        categoryKo: category.nameKo,
        visible: createProductDto.visible ?? true,
        available: createProductDto.available ?? true,
      });
      const saved = await repo.save(product);
      if (tempImageFilename) {
        try {
          const filename = tempImageFilename.includes('/') ? tempImageFilename.split('/').pop()! : tempImageFilename;
          const moveResult = await this.uploadService.moveFromTemp(filename, 'products');
          saved.image = moveResult.url;
          await repo.save(saved);
        } catch (e) {
          console.error('Failed to move image:', e);
        }
      }
      return this.mapToResponseDto(saved);
    });
  }

  async findAll(restaurantId?: string): Promise<ProductResponseDto[]> {
    if (!restaurantId) return [];
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantProduct);
      const products = await repo.find({
        where: { deletedAt: IsNull(), available: true, visible: true },
        relations: ['categoryRelation'],
        order: { createdAt: 'ASC' },
      });
      const counts = await this.getOrderCounts(manager);
      return this.mapProductsWithPromotions(manager, products, counts);
    });
  }

  async findAllPaginated(
    page: number = 1,
    limit: number = 10,
    categoryId?: string,
    restaurantId?: string,
  ) {
    if (!restaurantId) {
      return { products: [], total: 0, page, limit, totalPages: 0 };
    }
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantProduct);
      const where: any = { deletedAt: IsNull(), available: true, visible: true };
      if (categoryId) where.categoryId = categoryId;
      const [products, total] = await repo.findAndCount({
        where,
        relations: ['categoryRelation'],
        order: { createdAt: 'ASC' },
        skip: (page - 1) * limit,
        take: limit,
      });
      const counts = await this.getOrderCounts(manager);
      const mapped = await this.mapProductsWithPromotions(manager, products, counts);
      return {
        products: mapped,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    });
  }

  async findByCategory(categoryId: string, restaurantId?: string): Promise<ProductResponseDto[]> {
    if (!restaurantId) return [];
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantProduct);
      const products = await repo.find({
        where: { categoryId, deletedAt: IsNull(), available: true, visible: true },
        relations: ['categoryRelation'],
        order: { createdAt: 'ASC' },
      });
      const counts = await this.getOrderCounts(manager);
      return this.mapProductsWithPromotions(manager, products, counts);
    });
  }

  async findByCategoryForAdmin(categoryId: string, restaurantId: string): Promise<ProductResponseDto[]> {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const catRepo = manager.getRepository(TenantCategory);
      const cat = await catRepo.findOne({ where: { id: categoryId, deletedAt: IsNull() } });
      if (!cat) throw new NotFoundException(`Category with ID ${categoryId} not found`);
      const repo = manager.getRepository(TenantProduct);
      const products = await repo.find({
        where: { categoryId, deletedAt: IsNull() },
        relations: ['categoryRelation'],
        order: { createdAt: 'ASC' },
      });
      return products.map((p) => this.mapToResponseDto(p));
    });
  }

  async findOne(id: string, restaurantId?: string): Promise<ProductResponseDto> {
    if (!restaurantId) throw new NotFoundException('Product not found');
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantProduct);
      const product = await repo.findOne({
        where: { id, deletedAt: IsNull() },
        relations: ['categoryRelation'],
      });
      if (!product) throw new NotFoundException(`Product with ID ${id} not found`);
      const [dto] = await this.mapProductsWithPromotions(manager, [product]);
      return dto;
    });
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    tempImageFilename?: string,
    restaurantId?: string,
  ): Promise<ProductResponseDto> {
    if (!restaurantId) throw new BadRequestException('restaurantId is required');
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantProduct);
      const catRepo = manager.getRepository(TenantCategory);
      const product = await repo.findOne({ where: { id, deletedAt: IsNull() }, relations: ['categoryRelation'] });
      if (!product) throw new NotFoundException(`Product with ID ${id} not found`);
      if (dto.categoryId && dto.categoryId !== product.categoryId) {
        const category = await catRepo.findOne({ where: { id: dto.categoryId, deletedAt: IsNull() } });
        if (!category) throw new BadRequestException(`Category with ID ${dto.categoryId} not found`);
        (dto as any).category = category.name;
        (dto as any).categoryKo = category.nameKo;
      }
      Object.assign(product, dto);
      const saved = await repo.save(product);
      if (tempImageFilename) {
        try {
          const filename = tempImageFilename.includes('/') ? tempImageFilename.split('/').pop()! : tempImageFilename;
          const moveResult = await this.uploadService.moveFromTemp(filename, 'products');
          saved.image = moveResult.url;
          await repo.save(saved);
        } catch (e) {
          console.error('Failed to move image:', e);
        }
      }
      return this.mapToResponseDto(saved);
    });
  }

  async remove(id: string, restaurantId?: string): Promise<{ message: string }> {
    if (!restaurantId) throw new BadRequestException('restaurantId is required');
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantProduct);
      const product = await repo.findOne({ where: { id, deletedAt: IsNull() } });
      if (!product) throw new NotFoundException(`Product with ID ${id} not found`);
      await repo.softDelete(id);
      return { message: 'Product deleted successfully' };
    });
  }

  async restore(id: string, restaurantId?: string): Promise<ProductResponseDto> {
    if (!restaurantId) throw new BadRequestException('restaurantId is required');
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantProduct);
      const product = await repo.findOne({ where: { id }, withDeleted: true });
      if (!product) throw new NotFoundException(`Product with ID ${id} not found`);
      await repo.restore(id);
      const restored = await repo.findOne({ where: { id }, relations: ['categoryRelation'] });
      if (!restored) throw new NotFoundException('Product not found after restore');
      return this.mapToResponseDto(restored);
    });
  }

  async hardDelete(id: string, restaurantId?: string): Promise<{ message: string }> {
    if (!restaurantId) throw new BadRequestException('restaurantId is required');
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantProduct);
      const product = await repo.findOne({ where: { id }, withDeleted: true });
      if (!product) throw new NotFoundException(`Product with ID ${id} not found`);
      await repo.delete(id);
      return { message: 'Product permanently deleted' };
    });
  }

  async updateSales(id: string, salesCount: number, restaurantId?: string): Promise<ProductResponseDto> {
    if (!restaurantId) throw new BadRequestException('restaurantId is required');
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantProduct);
      const product = await repo.findOne({ where: { id, deletedAt: IsNull() } });
      if (!product) throw new NotFoundException(`Product with ID ${id} not found`);
      product.sales = salesCount;
      const saved = await repo.save(product);
      return this.mapToResponseDto(saved);
    });
  }

  async incrementSales(id: string, increment: number = 1, restaurantId?: string): Promise<ProductResponseDto> {
    if (!restaurantId) throw new BadRequestException('restaurantId is required');
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantProduct);
      const product = await repo.findOne({ where: { id, deletedAt: IsNull() } });
      if (!product) throw new NotFoundException(`Product with ID ${id} not found`);
      product.sales += increment;
      const saved = await repo.save(product);
      return this.mapToResponseDto(saved);
    });
  }

  async search(query: string, restaurantId?: string): Promise<ProductResponseDto[]> {
    if (!restaurantId) return [];
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantProduct);
      const products = await repo
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.categoryRelation', 'category')
        .where('product.deletedAt IS NULL')
        .andWhere('product.available = :av', { av: true })
        .andWhere('product.visible = :vis', { vis: true })
        .andWhere('(product.name ILIKE :q OR product.nameKo ILIKE :q OR product.description ILIKE :q)', { q: `%${query}%` })
        .orderBy('product.createdAt', 'ASC')
        .getMany();
      const counts = await this.getOrderCounts(manager);
      return this.mapProductsWithPromotions(manager, products, counts);
    });
  }

  async searchForAdmin(query: string, restaurantId: string): Promise<ProductResponseDto[]> {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantProduct);
      const products = await repo
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.categoryRelation', 'category')
        .where('product.deletedAt IS NULL')
        .andWhere('(product.name ILIKE :q OR product.nameKo ILIKE :q OR product.description ILIKE :q)', { q: `%${query}%` })
        .orderBy('product.createdAt', 'ASC')
        .getMany();
      return products.map((p) => this.mapToResponseDto(p));
    });
  }

  async getPopular(limit: number = 10, restaurantId?: string): Promise<ProductResponseDto[]> {
    if (!restaurantId) return [];
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantProduct);
      const products = await repo.find({
        where: { deletedAt: IsNull(), available: true, visible: true },
        relations: ['categoryRelation'],
        order: { sales: 'DESC', createdAt: 'ASC' },
        take: limit,
      });
      const counts = await this.getOrderCounts(manager);
      return this.mapProductsWithPromotions(manager, products, counts);
    });
  }

  async getPopularForAdmin(limit: number = 10, restaurantId?: string): Promise<ProductResponseDto[]> {
    if (!restaurantId) return [];
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantProduct);
      const products = await repo.find({
        where: { deletedAt: IsNull() },
        relations: ['categoryRelation'],
        order: { sales: 'DESC', createdAt: 'ASC' },
        take: limit,
      });
      return products.map((p) => this.mapToResponseDto(p));
    });
  }

  async findAllForAdmin(restaurantId: string): Promise<ProductResponseDto[]> {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantProduct);
      const products = await repo.find({
        where: { deletedAt: IsNull() },
        relations: ['categoryRelation'],
        order: { createdAt: 'ASC' },
      });
      return products.map((p) => this.mapToResponseDto(p));
    });
  }

  async getActiveProductsCount(restaurantId: string): Promise<number> {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantProduct);
      return repo.count({
        where: { deletedAt: IsNull(), available: true, visible: true },
      });
    });
  }

  async findAllForAdminPaginated(
    page: number = 1,
    limit: number = 10,
    includeDeleted: boolean = false,
    categoryId?: string,
    restaurantId?: string,
    /** Lọc theo tên / mô tả (ILIKE), khớp với query param `search` từ admin menu */
    search?: string,
    /** Lọc còn hàng / hết hàng — khớp với query param `available` */
    available?: boolean,
    /** Sắp xếp: created | updated | sales (mặc định updated) */
    sortBy: 'created' | 'updated' | 'sales' = 'updated',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ) {
    if (!restaurantId) {
      return { products: [], total: 0, page, limit, totalPages: 0 };
    }
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantProduct);
      const term = search?.trim();

      let qb = repo
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.categoryRelation', 'category');

      if (includeDeleted) {
        qb = qb.withDeleted();
      } else {
        qb = qb.andWhere('product.deletedAt IS NULL');
      }

      if (categoryId) {
        qb = qb.andWhere('product.categoryId = :categoryId', { categoryId });
      }

      if (available !== undefined && available !== null) {
        qb = qb.andWhere('product.available = :av', { av: available });
      }

      if (term) {
        const q = `%${term}%`;
        qb = qb.andWhere(
          '(product.name ILIKE :q OR product.nameKo ILIKE :q OR product.description ILIKE :q OR COALESCE(product.descriptionKo, \'\') ILIKE :q)',
          { q },
        );
      }

      const dir: 'ASC' | 'DESC' = sortOrder === 'ASC' ? 'ASC' : 'DESC';
      if (sortBy === 'created') {
        qb = qb.orderBy('product.createdAt', dir);
      } else if (sortBy === 'sales') {
        qb = qb.orderBy('product.sales', dir);
      } else {
        qb = qb.orderBy('product.updatedAt', dir);
      }
      qb = qb.addOrderBy('product.id', 'ASC');

      qb = qb.skip((page - 1) * limit).take(limit);

      const [products, total] = await qb.getManyAndCount();

      return {
        products: products.map((p) => this.mapToResponseDto(p)),
        total,
        page,
        limit,
        totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
      };
    });
  }

  async toggleVisibility(id: string, restaurantId?: string): Promise<ProductResponseDto> {
    if (!restaurantId) throw new BadRequestException('restaurantId is required');
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantProduct);
      const product = await repo.findOne({ where: { id, deletedAt: IsNull() } });
      if (!product) throw new NotFoundException(`Product with ID ${id} not found`);
      product.visible = !product.visible;
      const saved = await repo.save(product);
      return this.mapToResponseDto(saved);
    });
  }

  async toggleAvailability(id: string, restaurantId?: string): Promise<ProductResponseDto> {
    if (!restaurantId) throw new BadRequestException('restaurantId is required');
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantProduct);
      const product = await repo.findOne({ where: { id, deletedAt: IsNull() } });
      if (!product) throw new NotFoundException(`Product with ID ${id} not found`);
      product.available = !product.available;
      const saved = await repo.save(product);
      return this.mapToResponseDto(saved);
    });
  }

  private async getOrderCounts(manager: any): Promise<Record<string, number>> {
    const repo = manager.getRepository(TenantOrderItem);
    const raw = await repo
      .createQueryBuilder('oi')
      .select('oi.productId', 'productId')
      .addSelect('COUNT(DISTINCT oi.orderId)', 'cnt')
      .groupBy('oi.productId')
      .getRawMany();
    const out: Record<string, number> = {};
    raw.forEach((r: any) => { out[r.productId] = parseInt(r.cnt, 10) || 0; });
    return out;
  }

  private mapToResponseDto(
    product: TenantProduct,
    orderCount?: number,
    promotion?: ResolvedPromotion | null,
    buyOffer?: BuyXGetYOffer | null,
  ): ProductResponseDto {
    const price = Number(product.price);
    const dto: ProductResponseDto = {
      id: product.id,
      name: product.name,
      nameKo: product.nameKo,
      description: product.description ?? '',
      descriptionKo: product.descriptionKo,
      price,
      image: product.image,
      categoryId: product.categoryId ?? undefined,
      category: product.category ?? undefined,
      categoryKo: product.categoryKo ?? undefined,
      visible: product.visible,
      available: product.available,
      sales: product.sales,
      orderCount: orderCount ?? 0,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      deletedAt: product.deletedAt ?? undefined,
    };
    if (promotion && promotion.salePrice < price) {
      dto.salePrice = promotion.salePrice;
      dto.promotion = {
        id: promotion.promotionId,
        name: promotion.promotionName,
        label: promotion.label,
      };
    }
    if (buyOffer) {
      dto.buyOffer = {
        id: buyOffer.promotionId,
        name: buyOffer.promotionName,
        label: buyOffer.label,
        buyQuantity: buyOffer.buyQuantity,
        getQuantity: buyOffer.getQuantity,
      };
    }
    return dto;
  }

  private async mapProductsWithPromotions(
    manager: any,
    products: TenantProduct[],
    counts?: Record<string, number>,
  ): Promise<ProductResponseDto[]> {
    const [promoMap, buyMap] = await Promise.all([
      this.promotionsService.resolveProductPrices(manager, products),
      this.promotionsService.resolveProductBuyOffers(manager, products),
    ]);
    return products.map((p) =>
      this.mapToResponseDto(
        p,
        counts?.[p.id] ?? 0,
        promoMap.get(p.id) ?? null,
        buyMap.get(p.id) ?? null,
      ),
    );
  }
}
