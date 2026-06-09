import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds optional image column to vouchers and product_promotions in every tenant schema.
 */
export class AddVoucherPromotionImageColumns1800000000012 implements MigrationInterface {
  name = 'AddVoucherPromotionImageColumns1800000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.driver.options.type === 'postgres';
    if (!isPostgres) return;

    const tenants: { schemaName: string }[] = await queryRunner.query(`
      SELECT "schemaName" FROM public.tenants WHERE "deletedAt" IS NULL
    `);

    for (const tenant of tenants) {
      const schema = tenant.schemaName.replace(/"/g, '""');
      await queryRunner.query(`
        ALTER TABLE "${schema}".vouchers
        ADD COLUMN IF NOT EXISTS image character varying(500)
      `);
      await queryRunner.query(`
        ALTER TABLE "${schema}".product_promotions
        ADD COLUMN IF NOT EXISTS image character varying(500)
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
        ALTER TABLE "${schema}".vouchers DROP COLUMN IF EXISTS image
      `);
      await queryRunner.query(`
        ALTER TABLE "${schema}".product_promotions DROP COLUMN IF EXISTS image
      `);
    }
  }
}
