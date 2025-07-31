import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { OrderStatus, OrderResponseDto } from './orders.dto';

@ApiTags('admin-orders')
@Controller('admin/orders')
export class AdminOrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Get('count/total')
    @ApiOperation({ summary: 'Get total number of orders' })
    @ApiResponse({ status: 200, description: 'Returns total number of orders' })
    async getTotalOrders() {
        const count = await this.ordersService.getTotalOrdersCount();
        return { count };
    }

    @Get('count/by-status')
    @ApiOperation({ summary: 'Get number of orders by status' })
    @ApiResponse({ status: 200, description: 'Returns number of orders for given statuses' })
    async getOrdersByStatus(@Query('statuses') statuses: string) {
        const statusArray = statuses.split(',') as OrderStatus[];
        const count = await this.ordersService.getOrdersCountByStatuses(statusArray);
        return { count };
    }

    @Get('revenue/today')
    @ApiOperation({ summary: 'Get total revenue for today' })
    @ApiResponse({ status: 200, description: 'Returns total revenue for today' })
    async getTodayRevenue() {
        const revenue = await this.ordersService.getTodayRevenue();
        return { revenue };
    }

    @Get('recent')
    @ApiOperation({ summary: 'Get recent orders' })
    @ApiResponse({ status: 200, description: 'Returns list of recent orders' })
    async getRecentOrders(@Query('limit') limit: string = '5') {
        const limitNum = parseInt(limit, 10);
        return this.ordersService.getRecentOrders(limitNum);
    }

    @Get('filter/status/multiple')
    @ApiOperation({ summary: 'Get orders by multiple statuses' })
    @ApiQuery({ name: 'statuses', description: 'Comma-separated list of order statuses' })
    @ApiResponse({ status: 200, description: 'Returns orders matching the specified statuses', type: [OrderResponseDto] })
    async getOrdersByMultipleStatuses(@Query('statuses') statuses: string) {
        const statusArray = statuses.split(',') as OrderStatus[];
        return this.ordersService.getOrdersByMultipleStatuses(statusArray);
    }
} 