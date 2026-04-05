import { Module } from '@nestjs/common';
import { TablesController } from './tables.controller';
import { PublicTablesController } from './public-tables.controller';
import { ClientTablesController } from './client-tables.controller';
import { TablesService } from './tables.service';
import { QrCodeService } from './qr-code.service';
import { TenantModule } from '../tenant/tenant.module';
import { OrdersModule } from '../orders/orders.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TenantModule, OrdersModule, AuthModule],
  controllers: [TablesController, PublicTablesController, ClientTablesController],
  providers: [TablesService, QrCodeService],
  exports: [TablesService, QrCodeService],
})
export class TablesModule {} 