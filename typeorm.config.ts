import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Product } from './src/entities/product.entity';
import { Category } from './src/entities/category.entity';
import { Order, OrderItem } from './src/entities/order.entity';
import { ProductCategory } from './src/entities/product-category.entity';
import { Table } from './src/entities/table.entity';
import { Restaurant } from './src/entities/restaurant.entity';
import { User } from './src/entities/user.entity';

// Load environment variables
config();

export default new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_DATABASE || 'sky_order',
    entities: [Product, Category, Order, OrderItem, ProductCategory, Table, Restaurant, User],
    migrations: ['src/migrations/*.ts'],
    migrationsTableName: 'migrations',
    charset: 'utf8mb4',
    timezone: '+00:00',
    extra: {
        charset: 'utf8mb4_unicode_ci',
    },
}); 