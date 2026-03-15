/**
 * Multi-tenant seed: only seeds public.platform_users (superadmin).
 * Does NOT create tenant tables in public schema.
 * Tenants are created via API/UI; each gets a new schema (e.g. t_xxx) with its own tables.
 * Usage: yarn seed:multi-tenant (or use seed:superadmin for the same effect).
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

    const username = process.env.SUPERADMIN_USERNAME || 'superadmin';
    const password = process.env.SUPERADMIN_PASSWORD || 'admin123';
    const email = process.env.SUPERADMIN_EMAIL || 'superadmin@skyorder.com';

    const repo = dataSource.getRepository(PlatformUser);
    const existing = await repo.findOne({ where: { username } });

    if (existing) {
      console.log(`Superadmin "${username}" already exists in public.platform_users.`);
    } else {
      const passwordHash = await bcrypt.hash(password, 10);
      await repo.save(
        repo.create({ username, passwordHash, email, role: 'super_admin' }),
      );
      console.log('Superadmin created in public.platform_users.');
    }

    console.log('\nTenants are NOT seeded here. Create them via:');
    console.log('  - Admin UI: Restaurants → Add restaurant');
    console.log('  - POST /api/auth/create-restaurant (with super_admin token)');
    console.log('  - POST /api/admin/restaurants (with super_admin token)');
    console.log('Each new tenant gets a dedicated schema (e.g. t_abc12def) with its own tables.');
  } catch (error) {
    console.error('Error during seed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

runSeed();
