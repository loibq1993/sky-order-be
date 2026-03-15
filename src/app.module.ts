import { Module } from '@nestjs/common';
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
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { CallStaffModule } from './call-staff/call-staff.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ImagesController } from './images.controller';
import configuration from './config/configuration';
import { getTypeOrmConfig } from './config/typeorm.config';

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
  ],
  controllers: [AppController, ImagesController],
  providers: [AppService],
})
export class AppModule { }
