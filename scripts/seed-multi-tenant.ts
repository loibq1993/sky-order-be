import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { MultiTenantSeed } from '../src/seeds/multi-tenant-seed';
import { Product } from '../src/entities/product.entity';
import { Category } from '../src/entities/category.entity';
import { Order, OrderItem } from '../src/entities/order.entity';
import { ProductCategory } from '../src/entities/product-category.entity';
import { Table } from '../src/entities/table.entity';
import { Restaurant } from '../src/entities/restaurant.entity';
import { User } from '../src/entities/user.entity';
import { join } from 'path';

// Load environment variables
config();

async function runSeed() {
  // Create DataSourceOptions directly from environment variables
  const dataSourceOptions: DataSourceOptions = {
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || 'your_password',
    database: process.env.DB_DATABASE || 'sky_order',
    entities: [Product, Category, Order, OrderItem, ProductCategory, Table, Restaurant, User],
    migrations: [join(__dirname, '..', 'src', 'migrations', '*.{ts,js}')],
    migrationsTableName: 'migrations',
    synchronize: false,
    charset: 'utf8mb4',
    timezone: '+00:00',
    extra: {
      charset: 'utf8mb4_unicode_ci',
    },
  };
  
  const dataSource = new DataSource(dataSourceOptions);

  try {
    await dataSource.initialize();
    console.log('📦 Database connection established');

    const seed = new MultiTenantSeed(dataSource);
    await seed.run();

    console.log('✅ Multi-tenant seeding completed successfully');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

runSeed();
