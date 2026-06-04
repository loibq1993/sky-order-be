import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsUUID,
  Min,
  MinLength,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  PromotionDiscountMode,
  PromotionScope,
} from '../entities/tenant/tenant-product-promotion.entity';

export class CreatePromotionDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiProperty({ enum: ['product', 'category'] })
  @IsEnum(['product', 'category'])
  scope: PromotionScope;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.scope === 'product')
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.scope === 'category')
  @IsUUID()
  categoryId?: string;

  @ApiProperty({ enum: ['percentage', 'fixed_amount', 'fixed_price'] })
  @IsEnum(['percentage', 'fixed_amount', 'fixed_price'])
  discountMode: PromotionDiscountMode;

  @ApiProperty({ description: '% value, fixed discount, or fixed sale price' })
  @IsNumber()
  @Min(0)
  discountValue: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @ApiProperty({ description: 'Start datetime (ISO string)' })
  @IsString()
  validFrom: string;

  @ApiProperty({ description: 'End datetime (ISO string)' })
  @IsString()
  validUntil: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePromotionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ enum: ['product', 'category'] })
  @IsOptional()
  @IsEnum(['product', 'category'])
  scope?: PromotionScope;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @ApiPropertyOptional({ enum: ['percentage', 'fixed_amount', 'fixed_price'] })
  @IsOptional()
  @IsEnum(['percentage', 'fixed_amount', 'fixed_price'])
  discountMode?: PromotionDiscountMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  validFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  validUntil?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PromotionProductSummaryDto {
  @ApiPropertyOptional()
  id?: string;

  @ApiPropertyOptional()
  name?: string;
}

export class PromotionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: ['product', 'category'] })
  scope: PromotionScope;

  @ApiPropertyOptional()
  productId?: string | null;

  @ApiPropertyOptional()
  categoryId?: string | null;

  @ApiPropertyOptional()
  productName?: string | null;

  @ApiPropertyOptional()
  categoryName?: string | null;

  @ApiProperty({ enum: ['percentage', 'fixed_amount', 'fixed_price'] })
  discountMode: PromotionDiscountMode;

  @ApiProperty()
  discountValue: number;

  @ApiPropertyOptional()
  maxDiscountAmount?: number | null;

  @ApiProperty()
  validFrom: Date;

  @ApiProperty()
  validUntil: Date;

  @ApiProperty()
  priority: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ enum: ['upcoming', 'active', 'expired'] })
  status: 'upcoming' | 'active' | 'expired';

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
