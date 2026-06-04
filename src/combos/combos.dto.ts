import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsUUID,
  IsArray,
  ValidateNested,
  Min,
  MinLength,
  MaxLength,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ComboItemInputDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty({ default: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateComboDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

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
  descriptionKo?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  image?: string;

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
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ type: [ComboItemInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ComboItemInputDto)
  items: ComboItemInputDto[];
}

export class UpdateComboDto {
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
  descriptionKo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  image?: string;

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
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [ComboItemInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ComboItemInputDto)
  items?: ComboItemInputDto[];
}

export class ComboItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  productId: string;

  @ApiProperty()
  productName: string;

  @ApiPropertyOptional()
  productPrice?: number;

  @ApiProperty()
  quantity: number;
}

export class ComboResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  nameKo?: string | null;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  descriptionKo?: string | null;

  @ApiProperty()
  price: number;

  @ApiPropertyOptional()
  originalPrice?: number;

  @ApiPropertyOptional()
  savings?: number;

  @ApiPropertyOptional()
  image?: string | null;

  @ApiPropertyOptional()
  validFrom?: Date | null;

  @ApiPropertyOptional()
  validUntil?: Date | null;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ enum: ['active', 'upcoming', 'expired', 'always'] })
  status: 'active' | 'upcoming' | 'expired' | 'always';

  @ApiProperty({ type: [ComboItemResponseDto] })
  items: ComboItemResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ComboOrderDto {
  @ApiProperty()
  @IsUUID()
  comboId: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity: number;
}
