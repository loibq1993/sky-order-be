import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates vouchers table in every existing tenant schema.
 */
export class CreateTenantVouchersTable1800000000004 implements MigrationInterface {
  name = 'CreateTenantVouchersTable1800000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.driver.options.type === 'postgres';
    if (!isPostgres) return;

    const tenants: { schemaName: string }[] = await queryRunner.query(`
      SELECT "schemaName" FROM public.tenants WHERE "deletedAt" IS NULL
    `);

    for (const tenant of tenants) {
      const schema = tenant.schemaName.replace(/"/g, '""');
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "${schema}".vouchers (
          id uuid NOT NULL DEFAULT gen_random_uuid(),
          code character varying(50) NOT NULL,
          name character varying(200) NOT NULL,
          "nameKo" character varying(200),
          description text,
          type character varying(20) NOT NULL DEFAULT 'percentage',
          "discountValue" numeric(10,2) NOT NULL DEFAULT 0,
          "productId" uuid,
          "minOrderAmount" numeric(10,2) NOT NULL DEFAULT 0,
          "maxDiscountAmount" numeric(10,2),
          "totalUsageLimit" integer,
          "perUserLimit" integer NOT NULL DEFAULT 1,
          "usedCount" integer NOT NULL DEFAULT 0,
          "validFrom" TIMESTAMP,
          "validUntil" TIMESTAMP,
          "isActive" boolean NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
          "deletedAt" TIMESTAMP,
          PRIMARY KEY (id)
        )
      `);
      await queryRunner.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "IDX_vouchers_code"
        ON "${schema}".vouchers (code) WHERE "deletedAt" IS NULL
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
      await queryRunner.query(`DROP INDEX IF EXISTS "${schema}"."IDX_vouchers_code"`);
      await queryRunner.query(`DROP TABLE IF EXISTS "${schema}".vouchers`);
    }
  }
}
