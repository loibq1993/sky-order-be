import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
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
    ApiQuery,
    ApiBody
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderDto, OrderResponseDto } from './orders.dto';

@ApiTags('orders-admin')
@Controller('orders')
@UseInterceptors(ClassSerializerInterceptor)
export class AdminOrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new order (Admin)' })
    @ApiBody({ type: CreateOrderDto })
    @ApiResponse({ status: 201, description: 'Order created successfully', type: OrderResponseDto })
    @ApiResponse({ status: 400, description: 'Bad request' })
    async createOrder(@Body() createOrderDto: CreateOrderDto): Promise<OrderResponseDto> {
        return this.ordersService.createOrder(createOrderDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all orders (Admin)' })
    @ApiResponse({ status: 200, description: 'List of orders', type: [OrderResponseDto] })
    async findAll(): Promise<OrderResponseDto[]> {
        return this.ordersService.findAll();
    }

    @Get('status/:status')
    @ApiOperation({ summary: 'Get orders by status (Admin)' })
    @ApiParam({ name: 'status', description: 'Order status', enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'] })
    @ApiResponse({ status: 200, description: 'List of orders by status', type: [OrderResponseDto] })
    async findByStatus(@Param('status') status: string): Promise<OrderResponseDto[]> {
        return this.ordersService.getOrdersByStatus(status);
    }

    @Get('type/:orderType')
    @ApiOperation({ summary: 'Get orders by type (Admin)' })
    @ApiParam({ name: 'orderType', description: 'Order type', enum: ['dine_in', 'takeaway', 'delivery'] })
    @ApiResponse({ status: 200, description: 'List of orders by type', type: [OrderResponseDto] })
    async findByType(@Param('orderType') orderType: string): Promise<OrderResponseDto[]> {
        return this.ordersService.getOrdersByType(orderType);
    }

    @Get('number/:orderNumber')
    @ApiOperation({ summary: 'Get order by order number (Admin)' })
    @ApiParam({ name: 'orderNumber', description: 'Order number' })
    @ApiResponse({ status: 200, description: 'Order found', type: OrderResponseDto })
    @ApiResponse({ status: 404, description: 'Order not found' })
    async findByOrderNumber(@Param('orderNumber') orderNumber: string): Promise<OrderResponseDto> {
        return this.ordersService.findByOrderNumber(orderNumber);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get order by ID (Admin)' })
    @ApiParam({ name: 'id', description: 'Order ID' })
    @ApiResponse({ status: 200, description: 'Order found', type: OrderResponseDto })
    @ApiResponse({ status: 404, description: 'Order not found' })
    async findOne(@Param('id') id: string): Promise<OrderResponseDto> {
        return this.ordersService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update order (Admin)' })
    @ApiParam({ name: 'id', description: 'Order ID' })
    @ApiBody({ type: UpdateOrderDto })
    @ApiResponse({ status: 200, description: 'Order updated successfully', type: OrderResponseDto })
    @ApiResponse({ status: 404, description: 'Order not found' })
    async updateOrder(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto): Promise<OrderResponseDto> {
        return this.ordersService.updateOrder(id, updateOrderDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Delete order (Admin)' })
    @ApiParam({ name: 'id', description: 'Order ID' })
    @ApiResponse({ status: 200, description: 'Order deleted successfully' })
    @ApiResponse({ status: 404, description: 'Order not found' })
    async deleteOrder(@Param('id') id: string): Promise<void> {
        return this.ordersService.deleteOrder(id);
    }
} 