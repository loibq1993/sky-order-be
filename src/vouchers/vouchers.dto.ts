import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsUUID,
  IsInt,
  Min,
  MinLength,
  MaxLength,
  ValidateIf,
  IsArray,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VoucherType } from '../entities/tenant/tenant-voucher.entity';

export class CreateVoucherDto {
  @ApiPropertyOptional({ description: 'Voucher code (auto-generated if omitted)' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  code?: string;

  @ApiProperty({ description: 'Voucher name in Vietnamese' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Voucher name in Korean' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameKo?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Cover image path' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  image?: string;

  @ApiProperty({
    description: 'Voucher type',
    enum: ['percentage', 'fixed_amount', 'free_item'],
    default: 'percentage',
  })
  @IsEnum(['percentage', 'fixed_amount', 'free_item'])
  type: VoucherType;

  @ApiProperty({
    description: 'Discount value: percentage (0-100) or fixed amount',
    example: 10,
  })
  @IsNumber()
  @Min(0)
  @ValidateIf((o) => o.type !== 'free_item')
  discountValue?: number;

  @ApiPropertyOptional({ description: 'Product ID for free_item type' })
  @ValidateIf((o) => o.type === 'free_item')
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ description: 'Minimum order amount to apply voucher', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional({ description: 'Max discount cap for percentage type' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @ApiPropertyOptional({ description: 'Total usage limit across all users (null = unlimited)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  totalUsageLimit?: number;

  @ApiPropertyOptional({ description: 'Usage limit per user', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  perUserLimit?: number;

  @ApiPropertyOptional({ description: 'Valid from date (ISO string)' })
  @IsOptional()
  @IsString()
  validFrom?: string;

  @ApiPropertyOptional({ description: 'Valid until date (ISO string)' })
  @IsOptional()
  @IsString()
  validUntil?: string;

  @ApiPropertyOptional({ description: 'Active status', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateVoucherDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameKo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  image?: string | null;

  @ApiPropertyOptional({ enum: ['percentage', 'fixed_amount', 'free_item'] })
  @IsOptional()
  @IsEnum(['percentage', 'fixed_amount', 'free_item'])
  type?: VoucherType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  totalUsageLimit?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  perUserLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  validFrom?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  validUntil?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class VoucherResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  nameKo?: string | null;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  image?: string | null;

  @ApiProperty({ enum: ['percentage', 'fixed_amount', 'free_item'] })
  type: VoucherType;

  @ApiProperty()
  discountValue: number;

  @ApiPropertyOptional()
  productId?: string | null;

  @ApiPropertyOptional()
  productName?: string | null;

  @ApiProperty()
  minOrderAmount: number;

  @ApiPropertyOptional()
  maxDiscountAmount?: number | null;

  @ApiPropertyOptional()
  totalUsageLimit?: number | null;

  @ApiProperty()
  perUserLimit: number;

  @ApiProperty()
  usedCount: number;

  @ApiPropertyOptional()
  validFrom?: Date | null;

  @ApiPropertyOptional()
  validUntil?: Date | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ValidateVoucherItemDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  price: number;
}

export class ValidateVoucherComboDto {
  @ApiProperty()
  @IsUUID()
  comboId: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  price: number;
}

export class ValidateVoucherDto {
  @ApiProperty({ description: 'Voucher code' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ type: [ValidateVoucherItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ValidateVoucherItemDto)
  items?: ValidateVoucherItemDto[];

  @ApiPropertyOptional({ type: [ValidateVoucherComboDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ValidateVoucherComboDto)
  combos?: ValidateVoucherComboDto[];
}

export class VoucherPreviewResponseDto {
  @ApiProperty()
  valid: boolean;

  @ApiPropertyOptional()
  message?: string;

  @ApiPropertyOptional()
  voucherId?: string;

  @ApiPropertyOptional()
  voucherCode?: string;

  @ApiPropertyOptional()
  voucherName?: string;

  @ApiPropertyOptional({ enum: ['percentage', 'fixed_amount', 'free_item'] })
  type?: VoucherType;

  @ApiPropertyOptional()
  subtotal?: number;

  @ApiPropertyOptional()
  discountAmount?: number;

  @ApiPropertyOptional()
  finalTotal?: number;

  @ApiPropertyOptional()
  freeProductName?: string;
}
