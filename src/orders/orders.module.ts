import { Module } from '@nestjs/common';
import { AdminOrdersController } from './admin-orders.controller';
import { ClientOrdersController } from './client-orders.controller';
import { OrdersService } from './orders.service';
import { TenantModule } from '../tenant/tenant.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { VouchersModule } from '../vouchers/vouchers.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { CombosModule } from '../combos/combos.module';

@Module({
  imports: [TenantModule, NotificationsModule, AuthModule, VouchersModule, PromotionsModule, CombosModule],
  controllers: [AdminOrdersController, ClientOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {} 