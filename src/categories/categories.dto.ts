import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsNotEmpty } from 'class-validator';

export class CreateCategoryDto {
    @ApiProperty({
        description: 'Category name',
        example: 'Main Dishes'
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string;

    @ApiPropertyOptional({
        description: 'Category name in Korean',
        example: '메인 요리'
    })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    nameKo?: string;

    @ApiPropertyOptional({
        description: 'Category icon (emoji)',
        example: '🍽️'
    })
    @IsOptional()
    @IsString()
    @MaxLength(10)
    icon?: string;

    @ApiPropertyOptional({
        description: 'Category description',
        example: 'Main course dishes and entrees'
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;
}

export class UpdateCategoryDto {
    @ApiPropertyOptional({
        description: 'Category name',
        example: 'Main Dishes'
    })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    name?: string;

    @ApiPropertyOptional({
        description: 'Category name in Korean',
        example: '메인 요리'
    })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    nameKo?: string;

    @ApiPropertyOptional({
        description: 'Category icon (emoji)',
        example: '🍽️'
    })
    @IsOptional()
    @IsString()
    @MaxLength(10)
    icon?: string;

    @ApiPropertyOptional({
        description: 'Category description',
        example: 'Main course dishes and entrees'
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;
}

export class CategoryResponseDto {
    @ApiProperty({
        description: 'Category ID',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    id: string;

    @ApiProperty({
        description: 'Category name',
        example: 'Main Dishes'
    })
    name: string;

    @ApiPropertyOptional({
        description: 'Category name in Korean',
        example: '메인 요리'
    })
    nameKo?: string;

    @ApiPropertyOptional({
        description: 'Category icon (emoji)',
        example: '🍽️'
    })
    icon?: string;

    @ApiPropertyOptional({
        description: 'Category description',
        example: 'Main course dishes and entrees'
    })
    description?: string;

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
} 