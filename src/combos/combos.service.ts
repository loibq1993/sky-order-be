import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EntityManager, IsNull } from 'typeorm';
import { TenantCombo } from '../entities/tenant/tenant-combo.entity';
import { TenantComboItem } from '../entities/tenant/tenant-combo-item.entity';
import { TenantProduct } from '../entities/tenant/tenant-product.entity';
import { TenantSchemaService } from '../tenant/tenant-schema.service';
import {
  CreateComboDto,
  UpdateComboDto,
  ComboResponseDto,
  ComboItemResponseDto,
} from './combos.dto';

export interface ExpandedComboLine {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  originalUnitPrice: number;
  totalPrice: number;
  comboId: string;
  promotionId: string | null;
  promotionDiscount: number;
}

@Injectable()
export class CombosService {
  constructor(private readonly tenantSchemaService: TenantSchemaService) {}

  async ensureOrderItemComboIdColumn(manager: EntityManager): Promise<void> {
    await manager.query(`
      ALTER TABLE order_items ADD COLUMN IF NOT EXISTS "comboId" uuid;
    `);
  }

  async ensureCombosTables(manager: EntityManager): Promise<void> {
    await manager.query(`
      CREATE TABLE IF NOT EXISTS combos (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        name character varying(200) NOT NULL,
        "nameKo" character varying(200),
        description text,
        "descriptionKo" text,
        price numeric(10,2) NOT NULL,
        image character varying(500),
        "validFrom" TIMESTAMP,
        "validUntil" TIMESTAMP,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        PRIMARY KEY (id)
      )
    `);
    await manager.query(`
      CREATE TABLE IF NOT EXISTS combo_items (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        "comboId" uuid NOT NULL,
        "productId" uuid NOT NULL,
        quantity integer NOT NULL DEFAULT 1,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        PRIMARY KEY (id),
        CONSTRAINT "FK_combo_items_combo" FOREIGN KEY ("comboId") REFERENCES combos(id) ON DELETE CASCADE
      )
    `);
  }

  private getComboStatus(
    combo: TenantCombo,
    now = new Date(),
  ): ComboResponseDto['status'] {
    if (!combo.validFrom && !combo.validUntil) return 'always';
    if (combo.validFrom && now < new Date(combo.validFrom)) return 'upcoming';
    if (combo.validUntil && now > new Date(combo.validUntil)) return 'expired';
    return 'active';
  }

  private assertComboActive(combo: TenantCombo): void {
    if (!combo.isActive) {
      throw new BadRequestException('Combo is not active');
    }
    const status = this.getComboStatus(combo);
    if (status === 'upcoming') {
      throw new BadRequestException('Combo is not available yet');
    }
    if (status === 'expired') {
      throw new BadRequestException('Combo has expired');
    }
  }

  private async loadComboWithItems(
    manager: EntityManager,
    comboId: string,
  ): Promise<TenantCombo> {
    await this.ensureCombosTables(manager);
    const repo = manager.getRepository(TenantCombo);
    const combo = await repo.findOne({
      where: { id: comboId, deletedAt: IsNull() },
      relations: ['items'],
    });
    if (!combo) {
      throw new NotFoundException(`Combo ${comboId} not found`);
    }
    if (!combo.items?.length) {
      throw new BadRequestException('Combo has no items configured');
    }
    return combo;
  }

  private async mapItemsToResponse(
    manager: EntityManager,
    comboItems: TenantComboItem[],
  ): Promise<ComboItemResponseDto[]> {
    const productRepo = manager.getRepository(TenantProduct);
    const result: ComboItemResponseDto[] = [];
    for (const ci of comboItems) {
      const product = await productRepo.findOne({
        where: { id: ci.productId, deletedAt: IsNull() },
      });
      result.push({
        id: ci.id,
        productId: ci.productId,
        productName: product?.name ?? 'Unknown',
        productPrice: product ? Number(product.price) : undefined,
        quantity: ci.quantity,
      });
    }
    return result;
  }

