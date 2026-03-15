import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from '../entities/notification.entity';

export interface CreateNotificationDto {
  type: NotificationType;
  title: string;
  message?: string | null;
  orderId?: string | null;
  tableNumber?: number | string | null;
}

export interface FindAllOptions {
  limit?: number;
  offset?: number;
  since?: Date | number;
  type?: NotificationType;
  unreadOnly?: boolean;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  async create(restaurantId: string, dto: CreateNotificationDto): Promise<Notification> {
    const tableNum =
      dto.tableNumber != null && dto.tableNumber !== ''
        ? typeof dto.tableNumber === 'number'
          ? dto.tableNumber
          : parseInt(String(dto.tableNumber), 10)
        : null;
    const notNaN = tableNum != null && !Number.isNaN(tableNum) ? tableNum : null;

    const notification = this.notificationRepo.create({
      restaurantId,
      type: dto.type,
      title: dto.title,
      message: dto.message ?? null,
      orderId: dto.orderId ?? null,
      tableNumber: notNaN,
      read: false,
    });
    return this.notificationRepo.save(notification);
  }

  async findAll(
    restaurantId: string,
    options: FindAllOptions = {},
  ): Promise<{ items: Notification[]; total: number }> {
    const { limit = 50, offset = 0, since, type, unreadOnly } = options;

    const qb = this.notificationRepo
      .createQueryBuilder('n')
      .where('n.restaurantId = :restaurantId', { restaurantId })
      .orderBy('n.createdAt', 'DESC');

    if (since != null) {
      const sinceDate = typeof since === 'number' ? new Date(since) : since;
      qb.andWhere('n.createdAt > :since', { since: sinceDate });
    }
    if (type != null) {
      qb.andWhere('n.type = :type', { type });
    }
    if (unreadOnly) {
      qb.andWhere('n.read = :read', { read: false });
    }

    const total = await qb.getCount();
    qb.take(limit).skip(offset);
    const items = await qb.getMany();

    return { items, total };
  }

  async markAsRead(id: string, restaurantId: string): Promise<Notification> {
    const notification = await this.notificationRepo.findOne({
      where: { id, restaurantId },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    notification.read = true;
    return this.notificationRepo.save(notification);
  }

  async markAllAsRead(restaurantId: string): Promise<{ count: number }> {
    const result = await this.notificationRepo.update(
      { restaurantId, read: false },
      { read: true },
    );
    return { count: result.affected ?? 0 };
  }
}
