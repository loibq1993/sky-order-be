import { Module } from '@nestjs/common';
import { AdminOrdersController } from './admin-orders.controller';
import { ClientOrdersController } from './client-orders.controller';
import { OrdersService } from './orders.service';
import { TenantModule } from '../tenant/tenant.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ResolveTenantFromDomainGuard } from '../auth/guards/resolve-tenant-from-domain.guard';

@Module({
  imports: [TenantModule, NotificationsModule],
  controllers: [AdminOrdersController, ClientOrdersController],
  providers: [OrdersService, ResolveTenantFromDomainGuard],
  exports: [OrdersService],
})
export class OrdersModule {} 