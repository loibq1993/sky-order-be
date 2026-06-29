import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Links orders to logged-in customer accounts (tenant users).
 */
export class AddOrderCustomerUserId1800000000012 implements MigrationInterface {
  name = 'AddOrderCustomerUserId1800000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.driver.options.type === 'postgres';
    if (!isPostgres) return;

    const tenants: { schemaName: string }[] = await queryRunner.query(`
      SELECT "schemaName" FROM public.tenants WHERE "deletedAt" IS NULL
    `);

    for (const tenant of tenants) {
      const schema = tenant.schemaName.replace(/"/g, '""');
      await queryRunner.query(`
        ALTER TABLE "${schema}".orders ADD COLUMN IF NOT EXISTS "customerUserId" uuid
      `);
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_orders_customerUserId"
        ON "${schema}".orders ("customerUserId")
        WHERE "customerUserId" IS NOT NULL AND "deletedAt" IS NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.driver.options.type === 'postgres';
    if (!isPostgres) return;

    const tenants: { schemaName: string }[] = await queryRunner.query(`
      SELECT "schemaName" FROM public.tenants WHERE "deletedAt" IS NULL
    `);

    for (const tenant of tenants) {
      const schema = tenant.schemaName.replace(/"/g, '""');
      await queryRunner.query(`
        DROP INDEX IF EXISTS "${schema}"."IDX_orders_customerUserId"
      `);
      await queryRunner.query(`
        ALTER TABLE "${schema}".orders DROP COLUMN IF EXISTS "customerUserId"
      `);
    }
  }
}
