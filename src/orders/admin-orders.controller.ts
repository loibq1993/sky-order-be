import { Controller, Get, Query, Param, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { OrderStatus, OrderResponseDto, UpdateOrderStatusDto } from './orders.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RestaurantId } from '../auth/decorators/restaurant.decorator';

@ApiTags('admin-orders')
@Controller('admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  'super_admin',
  'restaurant_owner',
  'restaurant_manager',
  'restaurant_staff',
  'staff_reception',
  'staff_kitchen',
  'staff_waiter',
)
@ApiBearerAuth()
export class AdminOrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Get('count/total')
    @ApiOperation({ summary: 'Get total number of orders' })
    @ApiResponse({ status: 200, description: 'Returns total number of orders' })
    async getTotalOrders(@RestaurantId() restaurantId?: string) {
        const count = await this.ordersService.getTotalOrdersCount(restaurantId);
        return { count };
    }

    @Get('count/by-status')
    @ApiOperation({ summary: 'Get number of orders by status' })
    @ApiResponse({ status: 200, description: 'Returns number of orders for given statuses' })
    async getOrdersByStatus(
        @Query('statuses') statuses: string,
        @Query('fromDate') fromDate?: string,
        @Query('toDate') toDate?: string,
        @Query('includeOpenUnpaid') includeOpenUnpaid?: string,
        @RestaurantId() restaurantId?: string
    ) {
        const statusArray = statuses.split(',') as OrderStatus[];
        const count = await this.ordersService.getOrdersCountByStatuses(
            statusArray,
            restaurantId,
            fromDate,
            toDate,
            includeOpenUnpaid === '1' || includeOpenUnpaid === 'true',
        );
        return { count };
    }

    @Get('revenue/today')
    @ApiOperation({ summary: 'Get total revenue for today' })
    @ApiResponse({ status: 200, description: 'Returns total revenue for today' })
    async getTodayRevenue(@RestaurantId() restaurantId?: string) {
        const revenue = await this.ordersService.getTodayRevenue(restaurantId);
        return { revenue };
    }

    @Get('recent')
    @ApiOperation({ summary: 'Get recent orders' })
    @ApiResponse({ status: 200, description: 'Returns list of recent orders' })
    async getRecentOrders(
        @Query('limit') limit: string = '5',
        @RestaurantId() restaurantId?: string
    ) {
        const limitNum = parseInt(limit, 10);
        return this.ordersService.getRecentOrders(limitNum, restaurantId);
    }

    @Get('filter/status/multiple')
    @ApiOperation({ summary: 'Get orders by multiple statuses' })
    @ApiQuery({ name: 'statuses', description: 'Comma-separated list of order statuses' })
    @ApiQuery({ name: 'fromDate', required: false, description: 'YYYY-MM-DD (VN timezone)' })
    @ApiQuery({ name: 'toDate', required: false, description: 'YYYY-MM-DD (VN timezone)' })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'orderNumber', required: false, description: 'Partial order number search' })
    @ApiResponse({ status: 200, description: 'Returns orders matching the specified statuses', type: [OrderResponseDto] })
    async getOrdersByMultipleStatuses(
        @Query('statuses') statuses?: string,
        @Query('fromDate') fromDate?: string,
        @Query('toDate') toDate?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('orderNumber') orderNumber?: string,
        @Query('includeOpenUnpaid') includeOpenUnpaid?: string,
        @RestaurantId() restaurantId?: string
    ) {
        const statusArray = (statuses ?? '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean) as OrderStatus[];
        const pageNum = page ? parseInt(page, 10) : undefined;
        const limitNum = limit ? parseInt(limit, 10) : undefined;
        return this.ordersService.searchOrders({
            statuses: statusArray.length ? statusArray : undefined,
            fromDate,
            toDate,
            page: pageNum,
            limit: limitNum,
            orderNumber,
            includeOpenUnpaid:
                includeOpenUnpaid === '1' || includeOpenUnpaid === 'true',
            restaurantId,
        });
    }

    @Patch(':id/status')
    @ApiOperation({ summary: 'Update order status' })
    @ApiParam({ name: 'id', description: 'Order ID' })
    @ApiResponse({ status: 200, description: 'Order status updated successfully', type: OrderResponseDto })
    @ApiResponse({ status: 404, description: 'Order not found' })
    async updateOrderStatus(
        @Param('id') id: string,
        @Body() updateStatusDto: UpdateOrderStatusDto,
        @RestaurantId() restaurantId?: string
    ) {
        return this.ordersService.updateOrderStatus(
            id,
            updateStatusDto.status,
            restaurantId,
            updateStatusDto.paymentMethod,
        );
    }
} 