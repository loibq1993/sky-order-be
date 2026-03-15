import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RestaurantId } from '../auth/decorators/restaurant.decorator';
import { NotificationsService } from './notifications.service';
import { NotificationType } from '../entities/notification.entity';

@ApiTags('notifications-admin')
@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'restaurant_owner', 'restaurant_manager', 'restaurant_staff')
@ApiBearerAuth()
export class AdminNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for restaurant' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max items' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination' })
  @ApiQuery({ name: 'since', required: false, description: 'Unix ms - only after this time' })
  @ApiQuery({ name: 'type', required: false, enum: ['new_order', 'order_updated', 'order_completed', 'call_staff', 'request_payment'] })
  @ApiQuery({ name: 'unreadOnly', required: false, description: 'Only unread' })
  @ApiResponse({ status: 200, description: 'Paginated notifications' })
  async findAll(
    @RestaurantId() restaurantId: string,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
    @Query('since') sinceStr?: string,
    @Query('type') type?: NotificationType,
    @Query('unreadOnly') unreadOnlyStr?: string,
  ) {
    const limit = limitStr ? Math.min(parseInt(limitStr, 10) || 50, 100) : 50;
    const offset = offsetStr ? Math.max(0, parseInt(offsetStr, 10) || 0) : 0;
    const since = sinceStr ? parseInt(sinceStr, 10) : undefined;
    const unreadOnly = unreadOnlyStr === 'true' || unreadOnlyStr === '1';

    const sinceDate = since != null && !Number.isNaN(since) ? new Date(since) : undefined;
    const result = await this.notificationsService.findAll(restaurantId, {
      limit,
      offset,
      since: sinceDate,
      type,
      unreadOnly,
    });
    return result;
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'Count of updated' })
  async markAllAsRead(@RestaurantId() restaurantId: string) {
    return this.notificationsService.markAllAsRead(restaurantId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark one notification as read' })
  @ApiResponse({ status: 200, description: 'Updated notification' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(
    @Param('id') id: string,
    @RestaurantId() restaurantId: string,
  ) {
    return this.notificationsService.markAsRead(id, restaurantId);
  }
}
