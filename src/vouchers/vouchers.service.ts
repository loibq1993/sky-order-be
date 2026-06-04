import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { EntityManager, IsNull } from 'typeorm';
import { TenantVoucher } from '../entities/tenant/tenant-voucher.entity';
import { TenantProduct } from '../entities/tenant/tenant-product.entity';
import { TenantSchemaService } from '../tenant/tenant-schema.service';
import {
  CreateVoucherDto,
  UpdateVoucherDto,
  VoucherResponseDto,
  ValidateVoucherDto,
  VoucherPreviewResponseDto,
} from './vouchers.dto';
import {
  VoucherApplyResult,
  VoucherCartItem,
} from './voucher-application.types';

@Injectable()
export class VouchersService {
  constructor(private readonly tenantSchemaService: TenantSchemaService) {}

  private async ensureVouchersTable(manager: EntityManager): Promise<void> {
    await manager.query(`
      CREATE TABLE IF NOT EXISTS vouchers (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        code character varying(50) NOT NULL,
        name character varying(200) NOT NULL,
        "nameKo" character varying(200),
        description text,
        type character varying(20) NOT NULL DEFAULT 'percentage',
        "discountValue" numeric(10,2) NOT NULL DEFAULT 0,
        "productId" uuid,
        "minOrderAmount" numeric(10,2) NOT NULL DEFAULT 0,
        "maxDiscountAmount" numeric(10,2),
        "totalUsageLimit" integer,
        "perUserLimit" integer NOT NULL DEFAULT 1,
        "usedCount" integer NOT NULL DEFAULT 0,
        "validFrom" TIMESTAMP,
        "validUntil" TIMESTAMP,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        PRIMARY KEY (id)
      )
    `);
    await manager.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_vouchers_code"
      ON vouchers (code) WHERE "deletedAt" IS NULL
    `);
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'VC-';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private async resolveUniqueCode(
    manager: EntityManager,
    preferred?: string,
  ): Promise<string> {
    const repo = manager.getRepository(TenantVoucher);
    if (preferred) {
      const normalized = preferred.trim().toUpperCase();
      const existing = await repo.findOne({
        where: { code: normalized, deletedAt: IsNull() },
      });
      if (existing) {
        throw new ConflictException(`Voucher code "${normalized}" already exists`);
      }
      return normalized;
    }
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = this.generateCode();
      const existing = await repo.findOne({
        where: { code, deletedAt: IsNull() },
      });
      if (!existing) return code;
    }
    throw new BadRequestException('Could not generate unique voucher code');
  }

  private validateVoucherRules(
    dto: CreateVoucherDto | UpdateVoucherDto,
    existing?: TenantVoucher,
  ): void {
    const type = dto.type ?? existing?.type ?? 'percentage';
    const discountValue =
      dto.discountValue !== undefined
        ? Number(dto.discountValue)
        : Number(existing?.discountValue ?? 0);

    if (type === 'percentage') {
      if (discountValue <= 0 || discountValue > 100) {
        throw new BadRequestException('Percentage discount must be between 0 and 100');
      }
    } else if (type === 'fixed_amount') {
      if (discountValue <= 0) {
        throw new BadRequestException('Fixed discount amount must be greater than 0');
      }
    } else if (type === 'free_item') {
      const productId =
        dto.productId !== undefined ? dto.productId : existing?.productId;
      if (!productId) {
        throw new BadRequestException('Product is required for free_item voucher');
      }
    }

    const validFrom =
      dto.validFrom !== undefined
        ? dto.validFrom
          ? new Date(dto.validFrom)
          : null
        : existing?.validFrom ?? null;
    const validUntil =
      dto.validUntil !== undefined
        ? dto.validUntil
          ? new Date(dto.validUntil)
          : null
        : existing?.validUntil ?? null;

    if (validFrom && validUntil && validFrom > validUntil) {
      throw new BadRequestException('validFrom must be before validUntil');
    }
  }

  private async mapToResponse(
    manager: EntityManager,
    voucher: TenantVoucher,
  ): Promise<VoucherResponseDto> {
    let productName: string | null = null;
    if (voucher.productId) {
      const productRepo = manager.getRepository(TenantProduct);
      const product = await productRepo.findOne({
        where: { id: voucher.productId, deletedAt: IsNull() },
      });
      productName = product?.name ?? null;
    }
    return {
      id: voucher.id,
      code: voucher.code,
      name: voucher.name,
      nameKo: voucher.nameKo,
      description: voucher.description,
      type: voucher.type,
      discountValue: Number(voucher.discountValue),
      productId: voucher.productId,
      productName,
      minOrderAmount: Number(voucher.minOrderAmount),
      maxDiscountAmount:
        voucher.maxDiscountAmount != null
          ? Number(voucher.maxDiscountAmount)
          : null,
      totalUsageLimit: voucher.totalUsageLimit,
      perUserLimit: voucher.perUserLimit,
      usedCount: voucher.usedCount,
      validFrom: voucher.validFrom,
      validUntil: voucher.validUntil,
      isActive: voucher.isActive,
      createdAt: voucher.createdAt,
      updatedAt: voucher.updatedAt,
    };
  }

  async create(
    dto: CreateVoucherDto,
    restaurantId: string,
  ): Promise<VoucherResponseDto> {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      await this.ensureVouchersTable(manager);
      this.validateVoucherRules(dto);

      if (dto.type === 'free_item' && dto.productId) {
        const productRepo = manager.getRepository(TenantProduct);
        const product = await productRepo.findOne({
          where: { id: dto.productId, deletedAt: IsNull() },
        });
        if (!product) {
          throw new BadRequestException('Product not found');
        }
      }

      const repo = manager.getRepository(TenantVoucher);
      const code = await this.resolveUniqueCode(manager, dto.code);
      const voucher = repo.create({
        code,
        name: dto.name,
        nameKo: dto.nameKo ?? null,
        description: dto.description ?? null,
        type: dto.type,
        discountValue:
          dto.type === 'free_item' ? 0 : Number(dto.discountValue ?? 0),
        productId: dto.type === 'free_item' ? dto.productId ?? null : null,
        minOrderAmount: Number(dto.minOrderAmount ?? 0),
        maxDiscountAmount:
          dto.maxDiscountAmount != null ? Number(dto.maxDiscountAmount) : null,
        totalUsageLimit: dto.totalUsageLimit ?? null,
        perUserLimit: dto.perUserLimit ?? 1,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        isActive: dto.isActive ?? true,
      });
      const saved = await repo.save(voucher);
      return this.mapToResponse(manager, saved);
    });
  }

  async findAll(restaurantId: string): Promise<VoucherResponseDto[]> {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      await this.ensureVouchersTable(manager);
      const repo = manager.getRepository(TenantVoucher);
      const vouchers = await repo.find({
        where: { deletedAt: IsNull() },
        order: { createdAt: 'DESC' },
      });
      return Promise.all(vouchers.map((v) => this.mapToResponse(manager, v)));
    });
  }

  async findOne(id: string, restaurantId: string): Promise<VoucherResponseDto> {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      await this.ensureVouchersTable(manager);
      const repo = manager.getRepository(TenantVoucher);
      const voucher = await repo.findOne({
        where: { id, deletedAt: IsNull() },
      });
      if (!voucher) {
        throw new NotFoundException(`Voucher with ID ${id} not found`);
      }
      return this.mapToResponse(manager, voucher);
    });
  }

  async update(
    id: string,
    dto: UpdateVoucherDto,
    restaurantId: string,
  ): Promise<VoucherResponseDto> {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      await this.ensureVouchersTable(manager);
      const repo = manager.getRepository(TenantVoucher);
      const voucher = await repo.findOne({
        where: { id, deletedAt: IsNull() },
      });
      if (!voucher) {
        throw new NotFoundException(`Voucher with ID ${id} not found`);
      }

      this.validateVoucherRules(dto, voucher);

      if (dto.code && dto.code.trim().toUpperCase() !== voucher.code) {
        voucher.code = await this.resolveUniqueCode(manager, dto.code);
      }
      if (dto.name !== undefined) voucher.name = dto.name;
      if (dto.nameKo !== undefined) voucher.nameKo = dto.nameKo;
      if (dto.description !== undefined) voucher.description = dto.description;
      if (dto.type !== undefined) voucher.type = dto.type;
      if (dto.discountValue !== undefined) {
        voucher.discountValue = Number(dto.discountValue);
      }
      if (dto.productId !== undefined) voucher.productId = dto.productId;
      if (dto.minOrderAmount !== undefined) {
        voucher.minOrderAmount = Number(dto.minOrderAmount);
      }
      if (dto.maxDiscountAmount !== undefined) {
        voucher.maxDiscountAmount =
          dto.maxDiscountAmount != null ? Number(dto.maxDiscountAmount) : null;
      }
      if (dto.totalUsageLimit !== undefined) {
        voucher.totalUsageLimit = dto.totalUsageLimit;
      }
      if (dto.perUserLimit !== undefined) voucher.perUserLimit = dto.perUserLimit;
      if (dto.validFrom !== undefined) {
        voucher.validFrom = dto.validFrom ? new Date(dto.validFrom) : null;
      }
      if (dto.validUntil !== undefined) {
        voucher.validUntil = dto.validUntil ? new Date(dto.validUntil) : null;
      }
      if (dto.isActive !== undefined) voucher.isActive = dto.isActive;

      const type = voucher.type;
      if (type === 'free_item') {
        if (!voucher.productId) {
          throw new BadRequestException('Product is required for free_item voucher');
        }
        const productRepo = manager.getRepository(TenantProduct);
        const product = await productRepo.findOne({
          where: { id: voucher.productId, deletedAt: IsNull() },
        });
        if (!product) {
          throw new BadRequestException('Product not found');
        }
        voucher.discountValue = 0;
      } else {
        voucher.productId = null;
      }

      const saved = await repo.save(voucher);
      return this.mapToResponse(manager, saved);
    });
  }

  async remove(id: string, restaurantId: string): Promise<{ message: string }> {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      await this.ensureVouchersTable(manager);
      const repo = manager.getRepository(TenantVoucher);
      const voucher = await repo.findOne({
        where: { id, deletedAt: IsNull() },
      });
      if (!voucher) {
        throw new NotFoundException(`Voucher with ID ${id} not found`);
      }
      await repo.softDelete(id);
      return { message: 'Voucher deleted successfully' };
    });
  }

  async toggleActive(
    id: string,
    restaurantId: string,
  ): Promise<VoucherResponseDto> {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      await this.ensureVouchersTable(manager);
      const repo = manager.getRepository(TenantVoucher);
      const voucher = await repo.findOne({
        where: { id, deletedAt: IsNull() },
      });
      if (!voucher) {
        throw new NotFoundException(`Voucher with ID ${id} not found`);
      }
      voucher.isActive = !voucher.isActive;
      const saved = await repo.save(voucher);
      return this.mapToResponse(manager, saved);
    });
  }

  private calcSubtotal(
    items: VoucherCartItem[],
    combos?: { quantity: number; unitPrice: number }[],
  ): number {
    const itemTotal = items.reduce(
      (sum, item) => sum + Number(item.unitPrice) * item.quantity,
      0,
    );
    const comboTotal = (combos ?? []).reduce(
      (sum, combo) => sum + Number(combo.unitPrice) * combo.quantity,
      0,
    );
    return itemTotal + comboTotal;
  }

  private async findActiveVoucherByCode(
    manager: EntityManager,
    code: string,
  ): Promise<TenantVoucher> {
    await this.ensureVouchersTable(manager);
    const repo = manager.getRepository(TenantVoucher);
    const voucher = await repo.findOne({
      where: { code: code.trim().toUpperCase(), deletedAt: IsNull() },
    });
    if (!voucher) {
      throw new NotFoundException('Voucher không tồn tại');
    }
    return voucher;
  }

  private assertVoucherUsable(voucher: TenantVoucher, subtotal: number): void {
    if (!voucher.isActive) {
      throw new BadRequestException('Voucher đã bị vô hiệu hóa');
    }
    const now = new Date();
    if (voucher.validFrom && now < new Date(voucher.validFrom)) {
      throw new BadRequestException('Voucher chưa có hiệu lực');
    }
    if (voucher.validUntil && now > new Date(voucher.validUntil)) {
      throw new BadRequestException('Voucher đã hết hạn');
    }
    if (Number(subtotal) < Number(voucher.minOrderAmount)) {
      throw new BadRequestException(
        `Đơn hàng tối thiểu ${Number(voucher.minOrderAmount).toLocaleString('vi-VN')}đ để dùng voucher này`,
      );
    }
    if (
      voucher.totalUsageLimit != null &&
      voucher.usedCount >= voucher.totalUsageLimit
    ) {
      throw new BadRequestException('Voucher đã hết lượt sử dụng');
    }
  }

  async computeApplication(
    manager: EntityManager,
    voucher: TenantVoucher,
    items: VoucherCartItem[],
    combos?: { quantity: number; unitPrice: number }[],
  ): Promise<VoucherApplyResult> {
    const subtotal = this.calcSubtotal(items, combos);
    this.assertVoucherUsable(voucher, subtotal);

    let discountAmount = 0;
    let freeItem: VoucherApplyResult['freeItem'];

    if (voucher.type === 'percentage') {
      const pct = Number(voucher.discountValue);
      discountAmount = (subtotal * pct) / 100;
      if (voucher.maxDiscountAmount != null) {
        discountAmount = Math.min(discountAmount, Number(voucher.maxDiscountAmount));
      }
    } else if (voucher.type === 'fixed_amount') {
      discountAmount = Math.min(Number(voucher.discountValue), subtotal);
    } else if (voucher.type === 'free_item') {
      if (!voucher.productId) {
        throw new BadRequestException('Voucher tặng món chưa cấu hình sản phẩm');
      }
      const productRepo = manager.getRepository(TenantProduct);
      const product = await productRepo.findOne({
        where: { id: voucher.productId, deletedAt: IsNull(), available: true },
      });
      if (!product) {
        throw new BadRequestException('Món tặng không còn khả dụng');
      }
      freeItem = {
        productId: product.id,
        productName: product.name,
        quantity: 1,
      };
      // Tặng món: thêm vào đơn giá 0, không giảm tổng tiền các món đã chọn
      discountAmount = 0;
    }

    discountAmount = Math.round(discountAmount * 100) / 100;
    const finalTotal = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

    return {
      voucher: {
        id: voucher.id,
        code: voucher.code,
        name: voucher.name,
        type: voucher.type,
      },
      discountAmount,
      finalTotal,
      subtotal,
      freeItem,
    };
  }

  async previewCheckout(
    restaurantId: string,
    dto: ValidateVoucherDto,
  ): Promise<VoucherPreviewResponseDto> {
    try {
      return await this.tenantSchemaService.runInTenant(
        restaurantId,
        async (manager) => {
          const voucher = await this.findActiveVoucherByCode(manager, dto.code);
          const items: VoucherCartItem[] = (dto.items ?? []).map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.price,
          }));
          const combos = (dto.combos ?? []).map((c) => ({
            quantity: c.quantity,
            unitPrice: c.price,
          }));
          if (items.length === 0 && combos.length === 0) {
            return { valid: false, message: 'Giỏ hàng trống' };
          }
          const result = await this.computeApplication(manager, voucher, items, combos);
          return {
            valid: true,
            voucherId: result.voucher.id,
            voucherCode: result.voucher.code,
            voucherName: result.voucher.name,
            type: voucher.type,
            subtotal: result.subtotal,
            discountAmount: result.discountAmount,
            finalTotal: result.finalTotal,
            freeProductName: result.freeItem?.productName,
          };
        },
      );
    } catch (err) {
      if (err instanceof BadRequestException || err instanceof NotFoundException) {
        return {
          valid: false,
          message: err.message,
        };
      }
      throw err;
    }
  }

  async applyForOrder(
    manager: EntityManager,
    code: string,
    items: VoucherCartItem[],
  ): Promise<VoucherApplyResult> {
    const voucher = await this.findActiveVoucherByCode(manager, code);
    return this.computeApplication(manager, voucher, items);
  }

  async incrementUsage(manager: EntityManager, voucherId: string): Promise<void> {
    await this.ensureVouchersTable(manager);
    const result = await manager.query(
      `
      UPDATE vouchers
      SET "usedCount" = "usedCount" + 1, "updatedAt" = now()
      WHERE id = $1
        AND "deletedAt" IS NULL
        AND "isActive" = true
        AND ("totalUsageLimit" IS NULL OR "usedCount" < "totalUsageLimit")
      RETURNING id
      `,
      [voucherId],
    );
    if (!result?.length) {
      throw new BadRequestException('Voucher đã hết lượt sử dụng');
    }
  }
}
