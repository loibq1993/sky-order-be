import { Controller, Get, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StatisticsService } from './statistics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RestaurantId } from '../auth/decorators/restaurant.decorator';

@ApiTags('Statistics')
@Controller('admin/statistics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'restaurant_owner', 'restaurant_manager', 'restaurant_staff')
@ApiBearerAuth()
export class StatisticsController {
    constructor(private readonly statisticsService: StatisticsService) { }

    private parseMonthYear(month?: string, year?: string): { month?: number; year?: number } {
        const monthNum = month ? parseInt(month, 10) : undefined;
        const yearNum = year ? parseInt(year, 10) : undefined;
        return {
            month: monthNum && !Number.isNaN(monthNum) ? monthNum : undefined,
            year: yearNum && !Number.isNaN(yearNum) ? yearNum : undefined,
        };
    }

    @Get('orders/total')
    @ApiOperation({ summary: 'Get total number of orders' })
    @ApiResponse({ status: 200, description: 'Returns total number of orders' })
    async getTotalOrders(
        @RestaurantId() restaurantId?: string,
        @Query('month') month?: string,
        @Query('year') year?: string
    ) {
        const { month: monthNum, year: yearNum } = this.parseMonthYear(month, year);
        const count = await this.statisticsService.getTotalOrders(restaurantId, monthNum, yearNum);
        return { count };
    }

    @Get('orders/today')
    @ApiOperation({ summary: 'Get number of orders today' })
    @ApiResponse({ status: 200, description: 'Returns number of orders today' })
    async getTodayOrders(
        @RestaurantId() restaurantId?: string,
        @Query('month') month?: string,
        @Query('year') year?: string
    ) {
        const { month: monthNum, year: yearNum } = this.parseMonthYear(month, year);
        const count = await this.statisticsService.getTodayOrders(restaurantId, monthNum, yearNum);
        return { count };
    }

    @Get('revenue/today')
    @ApiOperation({ summary: 'Get revenue for today' })
    @ApiResponse({ status: 200, description: 'Returns revenue for today' })
    async getTodayRevenue(
        @RestaurantId() restaurantId?: string,
        @Query('month') month?: string,
        @Query('year') year?: string
    ) {
        const { month: monthNum, year: yearNum } = this.parseMonthYear(month, year);
        const revenue = await this.statisticsService.getTodayRevenue(restaurantId, monthNum, yearNum);
        return { revenue };
    }

    @Get('revenue/weekly')
    @ApiOperation({ summary: 'Get revenue for current week' })
    @ApiResponse({ status: 200, description: 'Returns revenue for current week' })
    async getWeeklyRevenue(
        @RestaurantId() restaurantId?: string,
        @Query('month') month?: string,
        @Query('year') year?: string
    ) {
        const { month: monthNum, year: yearNum } = this.parseMonthYear(month, year);
        const revenue = await this.statisticsService.getWeeklyRevenue(restaurantId, monthNum, yearNum);
        return { revenue };
    }

    @Get('revenue/monthly')
    @ApiOperation({ summary: 'Get revenue for current month' })
    @ApiResponse({ status: 200, description: 'Returns revenue for current month' })
    async getMonthlyRevenue(
        @RestaurantId() restaurantId?: string,
        @Query('month') month?: string,
        @Query('year') year?: string
    ) {
        const { month: monthNum, year: yearNum } = this.parseMonthYear(month, year);
        const revenue = await this.statisticsService.getMonthlyRevenue(restaurantId, monthNum, yearNum);
        return { revenue };
    }

    @Get('products/active')
    @ApiOperation({ summary: 'Get number of active products' })
    @ApiResponse({ status: 200, description: 'Returns number of active products' })
    async getTotalActiveProducts(
        @RestaurantId() restaurantId?: string,
        @Query('month') month?: string,
        @Query('year') year?: string
    ) {
        const { month: monthNum, year: yearNum } = this.parseMonthYear(month, year);
        const count = await this.statisticsService.getTotalActiveProducts(restaurantId, monthNum, yearNum);
        return { count };
    }

    @Get('orders/by-status')
    @ApiOperation({ summary: 'Get number of orders by status' })
    @ApiResponse({ status: 200, description: 'Returns number of orders for given status' })
    async getOrdersByStatus(
        @Query('status') status: string,
        @RestaurantId() restaurantId?: string,
        @Query('month') month?: string,
        @Query('year') year?: string
    ) {
        const { month: monthNum, year: yearNum } = this.parseMonthYear(month, year);
        const count = await this.statisticsService.getOrdersByStatus(status, restaurantId, monthNum, yearNum);
        return { count };
    }

    @Get('orders/average-value')
    @ApiOperation({ summary: 'Get average order value' })
    @ApiResponse({ status: 200, description: 'Returns average order value' })
    async getAverageOrderValue(
        @RestaurantId() restaurantId?: string,
        @Query('month') month?: string,
        @Query('year') year?: string
    ) {
        const { month: monthNum, year: yearNum } = this.parseMonthYear(month, year);
        const average = await this.statisticsService.getAverageOrderValue(restaurantId, monthNum, yearNum);
        return { average };
    }

    @Get('orders/recent')
    @ApiOperation({ summary: 'Get recent orders' })
    @ApiResponse({ status: 200, description: 'Returns list of recent orders' })
    async getRecentOrders(
        @Query('limit', ParseIntPipe) limit: number = 5,
        @RestaurantId() restaurantId?: string,
        @Query('month') month?: string,
        @Query('year') year?: string
    ) {
        const { month: monthNum, year: yearNum } = this.parseMonthYear(month, year);
        return this.statisticsService.getRecentOrders(limit, restaurantId, monthNum, yearNum);
    }

    @Get('daily')
    @ApiOperation({ summary: 'Get daily statistics' })
    @ApiResponse({ status: 200, description: 'Returns daily statistics including orders, revenue, and average order value' })
    async getDailyStats(
        @RestaurantId() restaurantId?: string,
        @Query('month') month?: string,
        @Query('year') year?: string
    ) {
        const { month: monthNum, year: yearNum } = this.parseMonthYear(month, year);
        return this.statisticsService.getDailyStats(undefined, restaurantId, monthNum, yearNum);
    }
} 