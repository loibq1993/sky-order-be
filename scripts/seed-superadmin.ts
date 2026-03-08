/**
 * Seed the superadmin user only.
 * Superadmin can control the whole system: all restaurants, users, settings.
 *
 * Usage: yarn seed:superadmin
 * Env (optional): SUPERADMIN_USERNAME, SUPERADMIN_PASSWORD, SUPERADMIN_EMAIL
 * Default: username=superadmin, password=admin123, email=superadmin@skyorder.com
 */

import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import * as bcrypt from 'bcryptjs';
import { User } from '../src/entities/user.entity';
import { Restaurant } from '../src/entities/restaurant.entity';
import { Category } from '../src/entities/category.entity';
import { Product } from '../src/entities/product.entity';
import { Order, OrderItem } from '../src/entities/order.entity';
import { ProductCategory } from '../src/entities/product-category.entity';
import { Table } from '../src/entities/table.entity';
import { join } from 'path';

config();

const DEFAULT_USERNAME = 'superadmin';
const DEFAULT_PASSWORD = 'admin123';
const DEFAULT_EMAIL = 'superadmin@skyorder.com';

async function runSeed() {
  const dataSourceOptions: DataSourceOptions = {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'your_password',
    database: process.env.DB_DATABASE || 'sky_order',
    entities: [User, Restaurant, Category, Product, Order, OrderItem, ProductCategory, Table],
    migrations: [join(__dirname, '..', 'src', 'migrations', '*.{ts,js}')],
    migrationsTableName: 'migrations',
    synchronize: false,
  };

  const dataSource = new DataSource(dataSourceOptions);

  try {
    await dataSource.initialize();

    // Run pending migrations so tables exist (e.g. fresh DB)
    const migrations = await dataSource.runMigrations();
    if (migrations.length > 0) {
      console.log(`✅ Ran ${migrations.length} migration(s).`);
    }

    const username = process.env.SUPERADMIN_USERNAME || DEFAULT_USERNAME;
    const password = process.env.SUPERADMIN_PASSWORD || DEFAULT_PASSWORD;
    const email = process.env.SUPERADMIN_EMAIL || DEFAULT_EMAIL;

    const userRepository = dataSource.getRepository(User);

    const existing = await userRepository.findOne({
      where: { username },
    });

    if (existing) {
      if (existing.role !== 'super_admin') {
        existing.role = 'super_admin';
        existing.restaurantId = null;
        await userRepository.save(existing);
        console.log(`✅ User "${username}" updated to super_admin.`);
      } else {
        console.log(`✅ Superadmin "${username}" already exists.`);
      }
      await dataSource.destroy();
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const superAdmin = userRepository.create({
      username,
      passwordHash,
      email,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'super_admin',
      restaurantId: null,
      isActive: true,
    });
    await userRepository.save(superAdmin);

    console.log('✅ Superadmin user created.');
    console.log(`   Username: ${username}`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: (set via SUPERADMIN_PASSWORD or default: ${DEFAULT_PASSWORD})`);
    console.log('   Change password after first login.');
  } catch (error) {
    console.error('❌ Error seeding superadmin:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

runSeed();
