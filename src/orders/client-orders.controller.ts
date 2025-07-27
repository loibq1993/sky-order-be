import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Patch,
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

@ApiTags('orders-client')
@Controller('orders')
@UseInterceptors(ClassSerializerInterceptor)
export class ClientOrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new order (Client)' })
    @ApiBody({ type: CreateOrderDto })
    @ApiResponse({ status: 201, description: 'Order created successfully', type: OrderResponseDto })
    @ApiResponse({ status: 400, description: 'Bad request' })
    async createOrder(@Body() createOrderDto: CreateOrderDto): Promise<OrderResponseDto> {
        return this.ordersService.createOrder(createOrderDto);
    }

    @Get('number/:orderNumber')
    @ApiOperation({ summary: 'Get order by order number (Client)' })
    @ApiParam({ name: 'orderNumber', description: 'Order number' })
    @ApiResponse({ status: 200, description: 'Order found', type: OrderResponseDto })
    @ApiResponse({ status: 404, description: 'Order not found' })
    async findByOrderNumber(@Param('orderNumber') orderNumber: string): Promise<OrderResponseDto> {
        return this.ordersService.findByOrderNumber(orderNumber);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get order by ID (Client)' })
    @ApiParam({ name: 'id', description: 'Order ID' })
    @ApiResponse({ status: 200, description: 'Order found', type: OrderResponseDto })
    @ApiResponse({ status: 404, description: 'Order not found' })
    async findOne(@Param('id') id: string): Promise<OrderResponseDto> {
        return this.ordersService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Add items to order (Client)' })
    @ApiParam({ name: 'id', description: 'Order ID' })
    @ApiBody({ type: UpdateOrderDto })
    @ApiResponse({ status: 200, description: 'Order updated successfully', type: OrderResponseDto })
    @ApiResponse({ status: 404, description: 'Order not found' })
    async updateOrder(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto): Promise<OrderResponseDto> {
        return this.ordersService.updateOrder(id, updateOrderDto);
    }
} 