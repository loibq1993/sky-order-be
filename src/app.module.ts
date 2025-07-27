import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ImagesController } from './images.controller';

import { Category } from './entities/category.entity';
import { Product } from './entities/product.entity';
import { Order, OrderItem } from './entities/order.entity';
import { ProductCategory } from './entities/product-category.entity';
import { Table } from './entities/table.entity';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { UploadModule } from './upload/upload.module';
import { TablesModule } from './tables/tables.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('app.database.host'),
        port: configService.get<number>('app.database.port'),
        username: configService.get<string>('app.database.username'),
        password: configService.get<string>('app.database.password'),
        database: configService.get<string>('app.database.database'),
        entities: [Category, Product, Order, OrderItem, ProductCategory, Table],
        synchronize: false, // Disable synchronize, use migrations instead
        migrations: [__dirname + '/migrations/*.ts'],
        migrationsTableName: 'migrations',
        // logging: configService.get('app.nodeEnv') !== 'production',
        charset: 'utf8mb4',
        timezone: '+00:00',
        extra: {
          charset: 'utf8mb4_unicode_ci',
        },
      }),
      inject: [ConfigService],
    }),
    CategoriesModule,
    ProductsModule,
    OrdersModule,
    UploadModule,
    TablesModule,
  ],
  controllers: [
    AppController,
    ImagesController,
  ],
  providers: [
    AppService,
  ],
})
export class AppModule { }
