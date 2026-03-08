import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Product } from '../entities/product.entity';
import { Category } from '../entities/category.entity';
import { Order, OrderItem } from '../entities/order.entity';
import { ProductCategory } from '../entities/product-category.entity';
import { Table } from '../entities/table.entity';
import { Restaurant } from '../entities/restaurant.entity';
import { User } from '../entities/user.entity';
import { join } from 'path';

export const getTypeOrmConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: configService.get<string>('app.database.host'),
    port: configService.get<number>('app.database.port'),
    username: configService.get<string>('app.database.username'),
    password: configService.get<string>('app.database.password'),
    database: configService.get<string>('app.database.database'),
    entities: [Product, Category, Order, OrderItem, ProductCategory, Table, Restaurant, User],
    migrations: [join(__dirname, '..', 'migrations', '*.{ts,js}')],
    migrationsTableName: 'migrations',
    migrationsRun: true,
    synchronize: false,
}); 