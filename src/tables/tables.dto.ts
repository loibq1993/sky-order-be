import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsNotEmpty, IsNumber, IsEnum, IsBoolean, Min } from 'class-validator';

export enum TableStatus {
    AVAILABLE = 'available',
    OCCUPIED = 'occupied',
    RESERVED = 'reserved',
    MAINTENANCE = 'maintenance'
}

export class CreateTableDto {
    @ApiProperty({
        description: 'Tên bàn',
        example: 'Bàn 1'
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string;

    @ApiProperty({
        description: 'Số bàn',
        example: 1
    })
    @IsNumber()
    @Min(1)
    tableNumber: number;

    @ApiPropertyOptional({
        description: 'Sức chứa bàn (số người)',
        example: 4
    })
    @IsOptional()
    @IsNumber()
    @Min(1)
    capacity?: number;

    @ApiPropertyOptional({
        description: 'Mô tả bàn',
        example: 'Bàn góc cửa sổ, view đẹp'
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @ApiPropertyOptional({
        description: 'Trạng thái bàn',
        enum: TableStatus,
        default: TableStatus.AVAILABLE
    })
    @IsOptional()
    @IsEnum(TableStatus)
    status?: TableStatus;
}

export class UpdateTableDto {
    @ApiPropertyOptional({
        description: 'Tên bàn',
        example: 'Bàn 1'
    })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    name?: string;

    @ApiPropertyOptional({
        description: 'Số bàn',
        example: 1
    })
    @IsOptional()
    @IsNumber()
    @Min(1)
    tableNumber?: number;

    @ApiPropertyOptional({
        description: 'Sức chứa bàn (số người)',
        example: 4
    })
    @IsOptional()
    @IsNumber()
    @Min(1)
    capacity?: number;

    @ApiPropertyOptional({
        description: 'Mô tả bàn',
        example: 'Bàn góc cửa sổ, view đẹp'
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @ApiPropertyOptional({
        description: 'Trạng thái bàn',
        enum: TableStatus
    })
    @IsOptional()
    @IsEnum(TableStatus)
    status?: TableStatus;

    @ApiPropertyOptional({
        description: 'Bàn có hoạt động không',
        example: true
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class GenerateQrCodesDto {
    @ApiProperty({
        description: 'URL website cơ sở (frontend URL để khách hàng đặt món)',
        example: 'http://localhost:3000/'
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    baseUrl: string;

    @ApiProperty({
        description: 'Tên quán (hiển thị trên QR)',
        example: 'Việt Phố'
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    restaurantName: string;

    @ApiProperty({
        description: 'Số lượng QR code cần tạo',
        example: 10
    })
    @IsNumber()
    @Min(1)
    count: number;
}

export class TableResponseDto {
    @ApiProperty({
        description: 'Table ID',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    id: string;

    @ApiProperty({
        description: 'Tên bàn',
        example: 'Bàn 1'
    })
    name: string;

    @ApiProperty({
        description: 'Số bàn',
        example: 1
    })
    tableNumber: number;

    @ApiPropertyOptional({
        description: 'URL QR code',
        example: 'https://sky-order.vercel.app/api/tables/qr/1'
    })
    qrCodeUrl?: string;

    @ApiPropertyOptional({
        description: 'Đường dẫn file QR code image',
        example: '/upload/qr-codes/table-1.png'
    })
    qrCodeImagePath?: string;

    @ApiPropertyOptional({
        description: 'URL để order',
        example: 'https://sky-order.vercel.app/?qr=123e4567-e89b-12d3-a456-426614174000'
    })
    orderUrl?: string;

    @ApiPropertyOptional({
        description: 'QR code UUID',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    qrUuid?: string;

    @ApiProperty({
        description: 'Trạng thái bàn',
        enum: TableStatus,
        example: TableStatus.AVAILABLE
    })
    status: TableStatus;

    @ApiProperty({
        description: 'Sức chứa bàn (số người)',
        example: 4
    })
    capacity: number;

    @ApiPropertyOptional({
        description: 'Mô tả bàn',
        example: 'Bàn góc cửa sổ, view đẹp'
    })
    description?: string;

    @ApiProperty({
        description: 'Bàn có hoạt động không',
        example: true
    })
    isActive: boolean;

    @ApiProperty({
        description: 'Thời gian tạo',
        example: '2023-01-01T00:00:00.000Z'
    })
    createdAt?: string;

    @ApiProperty({
        description: 'Thời gian cập nhật',
        example: '2023-01-01T00:00:00.000Z'
    })
    updatedAt?: string;
} 