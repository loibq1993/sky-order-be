import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsNotEmpty, IsNumber, IsEnum, IsArray, ValidateNested, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export enum OrderType {
    DINE_IN = 'dine_in',
    TAKEAWAY = 'takeaway',
    DELIVERY = 'delivery'
}

export enum OrderStatus {
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    PREPARING = 'preparing',
    READY = 'ready',
    DELIVERED = 'delivered',
    CANCELLED = 'cancelled'
}

export class OrderItemDto {
    @ApiProperty({
        description: 'Product ID',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    @IsUUID()
    productId: string;

    @ApiProperty({
        description: 'Quantity of the product',
        example: 2
    })
    @IsNumber()
    @Min(1)
    quantity: number;

    @ApiProperty({
        description: 'Price per unit',
        example: 15.99
    })
    @IsNumber()
    @Min(0)
    price: number;

    @ApiPropertyOptional({
        description: 'Special instructions for this item',
        example: 'Extra spicy, no onions'
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    notes?: string;
}

export class CreateOrderDto {
    @ApiProperty({
        description: 'Order items',
        type: [OrderItemDto]
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    items: OrderItemDto[];

    @ApiProperty({
        description: 'Order type',
        enum: OrderType,
        example: OrderType.DINE_IN
    })
    @IsEnum(OrderType)
    orderType: OrderType;

    @ApiPropertyOptional({
        description: 'Customer name',
        example: 'John Doe'
    })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    customerName?: string;

    @ApiPropertyOptional({
        description: 'Customer phone number',
        example: '+1234567890'
    })
    @IsOptional()
    @IsString()
    @MaxLength(20)
    customerPhone?: string;

    @ApiPropertyOptional({
        description: 'Customer address (for delivery)',
        example: '123 Main St, City, State 12345'
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    customerAddress?: string;

    @ApiPropertyOptional({
        description: 'Order notes',
        example: 'Please deliver to the back entrance'
    })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    notes?: string;

    @ApiPropertyOptional({
        description: 'Special instructions',
        example: 'Extra napkins and utensils'
    })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    specialInstructions?: string;
}

export class UpdateOrderDto {
    @ApiPropertyOptional({
        description: 'Order status',
        enum: OrderStatus
    })
    @IsOptional()
    @IsEnum(OrderStatus)
    status?: OrderStatus;

    @ApiPropertyOptional({
        description: 'Customer name',
        example: 'John Doe'
    })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    customerName?: string;

    @ApiPropertyOptional({
        description: 'Customer phone number',
        example: '+1234567890'
    })
    @IsOptional()
    @IsString()
    @MaxLength(20)
    customerPhone?: string;

    @ApiPropertyOptional({
        description: 'Customer address (for delivery)',
        example: '123 Main St, City, State 12345'
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    customerAddress?: string;

    @ApiPropertyOptional({
        description: 'Order notes',
        example: 'Please deliver to the back entrance'
    })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    notes?: string;

    @ApiPropertyOptional({
        description: 'Special instructions',
        example: 'Extra napkins and utensils'
    })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    specialInstructions?: string;

    @ApiPropertyOptional({
        description: 'Estimated delivery time',
        example: '2023-01-01T12:00:00.000Z'
    })
    @IsOptional()
    estimatedDeliveryTime?: Date;

    @ApiPropertyOptional({
        description: 'Actual delivery time',
        example: '2023-01-01T12:15:00.000Z'
    })
    @IsOptional()
    actualDeliveryTime?: Date;
}

export class OrderItemResponseDto {
    @ApiProperty({
        description: 'Order item ID',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    id: string;

    @ApiProperty({
        description: 'Product ID',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    productId: string;

    @ApiProperty({
        description: 'Product name',
        example: 'Pho Bo'
    })
    productName: string;

    @ApiProperty({
        description: 'Quantity of the product',
        example: 2
    })
    quantity: number;

    @ApiProperty({
        description: 'Price per unit',
        example: 15.99
    })
    price: number;

    @ApiProperty({
        description: 'Total price for this item',
        example: 31.98
    })
    totalPrice: number;

    @ApiPropertyOptional({
        description: 'Special instructions for this item',
        example: 'Extra spicy, no onions'
    })
    notes?: string;

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
}

export class OrderResponseDto {
    @ApiProperty({
        description: 'Order ID',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    id: string;

    @ApiProperty({
        description: 'Order number',
        example: 'ORD-2023-001'
    })
    orderNumber: string;

    @ApiProperty({
        description: 'Order status',
        enum: OrderStatus,
        example: OrderStatus.PENDING
    })
    status: OrderStatus;

    @ApiProperty({
        description: 'Order type',
        enum: OrderType,
        example: OrderType.DINE_IN
    })
    orderType: OrderType;

    @ApiProperty({
        description: 'Order items',
        type: [OrderItemResponseDto]
    })
    items: OrderItemResponseDto[];

    @ApiProperty({
        description: 'Total amount',
        example: 45.97
    })
    totalAmount: number;

    @ApiPropertyOptional({
        description: 'Customer name',
        example: 'John Doe'
    })
    customerName?: string;

    @ApiPropertyOptional({
        description: 'Customer phone number',
        example: '+1234567890'
    })
    customerPhone?: string;

    @ApiPropertyOptional({
        description: 'Customer address (for delivery)',
        example: '123 Main St, City, State 12345'
    })
    customerAddress?: string;

    @ApiPropertyOptional({
        description: 'Order notes',
        example: 'Please deliver to the back entrance'
    })
    notes?: string;

    @ApiPropertyOptional({
        description: 'Special instructions',
        example: 'Extra napkins and utensils'
    })
    specialInstructions?: string;

    @ApiPropertyOptional({
        description: 'Estimated delivery time',
        example: '2023-01-01T12:00:00.000Z'
    })
    estimatedDeliveryTime?: Date;

    @ApiPropertyOptional({
        description: 'Actual delivery time',
        example: '2023-01-01T12:15:00.000Z'
    })
    actualDeliveryTime?: Date;

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
} 