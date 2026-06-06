/**
 * Seed sample data:
 * - public.platform_users: superadmin
 * - public.tenants: 1 demo tenant + create its schema/tables
 * - tenant schema: users (owner/staff/customer), categories, products, tables, 1 unpaid order
 *
 * Usage:
 *   npm run seed:sample
 *
 * Requirements:
 * - migrations already ran (public.tenants + public.platform_users exist)
 * - DB user has CREATE privilege (to create schema)
 */

import { DataSource, DataSourceOptions, IsNull } from 'typeorm';
import { config } from 'dotenv';
import * as bcrypt from 'bcryptjs';
import { Tenant } from '../src/entities/tenant.entity';
import { PlatformUser } from '../src/entities/platform-user.entity';
import {
  TenantUser,
  TenantCategory,
  TenantProduct,
  TenantTable,
  TenantOrder,
  TenantOrderItem,
} from '../src/entities/tenant';
import { getTenantSchemaSql } from '../src/tenant/tenant-schema.sql';
import { OrderStatus } from '../src/orders/orders.dto';

config();

const DEFAULTS = {
  superadmin: {
    username: process.env.SUPERADMIN_USERNAME || 'superadmin',
    password: process.env.SUPERADMIN_PASSWORD || 'admin123',
    email: process.env.SUPERADMIN_EMAIL || 'superadmin@skyorder.com',
  },
  tenant: {
    name: process.env.SEED_TENANT_NAME || 'Demo Restaurant',
    nameKo: process.env.SEED_TENANT_NAME_KO || '데모 레스토랑',
    customDomain: process.env.SEED_TENANT_DOMAIN || 'demo.localhost',
    timezone: process.env.SEED_TENANT_TIMEZONE || 'Asia/Ho_Chi_Minh',
    currency: process.env.SEED_TENANT_CURRENCY || 'VND',
    language: process.env.SEED_TENANT_LANGUAGE || 'vi',
  },
};

function dbOptions(): DataSourceOptions {
  return {
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
      TenantTable,
      TenantOrder,
      TenantOrderItem,
    ],
    synchronize: false,
  };
}

function generateSchemaName(): string {
  // deterministic enough; schemaName must be unique
  const suffix = Date.now().toString(36);
  return `t_demo_${suffix}`;
}

async function ensureTenantSchema(dataSource: DataSource, schemaName: string): Promise<void> {
  const sqls = getTenantSchemaSql(schemaName);
  for (const sql of sqls) {
    await dataSource.manager.query(sql);
  }
}

