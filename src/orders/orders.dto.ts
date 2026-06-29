import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsNotEmpty, IsNumber, IsEnum, IsArray, ValidateNested, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ComboOrderDto } from '../combos/combos.dto';

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
    SERVED = 'served',
    DELIVERED = 'delivered',
    COMPLETED = 'completed',
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
    @ApiPropertyOptional({
        description: 'Order items',
        type: [OrderItemDto]
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    items?: OrderItemDto[];

    @ApiPropertyOptional({
        description: 'Combo bundles in the order',
        type: [ComboOrderDto],
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ComboOrderDto)
    combos?: ComboOrderDto[];

    @ApiProperty({
        description: 'Order type',
        enum: OrderType,
        example: OrderType.DINE_IN
    })
    @IsEnum(OrderType)
    orderType: OrderType;

    @ApiPropertyOptional({
        description: 'Table ID (for dine-in orders)',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    @IsOptional()
    @IsUUID()
    tableId?: string;

    @ApiPropertyOptional({
        description: 'Table number (for dine-in orders)',
        example: 1
    })
    @IsOptional()
    @IsNumber()
    @Min(1)
    tableNumber?: number;

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
        description: 'Voucher code to apply at checkout',
        example: 'VC-AB12CD34',
    })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    voucherCode?: string;
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
        description: 'Additional items to add to order',
        type: [OrderItemDto]
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    additionalItems?: OrderItemDto[];

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

    @ApiPropertyOptional({
        description: 'Product data',
        type: 'object',
        properties: {
            id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
            name: { type: 'string', example: 'Pho Bo' },
            image: { type: 'string', example: 'pho-bo.png' }
        },
        additionalProperties: false
    })
    product?: {
        id: string;
        name: string;
        image: string;
    };
}

export class OrderResponseDto {
    @ApiProperty({
        description: 'Order ID',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    id: string;

    @ApiProperty({
        description: 'Order number',
        example: 'CF_1780702964927-011'
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

    @ApiPropertyOptional({
        description: 'Table ID (for dine-in orders)',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    tableId?: string;

    @ApiPropertyOptional({
        description: 'Table number (for dine-in orders)',
        example: 1
    })
    tableNumber?: number;

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

    @ApiPropertyOptional({
        description: 'Payment status',
        example: 'unpaid',
        enum: ['unpaid', 'processing', 'paid', 'failed'],
    })
    paymentStatus?: string;

    @ApiPropertyOptional({ description: 'Subtotal before voucher discount' })
    subtotal?: number;

    @ApiPropertyOptional({ description: 'Voucher discount amount applied' })
    voucherDiscount?: number;

    @ApiPropertyOptional({ description: 'Applied voucher code' })
    voucherCode?: string;

    @ApiPropertyOptional({ description: 'Applied voucher name' })
    voucherName?: string;

    @ApiPropertyOptional({
        description: 'Payment method',
        example: 'stripe',
    })
    paymentMethod?: string;

    @ApiPropertyOptional({
        description: 'When the order was paid',
    })
    paidAt?: Date;
}

export enum PaymentMethod {
    CASH = 'cash',
    TRANSFER = 'transfer',
    QR = 'qr',
    CARD = 'card',
    STRIPE = 'stripe',
    VIETQR = 'vietqr',
}

export class UpdateOrderStatusDto {
    @ApiProperty({
        description: 'Order status',
        enum: OrderStatus,
        example: OrderStatus.CONFIRMED
    })
    @IsEnum(OrderStatus)
    status: OrderStatus;

    @ApiPropertyOptional({
        description: 'Payment method when marking order as completed at counter',
        enum: PaymentMethod,
        example: PaymentMethod.CASH,
    })
    @IsOptional()
    @IsEnum(PaymentMethod)
    paymentMethod?: PaymentMethod;
}

export class DateRangeDto {
    @ApiProperty({
        description: 'Start date',
        example: '2023-01-01T00:00:00.000Z'
    })
    @IsNotEmpty()
    startDate: Date;

    @ApiProperty({
        description: 'End date',
        example: '2023-12-31T23:59:59.999Z'
    })
    @IsNotEmpty()
    endDate: Date;
}

export class CustomerSearchDto {
    @ApiProperty({
        description: 'Customer name to search for',
        example: 'John Doe'
    })
    @IsString()
    @IsNotEmpty()
    customerName: string;
}

export class CustomerPhoneSearchDto {
    @ApiProperty({
        description: 'Customer phone number to search for',
        example: '+1234567890'
    })
    @IsString()
    @IsNotEmpty()
    customerPhone: string;
}

export class MultipleStatusFilterDto {
    @ApiProperty({
        description: 'Array of order statuses to filter by',
        enum: OrderStatus,
        isArray: true,
        example: [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PREPARING]
    })
    @IsArray()
    @IsEnum(OrderStatus, { each: true })
    statuses: OrderStatus[];
}

export class ExcludeStatusFilterDto {
    @ApiProperty({
        description: 'Array of order statuses to exclude from results',
        enum: OrderStatus,
        isArray: true,
        example: [OrderStatus.COMPLETED, OrderStatus.CANCELLED]
    })
    @IsArray()
    @IsEnum(OrderStatus, { each: true })
    excludedStatuses: OrderStatus[];
}

export class ApplyVoucherDto {
    @ApiProperty({
        description: 'Voucher code to apply before payment',
        example: 'VC-AB12CD34',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    voucherCode: string;
}