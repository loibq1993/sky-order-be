/**
 * Seed the superadmin user into public.platform_users only.
 * Does NOT create or touch any tenant tables (those live in per-tenant schemas).
 * Usage: yarn seed:superadmin
 * Requires: public.tenants and public.platform_users must exist (run app once or run migrations first).
 * Env (optional): SUPERADMIN_USERNAME, SUPERADMIN_PASSWORD, SUPERADMIN_EMAIL
 */

import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import * as bcrypt from 'bcryptjs';
import { Tenant } from '../src/entities/tenant.entity';
import { PlatformUser } from '../src/entities/platform-user.entity';
import {
  TenantUser,
  TenantCategory,
  TenantProduct,
  TenantProductCategory,
  TenantTable,
  TenantOrder,
  TenantOrderItem,
} from '../src/entities/tenant';

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
    entities: [
      Tenant,
      PlatformUser,
      TenantUser,
      TenantCategory,
      TenantProduct,
      TenantProductCategory,
      TenantTable,
      TenantOrder,
      TenantOrderItem,
    ],
    synchronize: false,
  };

  const dataSource = new DataSource(dataSourceOptions);

  try {
    await dataSource.initialize();

    const username = process.env.SUPERADMIN_USERNAME || DEFAULT_USERNAME;
    const password = process.env.SUPERADMIN_PASSWORD || DEFAULT_PASSWORD;
    const email = process.env.SUPERADMIN_EMAIL || DEFAULT_EMAIL;

    const repo = dataSource.getRepository(PlatformUser);
    const existing = await repo.findOne({ where: { username } });

    if (existing) {
      console.log(`Superadmin "${username}" already exists.`);
      await dataSource.destroy();
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const superAdmin = repo.create({
      username,
      passwordHash,
      email,
      role: 'super_admin',
    });
    await repo.save(superAdmin);

    console.log('Superadmin user created in public.platform_users');
    console.log(`  Username: ${username}`);
    console.log(`  Email: ${email}`);
  } catch (error) {
    console.error('Error seeding superadmin:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

runSeed();
