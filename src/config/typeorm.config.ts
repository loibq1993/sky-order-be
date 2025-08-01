import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Product } from '../entities/product.entity';
import { Category } from '../entities/category.entity';
import { Order, OrderItem } from '../entities/order.entity';
import { ProductCategory } from '../entities/product-category.entity';
import { Table } from '../entities/table.entity';
import { join } from 'path';

export const getTypeOrmConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
    type: 'mysql',
    host: configService.get<string>('app.database.host'),
    port: configService.get<number>('app.database.port'),
    username: configService.get<string>('app.database.username'),
    password: configService.get<string>('app.database.password'),
    database: configService.get<string>('app.database.database'),
    entities: [Product, Category, Order, OrderItem, ProductCategory, Table],
    migrations: [join(__dirname, '..', 'migrations', '*.{ts,js}')],
    migrationsTableName: 'migrations',
    migrationsRun: true,
    synchronize: false,
    charset: 'utf8mb4',
    timezone: '+00:00',
    extra: {
        charset: 'utf8mb4_unicode_ci',
    },
}); 