import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds voucher columns to orders table in every existing tenant schema.
 */
export class AddOrderVoucherColumns1800000000005 implements MigrationInterface {
  name = 'AddOrderVoucherColumns1800000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.driver.options.type === 'postgres';
    if (!isPostgres) return;

    const tenants: { schemaName: string }[] = await queryRunner.query(`
      SELECT "schemaName" FROM public.tenants WHERE "deletedAt" IS NULL
    `);

    for (const tenant of tenants) {
      const schema = tenant.schemaName.replace(/"/g, '""');
      await queryRunner.query(`
        ALTER TABLE "${schema}".orders ADD COLUMN IF NOT EXISTS "voucherId" uuid
      `);
      await queryRunner.query(`
        ALTER TABLE "${schema}".orders ADD COLUMN IF NOT EXISTS "voucherCode" character varying(50)
      `);
      await queryRunner.query(`
        ALTER TABLE "${schema}".orders ADD COLUMN IF NOT EXISTS "voucherDiscount" numeric(10,2) NOT NULL DEFAULT 0
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
        ALTER TABLE "${schema}".orders DROP COLUMN IF EXISTS "voucherDiscount"
      `);
      await queryRunner.query(`
        ALTER TABLE "${schema}".orders DROP COLUMN IF EXISTS "voucherCode"
      `);
      await queryRunner.query(`
        ALTER TABLE "${schema}".orders DROP COLUMN IF EXISTS "voucherId"
      `);
    }
  }
}
