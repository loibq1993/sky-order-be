import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Drops legacy tenant tables from public schema so that public only contains
 * tenants (registry) and platform_users (super admins). Tenant data lives in
 * per-tenant schemas (e.g. t_xxx.users, t_xxx.categories), created at runtime
 * when a new tenant is created via API/UI.
 * Safe: uses DROP TABLE IF EXISTS. Run after CreateMultiTenantRegistry.
 */
export class DropLegacyPublicTablesIfExist1800000000001 implements MigrationInterface {
  name = 'DropLegacyPublicTablesIfExist1800000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.driver.options.type === 'postgres';
    if (!isPostgres) return;

    // Drop in dependency order (children first) to avoid FK errors
    const tables = [
      'order_items',
      'product_categories',
      'orders',
      'products',
      'tables',
      'categories',
      'users',
      'restaurants',
    ];
    for (const table of tables) {
      await queryRunner.query(`DROP TABLE IF EXISTS public."${table}" CASCADE`);
    }
  }

  public async down(): Promise<void> {
    // Intentionally no-op: we do not recreate legacy tables.
  }
}
