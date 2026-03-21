import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the full schema for PostgreSQL. Skips when using MySQL (use existing migrations).
 */
export class InitialPostgresSchema1699000000000 implements MigrationInterface {
  name = 'InitialPostgresSchema1699000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.driver.options.type === 'postgres';
    if (!isPostgres) return;

    // restaurants
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "restaurants" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(200) NOT NULL,
        "nameKo" character varying(200),
        "description" text,
        "descriptionKo" text,
        "logo" text,
        "coverImage" text,
        "address" character varying(200),
        "phone" character varying(20),
        "email" character varying(100),
        "customDomain" character varying(200) UNIQUE,
        "timezone" character varying(50),
        "currency" character varying(10),
        "language" character varying(10),
        "isActive" boolean DEFAULT true,
        "settings" jsonb,
        "businessHours" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        PRIMARY KEY ("id")
      )
    `);

    // users
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "username" character varying(100) NOT NULL,
        "passwordHash" character varying(255) NOT NULL,
        "email" character varying(200),
        "firstName" character varying(100),
        "lastName" character varying(100),
        "phone" character varying(20),
        "role" character varying(50) NOT NULL DEFAULT 'restaurant_staff',
        "restaurantId" uuid,
        "isActive" boolean DEFAULT true,
        "lastLoginAt" TIMESTAMP,
        "lastLoginIp" character varying(45),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        PRIMARY KEY ("id"),
        UNIQUE ("username", "restaurantId"),
        CONSTRAINT "FK_users_restaurant" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_users_restaurant_id" ON "users" ("restaurantId")');

    // categories
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "categories" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(100) NOT NULL,
        "nameKo" character varying(100) NOT NULL,
        "icon" character varying(10),
        "description" text,
        "descriptionKo" text,
        "isActive" boolean DEFAULT true,
        "restaurantId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        PRIMARY KEY ("id"),
        CONSTRAINT "FK_categories_restaurant" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_categories_restaurant_id" ON "categories" ("restaurantId")');

    // products
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "products" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(200) NOT NULL,
        "nameKo" character varying(200) NOT NULL,
        "addName" character varying(200),
        "addNameKo" character varying(200),
        "price" numeric(10,2) NOT NULL,
        "description" text,
        "descriptionKo" text,
        "image" character varying(500),
        "categoryId" uuid,
        "category" character varying(100),
        "categoryKo" character varying(100),
        "available" boolean DEFAULT true,
        "sales" integer DEFAULT 0,
        "visible" boolean DEFAULT true,
        "restaurantId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        PRIMARY KEY ("id"),
        CONSTRAINT "FK_products_category" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_products_restaurant" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_products_restaurant_id" ON "products" ("restaurantId")');

    // tables
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tables" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(100) NOT NULL,
        "tableNumber" integer NOT NULL,
        "qrCodeUrl" character varying(500),
        "qrCodeImagePath" character varying(500),
        "orderUrl" character varying(500),
        "qrUuid" uuid,
        "status" character varying(20) NOT NULL DEFAULT 'available',
        "capacity" integer DEFAULT 0,
        "description" text,
        "isActive" boolean DEFAULT true,
        "restaurantId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        PRIMARY KEY ("id"),
        UNIQUE ("restaurantId", "tableNumber"),
        CONSTRAINT "FK_tables_restaurant" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_tables_restaurant_id" ON "tables" ("restaurantId")');

    // orders
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "orders" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "orderNumber" character varying(100) NOT NULL,
        "customerName" character varying(100) NOT NULL,
        "customerPhone" character varying(20),
        "customerAddress" character varying(200),
        "notes" text,
        "subtotal" numeric(10,2) NOT NULL,
        "tax" numeric(10,2) DEFAULT 0,
        "deliveryFee" numeric(10,2) DEFAULT 0,
        "total" numeric(10,2) NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'pending',
        "orderType" character varying(20) NOT NULL DEFAULT 'dine_in',
        "tableId" uuid,
        "tableNumber" integer,
        "estimatedDeliveryTime" TIMESTAMP,
        "actualDeliveryTime" TIMESTAMP,
        "restaurantId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        PRIMARY KEY ("id"),
        UNIQUE ("orderNumber"),
        CONSTRAINT "FK_orders_restaurant" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_orders_table" FOREIGN KEY ("tableId") REFERENCES "tables"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_orders_restaurant_id" ON "orders" ("restaurantId")');

    // order_items
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "order_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "orderId" uuid NOT NULL,
        "productId" uuid NOT NULL,
        "productName" character varying(200) NOT NULL,
        "unitPrice" numeric(10,2) NOT NULL,
        "quantity" integer NOT NULL,
        "totalPrice" numeric(10,2) NOT NULL,
        "specialInstructions" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        PRIMARY KEY ("id"),
        CONSTRAINT "FK_order_items_order" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_order_items_product" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT
      )
    `);

    // product_categories
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_categories" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "productId" uuid NOT NULL,
        "categoryId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        PRIMARY KEY ("id"),
        CONSTRAINT "FK_product_categories_product" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_product_categories_category" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE
      )
    `);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.driver.options.type === 'postgres';
    if (!isPostgres) return;

    await queryRunner.query('DROP TABLE IF EXISTS "product_categories"');
    await queryRunner.query('DROP TABLE IF EXISTS "order_items"');
    await queryRunner.query('DROP TABLE IF EXISTS "orders"');
    await queryRunner.query('DROP TABLE IF EXISTS "tables"');
    await queryRunner.query('DROP TABLE IF EXISTS "products"');
    await queryRunner.query('DROP TABLE IF EXISTS "categories"');
    await queryRunner.query('DROP TABLE IF EXISTS "users"');
    await queryRunner.query('DROP TABLE IF EXISTS "restaurants"');
  }
}
