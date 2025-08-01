import { Controller, Get, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StatisticsService } from './statistics.service';

@ApiTags('Statistics')
@Controller('admin/statistics')
export class StatisticsController {
    constructor(private readonly statisticsService: StatisticsService) { }

    @Get('orders/total')
    @ApiOperation({ summary: 'Get total number of orders' })
    @ApiResponse({ status: 200, description: 'Returns total number of orders' })
    async getTotalOrders() {
        const count = await this.statisticsService.getTotalOrders();
        return { count };
    }

    @Get('orders/today')
    @ApiOperation({ summary: 'Get number of orders today' })
    @ApiResponse({ status: 200, description: 'Returns number of orders today' })
    async getTodayOrders() {
        const count = await this.statisticsService.getTodayOrders();
        return { count };
    }

    @Get('revenue/today')
    @ApiOperation({ summary: 'Get revenue for today' })
    @ApiResponse({ status: 200, description: 'Returns revenue for today' })
    async getTodayRevenue() {
        const revenue = await this.statisticsService.getTodayRevenue();
        return { revenue };
    }

    @Get('revenue/weekly')
    @ApiOperation({ summary: 'Get revenue for current week' })
    @ApiResponse({ status: 200, description: 'Returns revenue for current week' })
    async getWeeklyRevenue() {
        const revenue = await this.statisticsService.getWeeklyRevenue();
        return { revenue };
    }

    @Get('revenue/monthly')
    @ApiOperation({ summary: 'Get revenue for current month' })
    @ApiResponse({ status: 200, description: 'Returns revenue for current month' })
    async getMonthlyRevenue() {
        const revenue = await this.statisticsService.getMonthlyRevenue();
        return { revenue };
    }

    @Get('products/active')
    @ApiOperation({ summary: 'Get number of active products' })
    @ApiResponse({ status: 200, description: 'Returns number of active products' })
    async getTotalActiveProducts() {
        const count = await this.statisticsService.getTotalActiveProducts();
        return { count };
    }

    @Get('orders/by-status')
    @ApiOperation({ summary: 'Get number of orders by status' })
    @ApiResponse({ status: 200, description: 'Returns number of orders for given status' })
    async getOrdersByStatus(@Query('status') status: string) {
        const count = await this.statisticsService.getOrdersByStatus(status);
        return { count };
    }

    @Get('orders/average-value')
    @ApiOperation({ summary: 'Get average order value' })
    @ApiResponse({ status: 200, description: 'Returns average order value' })
    async getAverageOrderValue() {
        const average = await this.statisticsService.getAverageOrderValue();
        return { average };
    }

    @Get('orders/recent')
    @ApiOperation({ summary: 'Get recent orders' })
    @ApiResponse({ status: 200, description: 'Returns list of recent orders' })
    async getRecentOrders(@Query('limit', ParseIntPipe) limit: number = 5) {
        return this.statisticsService.getRecentOrders(limit);
    }

    @Get('daily')
    @ApiOperation({ summary: 'Get daily statistics' })
    @ApiResponse({ status: 200, description: 'Returns daily statistics including orders, revenue, and average order value' })
    async getDailyStats() {
        return this.statisticsService.getDailyStats();
    }
} 