import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Patch,
    UseGuards,
    UseInterceptors,
    ClassSerializerInterceptor,
    HttpCode,
    HttpStatus
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiBody
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderDto, OrderResponseDto } from './orders.dto';
import { RestaurantId } from '../auth/decorators/restaurant.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@ApiTags('orders-client')
@Controller('client/orders')
@UseGuards(OptionalJwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class ClientOrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new order (Client)' })
    @ApiBody({ type: CreateOrderDto })
    @ApiResponse({ status: 201, description: 'Order created successfully', type: OrderResponseDto })
    @ApiResponse({ status: 400, description: 'Bad request' })
    async createOrder(
        @Body() createOrderDto: CreateOrderDto,
        @RestaurantId() restaurantId: string,
    ): Promise<OrderResponseDto> {
        return this.ordersService.createOrder(createOrderDto, restaurantId);
    }

    @Get('number/:orderNumber')
    @ApiOperation({ summary: 'Get order by order number (Client)' })
    @ApiParam({ name: 'orderNumber', description: 'Order number' })
    @ApiResponse({ status: 200, description: 'Order found', type: OrderResponseDto })
    @ApiResponse({ status: 404, description: 'Order not found' })
    async findByOrderNumber(
        @Param('orderNumber') orderNumber: string,
        @RestaurantId() restaurantId: string,
    ): Promise<OrderResponseDto> {
        return this.ordersService.findByOrderNumber(orderNumber, restaurantId);
    }

    @Get('table/:tableId/active')
    @ApiOperation({ summary: 'Get active order by table (Client)' })
    @ApiParam({ name: 'tableId', description: 'Table ID' })
    @ApiResponse({ status: 200, description: 'Active order for table', type: OrderResponseDto })
    @ApiResponse({ status: 404, description: 'No active order found' })
    async getActiveOrderByTable(
        @Param('tableId') tableId: string,
        @RestaurantId() restaurantId: string,
    ): Promise<OrderResponseDto | null> {
        return this.ordersService.getActiveOrderByTable(tableId, restaurantId);
    }

    @Get('table/:tableId/unpaid')
    @ApiOperation({ summary: 'Get unpaid orders by table (Client)' })
    @ApiParam({ name: 'tableId', description: 'Table ID' })
    @ApiResponse({ status: 200, description: 'List of unpaid orders for the table', type: [OrderResponseDto] })
    async getUnpaidOrdersByTable(
        @Param('tableId') tableId: string,
        @RestaurantId() restaurantId: string,
    ): Promise<OrderResponseDto[]> {
        return this.ordersService.getUnpaidOrdersByTable(tableId, restaurantId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get order by ID (Client)' })
    @ApiParam({ name: 'id', description: 'Order ID' })
    @ApiResponse({ status: 200, description: 'Order found', type: OrderResponseDto })
    @ApiResponse({ status: 404, description: 'Order not found' })
    async findOne(
        @Param('id') id: string,
        @RestaurantId() restaurantId: string,
    ): Promise<OrderResponseDto> {
        return this.ordersService.findOne(id, restaurantId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Add items to order (Client)' })
    @ApiParam({ name: 'id', description: 'Order ID' })
    @ApiBody({ type: UpdateOrderDto })
    @ApiResponse({ status: 200, description: 'Order updated successfully', type: OrderResponseDto })
    @ApiResponse({ status: 404, description: 'Order not found' })
    async updateOrder(
        @Param('id') id: string,
        @Body() updateOrderDto: UpdateOrderDto,
        @RestaurantId() restaurantId: string,
    ): Promise<OrderResponseDto> {
        return this.ordersService.updateOrder(id, updateOrderDto, restaurantId);
    }
} 