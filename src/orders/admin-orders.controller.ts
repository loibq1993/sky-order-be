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
import {
    CreateOrderDto,
    UpdateOrderDto,
    OrderResponseDto,
    UpdateOrderStatusDto,
    DateRangeDto,
    CustomerSearchDto,
    CustomerPhoneSearchDto,
    MultipleStatusFilterDto,
    ExcludeStatusFilterDto,
    OrderStatus
} from './orders.dto';

@ApiTags('orders-admin')
@Controller('admin/orders')
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
    @ApiParam({ name: 'status', description: 'Order status', enum: ['pending', 'confirmed', 'preparing', 'ready', 'served', 'delivered', 'completed', 'cancelled'] })
    @ApiResponse({ status: 200, description: 'List of orders by status', type: [OrderResponseDto] })
    async findByStatus(@Param('status') status: string): Promise<OrderResponseDto[]> {
        return this.ordersService.getOrdersByStatus(status);
    }

    @Post('filter/status/multiple')
    @ApiOperation({ summary: 'Get orders by multiple statuses (Admin)' })
    @ApiBody({ type: MultipleStatusFilterDto })
    @ApiResponse({ status: 200, description: 'List of orders by multiple statuses', type: [OrderResponseDto] })
    async findByMultipleStatuses(@Body() filterDto: MultipleStatusFilterDto): Promise<OrderResponseDto[]> {
        return this.ordersService.getOrdersByMultipleStatuses(filterDto.statuses);
    }

    @Post('filter/status/exclude')
    @ApiOperation({ summary: 'Get orders excluding specific statuses (Admin)' })
    @ApiBody({ type: ExcludeStatusFilterDto })
    @ApiResponse({ status: 200, description: 'List of orders excluding specified statuses', type: [OrderResponseDto] })
    async findByExcludingStatuses(@Body() filterDto: ExcludeStatusFilterDto): Promise<OrderResponseDto[]> {
        return this.ordersService.getOrdersExcludingStatuses(filterDto.excludedStatuses);
    }

    @Get('filter/status/multiple')
    @ApiOperation({ summary: 'Get orders by multiple statuses via query params (Admin)' })
    @ApiQuery({ name: 'statuses', description: 'Comma-separated list of statuses', example: 'pending,confirmed,preparing' })
    @ApiResponse({ status: 200, description: 'List of orders by multiple statuses', type: [OrderResponseDto] })
    async findByMultipleStatusesQuery(@Query('statuses') statuses: string): Promise<OrderResponseDto[]> {
        const statusArray = statuses.split(',').map(s => s.trim()) as OrderStatus[];
        return this.ordersService.getOrdersByMultipleStatuses(statusArray);
    }

    @Get('filter/status/exclude')
    @ApiOperation({ summary: 'Get orders excluding specific statuses via query params (Admin)' })
    @ApiQuery({ name: 'excludedStatuses', description: 'Comma-separated list of statuses to exclude', example: 'completed,cancelled' })
    @ApiResponse({ status: 200, description: 'List of orders excluding specified statuses', type: [OrderResponseDto] })
    async findByExcludingStatusesQuery(@Query('excludedStatuses') excludedStatuses: string): Promise<OrderResponseDto[]> {
        const statusArray = excludedStatuses.split(',').map(s => s.trim()) as OrderStatus[];
        return this.ordersService.getOrdersExcludingStatuses(statusArray);
    }

    @Get('type/:orderType')
    @ApiOperation({ summary: 'Get orders by type (Admin)' })
    @ApiParam({ name: 'orderType', description: 'Order type', enum: ['dine_in', 'takeaway', 'delivery'] })
    @ApiResponse({ status: 200, description: 'List of orders by type', type: [OrderResponseDto] })
    async findByType(@Param('orderType') orderType: string): Promise<OrderResponseDto[]> {
        return this.ordersService.getOrdersByType(orderType);
    }

    @Get('table/:tableId')
    @ApiOperation({ summary: 'Get orders by table (Admin)' })
    @ApiParam({ name: 'tableId', description: 'Table ID' })
    @ApiResponse({ status: 200, description: 'List of orders for table', type: [OrderResponseDto] })
    async findByTable(@Param('tableId') tableId: string): Promise<OrderResponseDto[]> {
        return this.ordersService.getOrdersByTable(tableId);
    }

    @Get('table/:tableId/active')
    @ApiOperation({ summary: 'Get active order by table (Admin)' })
    @ApiParam({ name: 'tableId', description: 'Table ID' })
    @ApiResponse({ status: 200, description: 'Active order for table', type: OrderResponseDto })
    @ApiResponse({ status: 404, description: 'No active order found' })
    async getActiveOrderByTable(@Param('tableId') tableId: string): Promise<OrderResponseDto | null> {
        return this.ordersService.getActiveOrderByTable(tableId);
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

    @Delete(':id/soft')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Soft delete order (Admin)' })
    @ApiParam({ name: 'id', description: 'Order ID' })
    @ApiResponse({ status: 200, description: 'Order soft deleted successfully' })
    @ApiResponse({ status: 404, description: 'Order not found' })
    async softDeleteOrder(@Param('id') id: string): Promise<void> {
        return this.ordersService.softDeleteOrder(id);
    }

    @Patch(':id/restore')
    @ApiOperation({ summary: 'Restore soft deleted order (Admin)' })
    @ApiParam({ name: 'id', description: 'Order ID' })
    @ApiResponse({ status: 200, description: 'Order restored successfully', type: OrderResponseDto })
    @ApiResponse({ status: 404, description: 'Order not found' })
    async restoreOrder(@Param('id') id: string): Promise<OrderResponseDto> {
        return this.ordersService.restoreOrder(id);
    }

    @Patch(':id/status')
    @ApiOperation({ summary: 'Update order status (Admin)' })
    @ApiParam({ name: 'id', description: 'Order ID' })
    @ApiBody({ type: UpdateOrderStatusDto })
    @ApiResponse({ status: 200, description: 'Order status updated successfully', type: OrderResponseDto })
    @ApiResponse({ status: 404, description: 'Order not found' })
    async updateOrderStatus(@Param('id') id: string, @Body() updateOrderStatusDto: UpdateOrderStatusDto): Promise<OrderResponseDto> {
        return this.ordersService.updateOrderStatus(id, updateOrderStatusDto.status);
    }

    @Get('deleted/all')
    @ApiOperation({ summary: 'Get all orders including deleted ones (Admin)' })
    @ApiResponse({ status: 200, description: 'List of all orders including deleted', type: [OrderResponseDto] })
    async findAllWithDeleted(): Promise<OrderResponseDto[]> {
        return this.ordersService.findAllWithDeleted();
    }

    @Get('deleted/:id')
    @ApiOperation({ summary: 'Get soft deleted order by ID (Admin)' })
    @ApiParam({ name: 'id', description: 'Order ID' })
    @ApiResponse({ status: 200, description: 'Soft deleted order found', type: OrderResponseDto })
    @ApiResponse({ status: 404, description: 'Order not found' })
    async findOneWithDeleted(@Param('id') id: string): Promise<OrderResponseDto> {
        return this.ordersService.findOneWithDeleted(id);
    }

    @Get('search/customer')
    @ApiOperation({ summary: 'Search orders by customer name (Admin)' })
    @ApiQuery({ name: 'customerName', description: 'Customer name to search for' })
    @ApiResponse({ status: 200, description: 'Orders found by customer name', type: [OrderResponseDto] })
    async searchByCustomer(@Query('customerName') customerName: string): Promise<OrderResponseDto[]> {
        return this.ordersService.getOrdersByCustomer(customerName);
    }

    @Get('search/customer-phone')
    @ApiOperation({ summary: 'Search orders by customer phone (Admin)' })
    @ApiQuery({ name: 'customerPhone', description: 'Customer phone to search for' })
    @ApiResponse({ status: 200, description: 'Orders found by customer phone', type: [OrderResponseDto] })
    async searchByCustomerPhone(@Query('customerPhone') customerPhone: string): Promise<OrderResponseDto[]> {
        return this.ordersService.getOrdersByCustomerPhone(customerPhone);
    }

    @Get('search/date-range')
    @ApiOperation({ summary: 'Get orders by date range (Admin)' })
    @ApiQuery({ name: 'startDate', description: 'Start date (ISO string)' })
    @ApiQuery({ name: 'endDate', description: 'End date (ISO string)' })
    @ApiResponse({ status: 200, description: 'Orders found in date range', type: [OrderResponseDto] })
    async getOrdersByDateRange(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string
    ): Promise<OrderResponseDto[]> {
        return this.ordersService.getOrdersByDateRange(new Date(startDate), new Date(endDate));
    }

    @Get('stats/summary')
    @ApiOperation({ summary: 'Get order statistics summary (Admin)' })
    @ApiResponse({ status: 200, description: 'Order statistics summary' })
    async getOrderStats(): Promise<any> {
        const allOrders = await this.ordersService.findAll();

        const stats = {
            totalOrders: allOrders.length,
            totalRevenue: allOrders.reduce((sum, order) => sum + order.totalAmount, 0),
            ordersByStatus: {},
            ordersByType: {},
            averageOrderValue: 0
        };

        // Calculate orders by status
        allOrders.forEach(order => {
            stats.ordersByStatus[order.status] = (stats.ordersByStatus[order.status] || 0) + 1;
            stats.ordersByType[order.orderType] = (stats.ordersByType[order.orderType] || 0) + 1;
        });

        // Calculate average order value
        if (allOrders.length > 0) {
            stats.averageOrderValue = stats.totalRevenue / allOrders.length;
        }

        return stats;
    }
} 