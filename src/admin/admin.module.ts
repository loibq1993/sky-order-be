import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { ClientRestaurantsController } from './client-restaurants.controller';
import { RestaurantSettingsController } from './restaurant-settings.controller';
import { AdminService } from './admin.service';
import { Tenant } from '../entities/tenant.entity';
import { TenantModule } from '../tenant/tenant.module';
import { ResolveTenantFromDomainGuard } from '../auth/guards/resolve-tenant-from-domain.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant]),
    TenantModule,
  ],
  controllers: [AdminController, RestaurantSettingsController, ClientRestaurantsController],
  providers: [AdminService, ResolveTenantFromDomainGuard],
  exports: [AdminService],
})
export class AdminModule {}
