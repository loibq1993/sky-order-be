import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderItemPromotionColumns1800000000007 implements MigrationInterface {
  name = 'AddOrderItemPromotionColumns1800000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.driver.options.type === 'postgres';
    if (!isPostgres) return;

    const tenants: { schemaName: string }[] = await queryRunner.query(`
      SELECT "schemaName" FROM public.tenants WHERE "deletedAt" IS NULL
    `);

    for (const tenant of tenants) {
      const schema = tenant.schemaName.replace(/"/g, '""');
      await queryRunner.query(`
        ALTER TABLE "${schema}".order_items ADD COLUMN IF NOT EXISTS "originalUnitPrice" numeric(10,2)
      `);
      await queryRunner.query(`
        ALTER TABLE "${schema}".order_items ADD COLUMN IF NOT EXISTS "promotionId" uuid
      `);
      await queryRunner.query(`
        ALTER TABLE "${schema}".order_items ADD COLUMN IF NOT EXISTS "promotionDiscount" numeric(10,2) NOT NULL DEFAULT 0
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
        ALTER TABLE "${schema}".order_items DROP COLUMN IF EXISTS "promotionDiscount"
      `);
      await queryRunner.query(`
        ALTER TABLE "${schema}".order_items DROP COLUMN IF EXISTS "promotionId"
      `);
      await queryRunner.query(`
        ALTER TABLE "${schema}".order_items DROP COLUMN IF EXISTS "originalUnitPrice"
      `);
    }
  }
}
