import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsNotEmpty, IsNumber, IsBoolean, Min, Max } from 'class-validator';

export class CreateProductDto {
    @ApiProperty({
        description: 'Product name',
        example: 'Pho Bo'
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    name: string;

    @ApiPropertyOptional({
        description: 'Product name in Korean',
        example: '쌀국수'
    })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    nameKo?: string;

    @ApiPropertyOptional({
        description: 'Additional product name',
        example: 'Pho Bo Special'
    })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    addName?: string;

    @ApiPropertyOptional({
        description: 'Additional product name in Korean',
        example: '쌀국수 스페셜'
    })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    addNameKo?: string;

    @ApiProperty({
        description: 'Product description',
        example: 'Traditional Vietnamese beef noodle soup'
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(1000)
    description: string;

    @ApiPropertyOptional({
        description: 'Product description in Korean',
        example: '전통 베트남 쌀국수'
    })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    descriptionKo?: string;

    @ApiProperty({
        description: 'Product price',
        example: 15.99
    })
    @IsNumber()
    @Min(0)
    price: number;

    @ApiPropertyOptional({
        description: 'Product image URL',
        example: 'https://example.com/pho-bo.jpg'
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    image?: string;

    @ApiPropertyOptional({
        description: 'Product category ID',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    @IsOptional()
    @IsString()
    categoryId?: string;

    @ApiPropertyOptional({
        description: 'Product category name',
        example: 'Main Dishes'
    })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    category?: string;

    @ApiPropertyOptional({
        description: 'Product category name in Korean',
        example: '메인 요리'
    })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    categoryKo?: string;

    @ApiPropertyOptional({
        description: 'Product visibility status',
        example: true
    })
    @IsOptional()
    @IsBoolean()
    visible?: boolean;

    @ApiPropertyOptional({
        description: 'Product availability status',
        example: true
    })
    @IsOptional()
    @IsBoolean()
    available?: boolean;

    @ApiPropertyOptional({
        description: 'Product sales count',
        example: 150
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    sales?: number;

    @ApiPropertyOptional({
        description: 'Temporary image filename to move from temp folder',
        example: '1753639449273-b5eb72385d3ed4608d2f.jpg'
    })
    @IsOptional()
    @IsString()
    tempImageFilename?: string;
}

export class UpdateProductDto {
    @ApiPropertyOptional({
        description: 'Product name',
        example: 'Pho Bo'
    })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    name?: string;

    @ApiPropertyOptional({
        description: 'Product name in Korean',
        example: '쌀국수'
    })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    nameKo?: string;

    @ApiPropertyOptional({
        description: 'Additional product name',
        example: 'Pho Bo Special'
    })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    addName?: string;

    @ApiPropertyOptional({
        description: 'Additional product name in Korean',
        example: '쌀국수 스페셜'
    })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    addNameKo?: string;

    @ApiPropertyOptional({
        description: 'Product description',
        example: 'Traditional Vietnamese beef noodle soup'
    })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    description?: string;

    @ApiPropertyOptional({
        description: 'Product description in Korean',
        example: '전통 베트남 쌀국수'
    })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    descriptionKo?: string;

    @ApiPropertyOptional({
        description: 'Product price',
        example: 15.99
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    price?: number;

    @ApiPropertyOptional({
        description: 'Product image URL',
        example: 'https://example.com/pho-bo.jpg'
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    image?: string;

    @ApiPropertyOptional({
        description: 'Product category ID',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    @IsOptional()
    @IsString()
    categoryId?: string;

    @ApiPropertyOptional({
        description: 'Product category name',
        example: 'Main Dishes'
    })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    category?: string;

    @ApiPropertyOptional({
        description: 'Product category name in Korean',
        example: '메인 요리'
    })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    categoryKo?: string;

    @ApiPropertyOptional({
        description: 'Product visibility status',
        example: true
    })
    @IsOptional()
    @IsBoolean()
    visible?: boolean;

    @ApiPropertyOptional({
        description: 'Product availability status',
        example: true
    })
    @IsOptional()
    @IsBoolean()
    available?: boolean;

    @ApiPropertyOptional({
        description: 'Product sales count',
        example: 150
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    sales?: number;

    @ApiPropertyOptional({
        description: 'Temporary image filename to move from temp folder',
        example: '1753639449273-b5eb72385d3ed4608d2f.jpg'
    })
    @IsOptional()
    @IsString()
    tempImageFilename?: string;
}

export class ProductBuyOfferDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    name: string;

    @ApiProperty()
    label: string;

    @ApiProperty()
    buyQuantity: number;

    @ApiProperty()
    getQuantity: number;
}

export class ProductPromotionInfoDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    name: string;

    @ApiProperty()
    label: string;

    @ApiPropertyOptional({ enum: ['standard', 'happy_hour'] })
    promotionType?: string;
}

export class ProductResponseDto {
    @ApiProperty({
        description: 'Product ID',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    id: string;

    @ApiProperty({
        description: 'Product name',
        example: 'Pho Bo'
    })
    name: string;

    @ApiPropertyOptional({
        description: 'Product name in Korean',
        example: '쌀국수'
    })
    nameKo?: string;

    @ApiPropertyOptional({
        description: 'Additional product name',
        example: 'Pho Bo Special'
    })
    addName?: string;

    @ApiPropertyOptional({
        description: 'Additional product name in Korean',
        example: '쌀국수 스페셜'
    })
    addNameKo?: string;

    @ApiProperty({
        description: 'Product description',
        example: 'Traditional Vietnamese beef noodle soup'
    })
    description: string;

    @ApiPropertyOptional({
        description: 'Product description in Korean',
        example: '전통 베트남 쌀국수'
    })
    descriptionKo?: string;

    @ApiProperty({
        description: 'Product price',
        example: 15.99
    })
    price: number;

    @ApiPropertyOptional({
        description: 'Product image URL',
        example: 'https://example.com/pho-bo.jpg'
    })
    image?: string;

    @ApiPropertyOptional({
        description: 'Product category ID',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    categoryId?: string;

    @ApiPropertyOptional({
        description: 'Product category name',
        example: 'Main Dishes'
    })
    category?: string;

    @ApiPropertyOptional({
        description: 'Product category name in Korean',
        example: '메인 요리'
    })
    categoryKo?: string;

    @ApiProperty({
        description: 'Product visibility status',
        example: true
    })
    visible: boolean;

    @ApiProperty({
        description: 'Product availability status',
        example: true
    })
    available: boolean;

    @ApiProperty({
        description: 'Product sales count',
        example: 150
    })
    sales: number;

    @ApiPropertyOptional({
        description: 'Number of orders containing this product',
        example: 25
    })
    orderCount?: number;

    @ApiProperty({
        description: 'Creation timestamp',
        example: '2023-01-01T00:00:00.000Z'
    })
    createdAt: Date;

    @ApiProperty({
        description: 'Last update timestamp',
        example: '2023-01-01T00:00:00.000Z'
    })
    updatedAt: Date;

    @ApiPropertyOptional({
        description: 'Deletion timestamp (if soft deleted)',
        example: '2023-01-01T00:00:00.000Z'
    })
    deletedAt?: Date;

    @ApiPropertyOptional({
        description: 'Promotional sale price (if active promotion applies)',
    })
    salePrice?: number;

    @ApiPropertyOptional({
        description: 'Active promotion info',
        type: () => ProductPromotionInfoDto,
    })
    promotion?: ProductPromotionInfoDto;

    @ApiPropertyOptional({
        description: 'Buy X get Y offer badge',
        type: () => ProductBuyOfferDto,
    })
    buyOffer?: ProductBuyOfferDto;
}
