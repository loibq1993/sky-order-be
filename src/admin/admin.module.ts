import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { TenantUsersController } from './tenant-users.controller';
import { ClientRestaurantsController } from './client-restaurants.controller';
import { RestaurantSettingsController } from './restaurant-settings.controller';
import { AdminService } from './admin.service';
import { Tenant } from '../entities/tenant.entity';
import { TenantModule } from '../tenant/tenant.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant]),
    TenantModule,
  ],
  controllers: [
    AdminController,
    TenantUsersController,
    RestaurantSettingsController,
    ClientRestaurantsController,
  ],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
