import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds payment columns to orders table in every existing tenant schema.
 */
export class AddOrderPaymentColumns1800000000011 implements MigrationInterface {
  name = 'AddOrderPaymentColumns1800000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.driver.options.type === 'postgres';
    if (!isPostgres) return;

    const tenants: { schemaName: string }[] = await queryRunner.query(`
      SELECT "schemaName" FROM public.tenants WHERE "deletedAt" IS NULL
    `);

    for (const tenant of tenants) {
      const schema = tenant.schemaName.replace(/"/g, '""');
      await queryRunner.query(`
        ALTER TABLE "${schema}".orders ADD COLUMN IF NOT EXISTS "paymentStatus" character varying(20) NOT NULL DEFAULT 'unpaid'
      `);
      await queryRunner.query(`
        ALTER TABLE "${schema}".orders ADD COLUMN IF NOT EXISTS "paymentMethod" character varying(30)
      `);
      await queryRunner.query(`
        ALTER TABLE "${schema}".orders ADD COLUMN IF NOT EXISTS "stripeCheckoutSessionId" character varying(255)
      `);
      await queryRunner.query(`
        ALTER TABLE "${schema}".orders ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" character varying(255)
      `);
      await queryRunner.query(`
        ALTER TABLE "${schema}".orders ADD COLUMN IF NOT EXISTS "sepayTransactionId" character varying(64)
      `);
      await queryRunner.query(`
        ALTER TABLE "${schema}".orders ADD COLUMN IF NOT EXISTS "sepayReferenceCode" character varying(255)
      `);
      await queryRunner.query(`
        ALTER TABLE "${schema}".orders ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP
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
        ALTER TABLE "${schema}".orders DROP COLUMN IF EXISTS "paidAt"
      `);
      await queryRunner.query(`
        ALTER TABLE "${schema}".orders DROP COLUMN IF EXISTS "sepayReferenceCode"
      `);
      await queryRunner.query(`
        ALTER TABLE "${schema}".orders DROP COLUMN IF EXISTS "sepayTransactionId"
      `);
      await queryRunner.query(`
        ALTER TABLE "${schema}".orders DROP COLUMN IF EXISTS "stripePaymentIntentId"
      `);
      await queryRunner.query(`
        ALTER TABLE "${schema}".orders DROP COLUMN IF EXISTS "stripeCheckoutSessionId"
      `);
      await queryRunner.query(`
        ALTER TABLE "${schema}".orders DROP COLUMN IF EXISTS "paymentMethod"
      `);
      await queryRunner.query(`
        ALTER TABLE "${schema}".orders DROP COLUMN IF EXISTS "paymentStatus"
      `);
    }
  }
}
