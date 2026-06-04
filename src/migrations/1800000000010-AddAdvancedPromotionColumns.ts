import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdvancedPromotionColumns1800000000010 implements MigrationInterface {
  name = 'AddAdvancedPromotionColumns1800000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.driver.options.type === 'postgres';
    if (!isPostgres) return;

    const tenants: { schemaName: string }[] = await queryRunner.query(`
      SELECT "schemaName" FROM public.tenants WHERE "deletedAt" IS NULL
    `);

    for (const tenant of tenants) {
      const schema = tenant.schemaName.replace(/"/g, '""');
      await queryRunner.query(`
        ALTER TABLE "${schema}".product_promotions ADD COLUMN IF NOT EXISTS "promotionType" character varying(20) NOT NULL DEFAULT 'standard';
        ALTER TABLE "${schema}".product_promotions ADD COLUMN IF NOT EXISTS "timeStart" character varying(5);
        ALTER TABLE "${schema}".product_promotions ADD COLUMN IF NOT EXISTS "timeEnd" character varying(5);
        ALTER TABLE "${schema}".product_promotions ADD COLUMN IF NOT EXISTS "daysOfWeek" character varying(30);
        ALTER TABLE "${schema}".product_promotions ADD COLUMN IF NOT EXISTS "buyQuantity" integer;
        ALTER TABLE "${schema}".product_promotions ADD COLUMN IF NOT EXISTS "getQuantity" integer;
        ALTER TABLE "${schema}".product_promotions ADD COLUMN IF NOT EXISTS "rewardProductId" uuid;
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
        ALTER TABLE "${schema}".product_promotions DROP COLUMN IF EXISTS "rewardProductId";
        ALTER TABLE "${schema}".product_promotions DROP COLUMN IF EXISTS "getQuantity";
        ALTER TABLE "${schema}".product_promotions DROP COLUMN IF EXISTS "buyQuantity";
        ALTER TABLE "${schema}".product_promotions DROP COLUMN IF EXISTS "daysOfWeek";
        ALTER TABLE "${schema}".product_promotions DROP COLUMN IF EXISTS "timeEnd";
        ALTER TABLE "${schema}".product_promotions DROP COLUMN IF EXISTS "timeStart";
        ALTER TABLE "${schema}".product_promotions DROP COLUMN IF EXISTS "promotionType";
      `);
    }
  }
}
