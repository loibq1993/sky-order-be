import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantModule } from './tenant/tenant.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { TablesModule } from './tables/tables.module';
import { UploadModule } from './upload/upload.module';
import { StatisticsModule } from './statistics/statistics.module';
import { AdminModule } from './admin/admin.module';
import { CallStaffModule } from './call-staff/call-staff.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MenuImportModule } from './menu-import/menu-import.module';
import { ImagesController } from './images.controller';
import configuration from './config/configuration';
import { getTypeOrmConfig } from './config/typeorm.config';
import { AuthModule } from './auth/auth.module';
import { ResolveTenantFromDomainGuard } from './auth/guards/resolve-tenant-from-domain.guard';
import { CorsModule } from './cors/cors.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => getTypeOrmConfig(configService),
      inject: [ConfigService],
    }),
    CorsModule,
    TenantModule,
    CategoriesModule,
    ProductsModule,
    OrdersModule,
    TablesModule,
    UploadModule,
    StatisticsModule,
    AuthModule,
    AdminModule,
    CallStaffModule,
    NotificationsModule,
    MenuImportModule,
  ],
  controllers: [AppController, ImagesController],
  providers: [
    AppService,
    ResolveTenantFromDomainGuard,
    /** Mọi request có thể gắn restaurantIdFromDomain từ X-Tenant-Domain / Origin (admin + client). */
    { provide: APP_GUARD, useExisting: ResolveTenantFromDomainGuard },
  ],
})
export class AppModule { }