async function setSearchPath(dataSource: DataSource, schemaName: string): Promise<void> {
  const escaped = schemaName.replace(/"/g, '""');
  await dataSource.manager.query(`SET search_path TO "${escaped}", public`);
}

async function ensureSuperadmin(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(PlatformUser);
  const existing = await repo.findOne({ where: { username: DEFAULTS.superadmin.username } });
  if (existing) {
    console.log(`✅ Superadmin "${DEFAULTS.superadmin.username}" already exists.`);
    return;
  }
  const passwordHash = await bcrypt.hash(DEFAULTS.superadmin.password, 10);
  await repo.save(
    repo.create({
      username: DEFAULTS.superadmin.username,
      passwordHash,
      email: DEFAULTS.superadmin.email,
      role: 'super_admin',
    }),
  );
  console.log('✅ Superadmin created in public.platform_users');
  console.log(`   Username: ${DEFAULTS.superadmin.username}`);
  console.log(`   Password: ${DEFAULTS.superadmin.password}`);
}

async function ensureDemoTenant(dataSource: DataSource): Promise<Tenant> {
  const tenantRepo = dataSource.getRepository(Tenant);

  const byDomain = await tenantRepo.findOne({
    where: { customDomain: DEFAULTS.tenant.customDomain, deletedAt: IsNull() },
  });
  if (byDomain) {
    console.log(`✅ Tenant already exists: "${byDomain.name}" (${byDomain.customDomain})`);
    await ensureTenantSchema(dataSource, byDomain.schemaName);
    return byDomain;
  }

  const schemaName = generateSchemaName();
  const tenant = tenantRepo.create({
    schemaName,
    name: DEFAULTS.tenant.name,
    nameKo: DEFAULTS.tenant.nameKo,
    customDomain: DEFAULTS.tenant.customDomain,
    timezone: DEFAULTS.tenant.timezone,
    currency: DEFAULTS.tenant.currency,
    language: DEFAULTS.tenant.language,
    isActive: true,
    settings: { homeTheme: 'default' },
  });
  const saved = await tenantRepo.save(tenant);

  await ensureTenantSchema(dataSource, saved.schemaName);
  console.log(`✅ Tenant created: "${saved.name}" schema="${saved.schemaName}" domain="${saved.customDomain}"`);
  return saved;
}

async function seedTenantData(dataSource: DataSource, tenant: Tenant): Promise<void> {
  await setSearchPath(dataSource, tenant.schemaName);

  const userRepo = dataSource.getRepository(TenantUser);
  const catRepo = dataSource.getRepository(TenantCategory);
  const productRepo = dataSource.getRepository(TenantProduct);
  const tableRepo = dataSource.getRepository(TenantTable);
  const orderRepo = dataSource.getRepository(TenantOrder);
  const orderItemRepo = dataSource.getRepository(TenantOrderItem);

  // Users (owner, staff, customer)
  const ensureUser = async (username: string, password: string, role: string) => {
    const existed = await userRepo.findOne({ where: { username } });
    if (existed) return existed;
    const passwordHash = await bcrypt.hash(password, 10);
    return userRepo.save(
      userRepo.create({
        username,
        passwordHash,
        email: `${username}@example.com`,
        firstName: username,
        lastName: 'Demo',
        role,
        isActive: true,
      }),
    );
  };

  await ensureUser('owner', 'admin123', 'restaurant_owner');
  await ensureUser('staff', 'admin123', 'restaurant_staff');
  await ensureUser('customer', 'customer123', 'customer');

  // Categories
  const categoriesSeed = [
    { name: 'Popular', nameKo: '인기', icon: '🔥' },
    { name: 'Pho', nameKo: '포', icon: '🍜' },
    { name: 'Banh Mi', nameKo: '반미', icon: '🥖' },
    { name: 'Beverages', nameKo: '음료', icon: '🥤' },
  ];
  const categories: Record<string, TenantCategory> = {};
  for (const c of categoriesSeed) {
    const existed = await catRepo.findOne({ where: { name: c.name } });
    categories[c.name] =
      existed ||
      (await catRepo.save(
        catRepo.create({
          name: c.name,
          nameKo: c.nameKo,
          icon: c.icon,
          description: `${c.name} category`,
          descriptionKo: `${c.nameKo} 카테고리`,
          isActive: true,
        }),
      ));
  }

  // Products
  const productsSeed = [
    { name: 'Pho Bo', nameKo: '포 보', price: 65000, cat: 'Pho' },
    { name: 'Pho Ga', nameKo: '포 가', price: 60000, cat: 'Pho' },
    { name: 'Banh Mi Thit Nuong', nameKo: '반미 티트 누옹', price: 35000, cat: 'Banh Mi' },
    { name: 'Ca Phe Sua Da', nameKo: '카 페 수아 다', price: 15000, cat: 'Beverages' },
  ];

  const products: TenantProduct[] = [];
  for (const p of productsSeed) {
    const existed = await productRepo.findOne({ where: { name: p.name } });
    if (existed) {
      products.push(existed);
      continue;
    }
    const cat = categories[p.cat];
    const saved = await productRepo.save(
      productRepo.create({
        name: p.name,
        nameKo: p.nameKo,
        price: p.price as any,
        description: `${p.name} demo item`,
        descriptionKo: `${p.nameKo} 데모 메뉴`,
        categoryId: cat?.id ?? null,
        category: cat?.name ?? null,
        categoryKo: cat?.nameKo ?? null,
        available: true,
        visible: true,
        sales: 0,
      }),
    );
    products.push(saved);
  }

  // Tables
  for (let i = 1; i <= 5; i++) {
    const existed = await tableRepo.findOne({ where: { tableNumber: i } });
    if (existed) continue;
    await tableRepo.save(
      tableRepo.create({
        name: `Bàn ${i}`,
        tableNumber: i,
        capacity: 4,
        status: 'available',
        isActive: true,
        description: `Demo table #${i}`,
      }),
    );
  }

  // One unpaid order
  const existingOrder = await orderRepo.findOne({
    where: { orderNumber: 'CF_DEMO-001' },
    relations: ['orderItems'],
  });
  if (existingOrder) {
    console.log('✅ Demo order already exists.');
    return;
  }

  const subtotal = products.slice(0, 2).reduce((sum, p) => sum + Number(p.price), 0);
  const order = await orderRepo.save(
    orderRepo.create({
      orderNumber: 'CF_DEMO-001',
      customerName: 'Demo Customer',
      customerPhone: '0900000000',
      customerAddress: null,
      notes: 'Seed order (unpaid)',
      subtotal: subtotal as any,
      tax: 0 as any,
      deliveryFee: 0 as any,
      total: subtotal as any,
      status: OrderStatus.PENDING,
      orderType: 'dine_in',
      tableId: null,
      tableNumber: 1,
      estimatedDeliveryTime: null,
      actualDeliveryTime: null,
      paymentStatus: 'unpaid',
      paymentMethod: null,
      stripeCheckoutSessionId: null,
      stripePaymentIntentId: null,
      paidAt: null,
    }),
  );

  const items = [
    { product: products[0], qty: 1 },
    { product: products[1], qty: 1 },
  ].filter((x) => x.product);

  for (const it of items) {
    await orderItemRepo.save(
      orderItemRepo.create({
        orderId: order.id,
        productId: it.product.id,
        productName: it.product.name,
        unitPrice: it.product.price as any,
        quantity: it.qty,
        totalPrice: (Number(it.product.price) * it.qty) as any,
        specialInstructions: null,
      }),
    );
  }

  console.log('✅ Seeded tenant data: users/categories/products/tables + 1 order.');
  console.log('   Tenant login (staff): username="owner" password="admin123"');
  console.log('   Tenant login (customer): username="customer" password="customer123"');
}

async function run() {
  const ds = new DataSource(dbOptions());
  try {
    await ds.initialize();
    await ensureSuperadmin(ds);
    const tenant = await ensureDemoTenant(ds);
    await seedTenantData(ds, tenant);
  } catch (err) {
    console.error('Seed sample failed:', err);
    process.exitCode = 1;
  } finally {
    await ds.destroy().catch(() => {});
  }
}

run();

