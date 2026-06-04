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
  PromotionType,
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

  @ApiPropertyOptional({
    enum: ['standard', 'happy_hour', 'buy_x_get_y'],
    default: 'standard',
  })
  @IsOptional()
  @IsEnum(['standard', 'happy_hour', 'buy_x_get_y'])
  promotionType?: PromotionType;

  @ApiPropertyOptional({ description: 'Happy hour start HH:mm (VN timezone)' })
  @IsOptional()
  @IsString()
  timeStart?: string;

  @ApiPropertyOptional({ description: 'Happy hour end HH:mm' })
  @IsOptional()
  @IsString()
  timeEnd?: string;

  @ApiPropertyOptional({ description: 'Days 0=Sun..6=Sat, comma-separated' })
  @IsOptional()
  @IsString()
  daysOfWeek?: string;

  @ApiPropertyOptional({ description: 'Buy X get Y — buy quantity' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  buyQuantity?: number;

  @ApiPropertyOptional({ description: 'Buy X get Y — free quantity per set' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  getQuantity?: number;

  @ApiPropertyOptional({ description: 'Reward product (defaults to same product)' })
  @IsOptional()
  @IsUUID()
  rewardProductId?: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.scope === 'product')
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.scope === 'category')
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ enum: ['percentage', 'fixed_amount', 'fixed_price'] })
  @ValidateIf((o) => (o.promotionType ?? 'standard') !== 'buy_x_get_y')
  @IsEnum(['percentage', 'fixed_amount', 'fixed_price'])
  discountMode?: PromotionDiscountMode;

  @ApiPropertyOptional({ description: '% value, fixed discount, or fixed sale price' })
  @ValidateIf((o) => (o.promotionType ?? 'standard') !== 'buy_x_get_y')
  @IsNumber()
  @Min(0)
  discountValue?: number;

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

  @ApiPropertyOptional({ enum: ['standard', 'happy_hour', 'buy_x_get_y'] })
  @IsOptional()
  @IsEnum(['standard', 'happy_hour', 'buy_x_get_y'])
  promotionType?: PromotionType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timeStart?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timeEnd?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  daysOfWeek?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  buyQuantity?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  getQuantity?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  rewardProductId?: string | null;

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

  @ApiProperty({ enum: ['standard', 'happy_hour', 'buy_x_get_y'] })
  promotionType: PromotionType;

  @ApiPropertyOptional()
  timeStart?: string | null;

  @ApiPropertyOptional()
  timeEnd?: string | null;

  @ApiPropertyOptional()
  daysOfWeek?: string | null;

  @ApiPropertyOptional()
  buyQuantity?: number | null;

  @ApiPropertyOptional()
  getQuantity?: number | null;

  @ApiPropertyOptional()
  rewardProductId?: string | null;

  @ApiPropertyOptional()
  rewardProductName?: string | null;

  @ApiPropertyOptional()
  scheduleLabel?: string | null;

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
