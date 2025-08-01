import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
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

    async getTotalOrders(): Promise<number> {
        return this.orderRepository.count();
    }

    async getTodayOrders(): Promise<number> {
        const start = this.getStartOfDay();
        const end = this.getEndOfDay();

        return this.orderRepository.count({
            where: {
                createdAt: Between(start, end)
            }
        });
    }

    async getTodayRevenue(): Promise<number> {
        const start = this.getStartOfDay();
        const end = this.getEndOfDay();

        const result = await this.orderRepository
            .createQueryBuilder('order')
            .select('SUM(order.total)', 'total')
            .where('order.createdAt BETWEEN :start AND :end', { start, end })
            .andWhere('order.status = :status', { status: 'completed' })
            .getRawOne();

        return result.total || 0;
    }

    async getWeeklyRevenue(): Promise<number> {
        const start = this.getStartOfWeek();
        const end = this.getEndOfDay();
        const result = await this.orderRepository
            .createQueryBuilder('order')
            .select('SUM(order.total)', 'total')
            .where('order.createdAt BETWEEN :start AND :end', { start, end })
            .andWhere('order.status = :status', { status: 'completed' })
            .getRawOne();

        return result.total || 0;
    }

    async getMonthlyRevenue(): Promise<number> {
        const start = this.getStartOfMonth();
        const end = this.getEndOfDay();

        const result = await this.orderRepository
            .createQueryBuilder('order')
            .select('SUM(order.total)', 'total')
            .where('order.createdAt BETWEEN :start AND :end', { start, end })
            .andWhere('order.status = :status', { status: 'completed' })
            .getRawOne();

        return result.total || 0;
    }

    async getTotalActiveProducts(): Promise<number> {
        return this.productRepository.count({
            where: {
                visible: true,
                available: true
            }
        });
    }

    async getOrdersByStatus(status: string): Promise<number> {
        return this.orderRepository.count({
            where: {
                status
            }
        });
    }

    async getAverageOrderValue(): Promise<number> {
        const result = await this.orderRepository
            .createQueryBuilder('order')
            .select('AVG(order.total)', 'average')
            .where('order.status = :status', { status: 'completed' })
            .getRawOne();

        return Math.round(result.average) || 0;
    }

    async getRecentOrders(limit: number = 5): Promise<Order[]> {
        return this.orderRepository.find({
            order: {
                createdAt: 'DESC'
            },
            take: limit
        });
    }

    async getDailyStats(date: Date = new Date()): Promise<{
        orders: number;
        revenue: number;
        averageOrderValue: number;
    }> {
        const start = this.getStartOfDay(date);
        const end = this.getEndOfDay(date);

        const ordersCount = await this.orderRepository.count({
            where: {
                createdAt: Between(start, end)
            }
        });

        const revenue = await this.orderRepository
            .createQueryBuilder('order')
            .select('SUM(order.total)', 'total')
            .where('order.createdAt BETWEEN :start AND :end', { start, end })
            .andWhere('order.status = :status', { status: 'completed' })
            .getRawOne();

        const averageOrder = await this.orderRepository
            .createQueryBuilder('order')
            .select('AVG(order.total)', 'average')
            .where('order.createdAt BETWEEN :start AND :end', { start, end })
            .andWhere('order.status = :status', { status: 'completed' })
            .getRawOne();

        return {
            orders: ordersCount,
            revenue: revenue.total || 0,
            averageOrderValue: Math.round(averageOrder.average) || 0
        };
    }
} 