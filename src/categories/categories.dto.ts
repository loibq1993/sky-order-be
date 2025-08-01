import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateCategoryDto {
    @ApiProperty({ description: 'Category name in Vietnamese' })
    @IsString()
    name: string;

    @ApiProperty({ description: 'Category name in Korean' })
    @IsString()
    nameKo: string;

    @ApiProperty({ description: 'Category description in Vietnamese', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ description: 'Category description in Korean', required: false })
    @IsString()
    @IsOptional()
    descriptionKo?: string;

    @ApiProperty({ description: 'Category active status', default: true })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

export class UpdateCategoryDto {
    @ApiProperty({ description: 'Category name in Vietnamese', required: false })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiProperty({ description: 'Category name in Korean', required: false })
    @IsString()
    @IsOptional()
    nameKo?: string;

    @ApiProperty({ description: 'Category description in Vietnamese', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ description: 'Category description in Korean', required: false })
    @IsString()
    @IsOptional()
    descriptionKo?: string;

    @ApiProperty({ description: 'Category active status', required: false })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

export class CategoryResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    name: string;

    @ApiProperty()
    nameKo: string;

    @ApiProperty({ required: false })
    description?: string;

    @ApiProperty({ required: false })
    descriptionKo?: string;

    @ApiProperty()
    isActive: boolean;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    @ApiProperty({ required: false })
    deletedAt?: Date;
} 