  private async mapToResponse(
    manager: EntityManager,
    combo: TenantCombo,
  ): Promise<ComboResponseDto> {
    const items = await this.mapItemsToResponse(manager, combo.items ?? []);
    const originalPrice = items.reduce(
      (sum, i) => sum + (i.productPrice ?? 0) * i.quantity,
      0,
    );
    const price = Number(combo.price);
    return {
      id: combo.id,
      name: combo.name,
      nameKo: combo.nameKo,
      description: combo.description,
      descriptionKo: combo.descriptionKo,
      price,
      originalPrice: originalPrice > 0 ? originalPrice : undefined,
      savings: originalPrice > price ? originalPrice - price : undefined,
      image: combo.image,
      validFrom: combo.validFrom,
      validUntil: combo.validUntil,
      sortOrder: combo.sortOrder,
      isActive: combo.isActive,
      status: this.getComboStatus(combo),
      items,
      createdAt: combo.createdAt,
      updatedAt: combo.updatedAt,
    };
  }

  async expandComboToOrderLines(
    manager: EntityManager,
    comboId: string,
    orderQuantity: number,
  ): Promise<ExpandedComboLine[]> {
    const combo = await this.loadComboWithItems(manager, comboId);
    this.assertComboActive(combo);

    const productRepo = manager.getRepository(TenantProduct);
    const bundleUnitPrice = Number(combo.price);

    const components: Array<{
      productId: string;
      productName: string;
      quantity: number;
      listUnitPrice: number;
    }> = [];

    for (const ci of combo.items) {
      const product = await productRepo.findOne({
        where: {
          id: ci.productId,
          deletedAt: IsNull(),
          available: true,
          visible: true,
        },
      });
      if (!product) {
        throw new BadRequestException(
          `Product in combo "${combo.name}" is unavailable`,
        );
      }
      components.push({
        productId: product.id,
        productName: product.name,
        quantity: ci.quantity,
        listUnitPrice: Number(product.price),
      });
    }

    const listTotalPerCombo = components.reduce(
      (sum, c) => sum + c.listUnitPrice * c.quantity,
      0,
    );

    const lines: ExpandedComboLine[] = [];
    let allocated = 0;
    const totalBundles = orderQuantity;

    for (let i = 0; i < components.length; i++) {
      const c = components[i];
      const lineQty = c.quantity * totalBundles;
      let lineTotal: number;

      if (i === components.length - 1) {
        lineTotal =
          Math.round((bundleUnitPrice * totalBundles - allocated) * 100) / 100;
      } else if (listTotalPerCombo > 0) {
        lineTotal =
          Math.round(
            ((c.listUnitPrice * c.quantity) / listTotalPerCombo) *
              bundleUnitPrice *
              totalBundles *
              100,
          ) / 100;
        allocated += lineTotal;
      } else {
        lineTotal =
          Math.round(((bundleUnitPrice * totalBundles) / components.length) * 100) /
          100;
        allocated += lineTotal;
      }

      const unitPrice =
        lineQty > 0 ? Math.round((lineTotal / lineQty) * 100) / 100 : 0;

      lines.push({
        productId: c.productId,
        productName: `[Combo: ${combo.name}] ${c.productName}`,
        quantity: lineQty,
        unitPrice,
        originalUnitPrice: c.listUnitPrice,
        totalPrice: lineTotal,
        comboId: combo.id,
        promotionId: null,
        promotionDiscount: 0,
      });
    }

    return lines;
  }

