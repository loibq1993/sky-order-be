import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { TablesModule } from './tables/tables.module';
import { UploadModule } from './upload/upload.module';
import { StatisticsModule } from './statistics/statistics.module';
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
    CategoriesModule,
    ProductsModule,
    OrdersModule,
    TablesModule,
    UploadModule,
    StatisticsModule,
  ],
  controllers: [AppController, ImagesController],
  providers: [AppService],
})
export class AppModule { }
