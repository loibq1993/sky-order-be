import { Module } from '@nestjs/common';
import { TablesController } from './tables.controller';
import { PublicTablesController } from './public-tables.controller';
import { ClientTablesController } from './client-tables.controller';
import { TablesService } from './tables.service';
import { QrCodeService } from './qr-code.service';
import { TenantModule } from '../tenant/tenant.module';
import { OrdersModule } from '../orders/orders.module';
import { ResolveTenantFromDomainGuard } from '../auth/guards/resolve-tenant-from-domain.guard';

@Module({
  imports: [TenantModule, OrdersModule],
  controllers: [TablesController, PublicTablesController, ClientTablesController],
  providers: [TablesService, QrCodeService, ResolveTenantFromDomainGuard],
  exports: [TablesService, QrCodeService],
})
export class TablesModule {} 