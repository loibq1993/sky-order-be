import { Module } from '@nestjs/common';
import { AdminOrdersController } from './admin-orders.controller';
import { ClientOrdersController } from './client-orders.controller';
import { OrdersService } from './orders.service';
import { TenantModule } from '../tenant/tenant.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TenantModule, NotificationsModule, AuthModule],
  controllers: [AdminOrdersController, ClientOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {} 