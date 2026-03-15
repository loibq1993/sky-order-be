import { Injectable } from '@nestjs/common';
import { Between, IsNull } from 'typeorm';
import { TenantOrder } from '../entities/tenant/tenant-order.entity';
import { TenantProduct } from '../entities/tenant/tenant-product.entity';
import { TenantSchemaService } from '../tenant/tenant-schema.service';

@Injectable()
export class StatisticsService {
  constructor(private tenantSchemaService: TenantSchemaService) {}

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
    if (!month || !year || month < 1 || month > 12) return null;
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    return { start, end };
  }

  async getTotalOrders(
    restaurantId?: string,
    month?: number,
    year?: number,
  ): Promise<number> {
    if (!restaurantId) return 0;
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantOrder);
      const range = this.getMonthRange(month, year);
      const where: any = { deletedAt: IsNull() };
      if (range) where.createdAt = Between(range.start, range.end);
      return repo.count({ where });
    });
  }

  async getTodayOrders(
    restaurantId?: string,
    month?: number,
    year?: number,
  ): Promise<number> {
    if (!restaurantId) return 0;
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantOrder);
      const range = this.getMonthRange(month, year);
      const start = range ? range.start : this.getStartOfDay();
      const end = range ? range.end : this.getEndOfDay();
      return repo.count({
        where: { createdAt: Between(start, end), deletedAt: IsNull() },
      });
    });
  }

  async getTodayRevenue(
    restaurantId?: string,
    month?: number,
    year?: number,
  ): Promise<number> {
    if (!restaurantId) return 0;
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantOrder);
      const range = this.getMonthRange(month, year);
      const start = range ? range.start : this.getStartOfDay();
      const end = range ? range.end : this.getEndOfDay();
      const qb = repo
        .createQueryBuilder('order')
        .select('SUM(order.total)', 'total')
        .where('order.createdAt BETWEEN :start AND :end', { start, end })
        .andWhere('order.status = :status', { status: 'completed' })
        .andWhere('order.deletedAt IS NULL');
      const result = await qb.getRawOne();
      return Number(result?.total ?? 0);
    });
  }

  async getWeeklyRevenue(
    restaurantId?: string,
    month?: number,
    year?: number,
  ): Promise<number> {
    if (!restaurantId) return 0;
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantOrder);
      const range = this.getMonthRange(month, year);
      const start = range ? range.start : this.getStartOfWeek();
      const end = range ? range.end : this.getEndOfDay();
      const qb = repo
        .createQueryBuilder('order')
        .select('SUM(order.total)', 'total')
        .where('order.createdAt BETWEEN :start AND :end', { start, end })
        .andWhere('order.status = :status', { status: 'completed' })
        .andWhere('order.deletedAt IS NULL');
      const result = await qb.getRawOne();
      return Number(result?.total ?? 0);
    });
  }

  async getMonthlyRevenue(
    restaurantId?: string,
    month?: number,
    year?: number,
  ): Promise<number> {
    if (!restaurantId) return 0;
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantOrder);
      const range = this.getMonthRange(month, year);
      const start = range ? range.start : this.getStartOfMonth();
      const end = range ? range.end : this.getEndOfDay();
      const qb = repo
        .createQueryBuilder('order')
        .select('SUM(order.total)', 'total')
        .where('order.createdAt BETWEEN :start AND :end', { start, end })
        .andWhere('order.status = :status', { status: 'completed' })
        .andWhere('order.deletedAt IS NULL');
      const result = await qb.getRawOne();
      return Number(result?.total ?? 0);
    });
  }

  async getTotalActiveProducts(
    restaurantId?: string,
    _month?: number,
    _year?: number,
  ): Promise<number> {
    if (!restaurantId) return 0;
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantProduct);
      return repo.count({
        where: { visible: true, available: true, deletedAt: undefined as any },
      });
    });
  }

  async getOrdersByStatus(
    status: string,
    restaurantId?: string,
    month?: number,
    year?: number,
  ): Promise<number> {
    if (!restaurantId) return 0;
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantOrder);
      const range = this.getMonthRange(month, year);
      const where: any = { status, deletedAt: IsNull() };
      if (range) where.createdAt = Between(range.start, range.end);
      return repo.count({ where });
    });
  }

  async getAverageOrderValue(
    restaurantId?: string,
    month?: number,
    year?: number,
  ): Promise<number> {
    if (!restaurantId) return 0;
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantOrder);
      const range = this.getMonthRange(month, year);
      const qb = repo
        .createQueryBuilder('order')
        .select('AVG(order.total)', 'average')
        .where('order.status = :status', { status: 'completed' })
        .andWhere('order.deletedAt IS NULL');
      if (range) {
        qb.andWhere('order.createdAt BETWEEN :start AND :end', {
          start: range.start,
          end: range.end,
        });
      }
      const result = await qb.getRawOne();
      return Math.round(Number(result?.average ?? 0));
    });
  }

  async getRecentOrders(
    limit: number = 5,
    restaurantId?: string,
    month?: number,
    year?: number,
  ): Promise<TenantOrder[]> {
    if (!restaurantId) return [];
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantOrder);
      const range = this.getMonthRange(month, year);
      const where: any = { deletedAt: IsNull() };
      if (range) where.createdAt = Between(range.start, range.end);
      return repo.find({
        where,
        order: { createdAt: 'DESC' },
        take: limit,
      });
    });
  }

  async getDailyStats(
    date: Date = new Date(),
    restaurantId?: string,
    month?: number,
    year?: number,
  ): Promise<{ orders: number; revenue: number; averageOrderValue: number }> {
    if (!restaurantId) {
      return { orders: 0, revenue: 0, averageOrderValue: 0 };
    }
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantOrder);
      const range = this.getMonthRange(month, year);
      const start = range ? range.start : this.getStartOfDay(date);
      const end = range ? range.end : this.getEndOfDay(date);
      const ordersCount = await repo.count({
        where: { createdAt: Between(start, end), deletedAt: IsNull() },
      });
      const revenueQb = repo
        .createQueryBuilder('order')
        .select('SUM(order.total)', 'total')
        .where('order.createdAt BETWEEN :start AND :end', { start, end })
        .andWhere('order.status = :status', { status: 'completed' })
        .andWhere('order.deletedAt IS NULL');
      const avgQb = repo
        .createQueryBuilder('order')
        .select('AVG(order.total)', 'average')
        .where('order.createdAt BETWEEN :start AND :end', { start, end })
        .andWhere('order.status = :status', { status: 'completed' })
        .andWhere('order.deletedAt IS NULL');
      const [revenueRes, avgRes] = await Promise.all([
        revenueQb.getRawOne(),
        avgQb.getRawOne(),
      ]);
      return {
        orders: ordersCount,
        revenue: Number(revenueRes?.total ?? 0),
        averageOrderValue: Math.round(Number(avgRes?.average ?? 0)),
      };
    });
  }
}