  async create(dto: CreateComboDto, restaurantId: string): Promise<ComboResponseDto> {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      await this.ensureCombosTables(manager);
      await this.validateComboItems(manager, dto.items);

      const comboRepo = manager.getRepository(TenantCombo);
      const itemRepo = manager.getRepository(TenantComboItem);

      const combo = comboRepo.create({
        name: dto.name,
        nameKo: dto.nameKo ?? null,
        description: dto.description ?? null,
        descriptionKo: dto.descriptionKo ?? null,
        price: Number(dto.price),
        image: dto.image ?? null,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      });
      const saved = await comboRepo.save(combo);

      for (const item of dto.items) {
        await itemRepo.save(
          itemRepo.create({
            comboId: saved.id,
            productId: item.productId,
            quantity: item.quantity,
          }),
        );
      }

      return this.mapToResponse(manager, await this.loadComboWithItems(manager, saved.id));
    });
  }

  async findAll(restaurantId: string, activeOnly = false): Promise<ComboResponseDto[]> {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      await this.ensureCombosTables(manager);
      const repo = manager.getRepository(TenantCombo);
      const combos = await repo.find({
        where: { deletedAt: IsNull() },
        relations: ['items'],
        order: { sortOrder: 'ASC', createdAt: 'DESC' },
      });
      const mapped = await Promise.all(
        combos.map((c) => this.mapToResponse(manager, c)),
      );
      if (!activeOnly) return mapped;
      return mapped.filter((c) => c.isActive && (c.status === 'active' || c.status === 'always'));
    });
  }

  async findOne(id: string, restaurantId: string): Promise<ComboResponseDto> {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const combo = await this.loadComboWithItems(manager, id);
      return this.mapToResponse(manager, combo);
    });
  }

  async update(
    id: string,
    dto: UpdateComboDto,
    restaurantId: string,
  ): Promise<ComboResponseDto> {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      await this.ensureCombosTables(manager);
      const comboRepo = manager.getRepository(TenantCombo);
      const itemRepo = manager.getRepository(TenantComboItem);
      const combo = await comboRepo.findOne({
        where: { id, deletedAt: IsNull() },
        relations: ['items'],
      });
      if (!combo) throw new NotFoundException(`Combo ${id} not found`);

      if (dto.items) await this.validateComboItems(manager, dto.items);

      if (dto.name !== undefined) combo.name = dto.name;
      if (dto.nameKo !== undefined) combo.nameKo = dto.nameKo;
      if (dto.description !== undefined) combo.description = dto.description;
      if (dto.descriptionKo !== undefined) combo.descriptionKo = dto.descriptionKo;
      if (dto.price !== undefined) combo.price = Number(dto.price);
      if (dto.image !== undefined) combo.image = dto.image;
      if (dto.validFrom !== undefined) {
        combo.validFrom = dto.validFrom ? new Date(dto.validFrom) : null;
      }
      if (dto.validUntil !== undefined) {
        combo.validUntil = dto.validUntil ? new Date(dto.validUntil) : null;
      }
      if (dto.sortOrder !== undefined) combo.sortOrder = dto.sortOrder;
      if (dto.isActive !== undefined) combo.isActive = dto.isActive;

      await comboRepo.save(combo);

      if (dto.items) {
        await itemRepo.delete({ comboId: id });
        for (const item of dto.items) {
          await itemRepo.save(
            itemRepo.create({
              comboId: id,
              productId: item.productId,
              quantity: item.quantity,
            }),
          );
        }
      }

      return this.mapToResponse(manager, await this.loadComboWithItems(manager, id));
    });
  }

  async remove(id: string, restaurantId: string): Promise<{ message: string }> {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      await this.ensureCombosTables(manager);
      const repo = manager.getRepository(TenantCombo);
      const combo = await repo.findOne({ where: { id, deletedAt: IsNull() } });
      if (!combo) throw new NotFoundException(`Combo ${id} not found`);
      await repo.softDelete(id);
      return { message: 'Combo deleted successfully' };
    });
  }

  async toggleActive(id: string, restaurantId: string): Promise<ComboResponseDto> {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const combo = await this.loadComboWithItems(manager, id);
      combo.isActive = !combo.isActive;
      await manager.getRepository(TenantCombo).save(combo);
      return this.mapToResponse(manager, combo);
    });
  }

  private async validateComboItems(
    manager: EntityManager,
    items: { productId: string; quantity: number }[],
  ): Promise<void> {
    const productRepo = manager.getRepository(TenantProduct);
    const seen = new Set<string>();
    for (const item of items) {
      if (seen.has(item.productId)) {
        throw new BadRequestException('Duplicate product in combo');
      }
      seen.add(item.productId);
      const product = await productRepo.findOne({
        where: { id: item.productId, deletedAt: IsNull() },
      });
      if (!product) {
        throw new BadRequestException(`Product ${item.productId} not found`);
      }
    }
  }
}
