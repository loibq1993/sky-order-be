import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull } from 'typeorm';
import { Order } from '../entities/order.entity';
import { Product } from '../entities/product.entity';

@Injectable()
export class StatisticsService {
    constructor(
        @InjectRepository(Order)
        private readonly orderRepository: Repository<Order>,
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
    ) { }

    private getStartOfDay(date: Date = new Date()): Date {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    private getEndOfDay(date: Date = new Date()): Date {
        const d = new Date(date);
        d.setHours(23, 59, 59, 999);
        return d;
    }

    private getStartOfWeek(date: Date = new Date()): Date {
        const d = new Date(date);
        d.setDate(d.getDate() - d.getDay());
        return this.getStartOfDay(d);
    }

    private getStartOfMonth(date: Date = new Date()): Date {
        const d = new Date(date);
        d.setDate(1);
        return this.getStartOfDay(d);
    }

    private getMonthRange(month?: number, year?: number): { start: Date; end: Date } | null {
        if (!month || !year || month < 1 || month > 12) {
            return null;
        }
        const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
        const end = new Date(year, month, 0, 23, 59, 59, 999);
        return { start, end };
    }

    async getTotalOrders(restaurantId?: string, month?: number, year?: number): Promise<number> {
        const range = this.getMonthRange(month, year);
        const whereCondition: any = { deletedAt: IsNull() };
        if (range) {
            whereCondition.createdAt = Between(range.start, range.end);
        }
        if (restaurantId) {
            whereCondition.restaurantId = restaurantId;
        }
        return this.orderRepository.count({ where: whereCondition });
    }

    async getTodayOrders(restaurantId?: string, month?: number, year?: number): Promise<number> {
        const range = this.getMonthRange(month, year);
        const start = range ? range.start : this.getStartOfDay();
        const end = range ? range.end : this.getEndOfDay();
        const whereCondition: any = {
            createdAt: Between(start, end),
            deletedAt: IsNull(),
        };
        if (restaurantId) {
            whereCondition.restaurantId = restaurantId;
        }
        return this.orderRepository.count({ where: whereCondition });
    }

    async getTodayRevenue(restaurantId?: string, month?: number, year?: number): Promise<number> {
        const range = this.getMonthRange(month, year);
        const start = range ? range.start : this.getStartOfDay();
        const end = range ? range.end : this.getEndOfDay();
        const query = this.orderRepository
            .createQueryBuilder('order')
            .select('SUM(order.total)', 'total')
            .where('order.createdAt BETWEEN :start AND :end', { start, end })
            .andWhere('order.status = :status', { status: 'completed' })
            .andWhere('order.deletedAt IS NULL');
        if (restaurantId) {
            query.andWhere('order.restaurantId = :restaurantId', { restaurantId });
        }
        const result = await query.getRawOne();

        return result.total || 0;
    }

    async getWeeklyRevenue(restaurantId?: string, month?: number, year?: number): Promise<number> {
        const range = this.getMonthRange(month, year);
        const start = range ? range.start : this.getStartOfWeek();
        const end = range ? range.end : this.getEndOfDay();
        const query = this.orderRepository
            .createQueryBuilder('order')
            .select('SUM(order.total)', 'total')
            .where('order.createdAt BETWEEN :start AND :end', { start, end })
            .andWhere('order.status = :status', { status: 'completed' })
            .andWhere('order.deletedAt IS NULL');
        if (restaurantId) {
            query.andWhere('order.restaurantId = :restaurantId', { restaurantId });
        }
        const result = await query.getRawOne();

        return result.total || 0;
    }

    async getMonthlyRevenue(restaurantId?: string, month?: number, year?: number): Promise<number> {
        const range = this.getMonthRange(month, year);
        const start = range ? range.start : this.getStartOfMonth();
        const end = range ? range.end : this.getEndOfDay();
        const query = this.orderRepository
            .createQueryBuilder('order')
            .select('SUM(order.total)', 'total')
            .where('order.createdAt BETWEEN :start AND :end', { start, end })
            .andWhere('order.status = :status', { status: 'completed' })
            .andWhere('order.deletedAt IS NULL');
        if (restaurantId) {
            query.andWhere('order.restaurantId = :restaurantId', { restaurantId });
        }
        const result = await query.getRawOne();

        return result.total || 0;
    }

    async getTotalActiveProducts(restaurantId?: string, _month?: number, _year?: number): Promise<number> {
        const whereCondition: any = {
            visible: true,
            available: true,
            deletedAt: IsNull(),
        };
        if (restaurantId) {
            whereCondition.restaurantId = restaurantId;
        }
        return this.productRepository.count({ where: whereCondition });
    }

    async getOrdersByStatus(status: string, restaurantId?: string, month?: number, year?: number): Promise<number> {
        const range = this.getMonthRange(month, year);
        const whereCondition: any = {
            status,
            deletedAt: IsNull(),
        };
        if (range) {
            whereCondition.createdAt = Between(range.start, range.end);
        }
        if (restaurantId) {
            whereCondition.restaurantId = restaurantId;
        }
        return this.orderRepository.count({ where: whereCondition });
    }

    async getAverageOrderValue(restaurantId?: string, month?: number, year?: number): Promise<number> {
        const range = this.getMonthRange(month, year);
        const query = this.orderRepository
            .createQueryBuilder('order')
            .select('AVG(order.total)', 'average')
            .where('order.status = :status', { status: 'completed' })
            .andWhere('order.deletedAt IS NULL');
        if (range) {
            query.andWhere('order.createdAt BETWEEN :start AND :end', { start: range.start, end: range.end });
        }
        if (restaurantId) {
            query.andWhere('order.restaurantId = :restaurantId', { restaurantId });
        }
        const result = await query.getRawOne();

        return Math.round(result.average) || 0;
    }

    async getRecentOrders(limit: number = 5, restaurantId?: string, month?: number, year?: number): Promise<Order[]> {
        const range = this.getMonthRange(month, year);
        const whereCondition: any = { deletedAt: IsNull() };
        if (range) {
            whereCondition.createdAt = Between(range.start, range.end);
        }
        if (restaurantId) {
            whereCondition.restaurantId = restaurantId;
        }
        return this.orderRepository.find({
            where: whereCondition,
            order: {
                createdAt: 'DESC'
            },
            take: limit
        });
    }

    async getDailyStats(date: Date = new Date(), restaurantId?: string, month?: number, year?: number): Promise<{
        orders: number;
        revenue: number;
        averageOrderValue: number;
    }> {
        const range = this.getMonthRange(month, year);
        const start = range ? range.start : this.getStartOfDay(date);
        const end = range ? range.end : this.getEndOfDay(date);
        const whereCondition: any = {
            createdAt: Between(start, end),
            deletedAt: IsNull(),
        };
        if (restaurantId) {
            whereCondition.restaurantId = restaurantId;
        }
        const ordersCount = await this.orderRepository.count({ where: whereCondition });

        const revenueQuery = this.orderRepository
            .createQueryBuilder('order')
            .select('SUM(order.total)', 'total')
            .where('order.createdAt BETWEEN :start AND :end', { start, end })
            .andWhere('order.status = :status', { status: 'completed' })
            .andWhere('order.deletedAt IS NULL');
        const averageQuery = this.orderRepository
            .createQueryBuilder('order')
            .select('AVG(order.total)', 'average')
            .where('order.createdAt BETWEEN :start AND :end', { start, end })
            .andWhere('order.status = :status', { status: 'completed' })
            .andWhere('order.deletedAt IS NULL');
        if (restaurantId) {
            revenueQuery.andWhere('order.restaurantId = :restaurantId', { restaurantId });
            averageQuery.andWhere('order.restaurantId = :restaurantId', { restaurantId });
        }

        const revenue = await revenueQuery.getRawOne();
        const averageOrder = await averageQuery.getRawOne();

        return {
            orders: ordersCount,
            revenue: revenue.total || 0,
            averageOrderValue: Math.round(averageOrder.average) || 0
        };
    }
} 