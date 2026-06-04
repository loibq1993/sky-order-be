import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductPromotions1800000000006 implements MigrationInterface {
  name = 'CreateProductPromotions1800000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.driver.options.type === 'postgres';
    if (!isPostgres) return;

    const tenants: { schemaName: string }[] = await queryRunner.query(`
      SELECT "schemaName" FROM public.tenants WHERE "deletedAt" IS NULL
    `);

    for (const tenant of tenants) {
      const schema = tenant.schemaName.replace(/"/g, '""');
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "${schema}".product_promotions (
          id uuid NOT NULL DEFAULT gen_random_uuid(),
          name character varying(200) NOT NULL,
          scope character varying(20) NOT NULL DEFAULT 'product',
          "productId" uuid,
          "categoryId" uuid,
          "discountMode" character varying(20) NOT NULL DEFAULT 'percentage',
          "discountValue" numeric(10,2) NOT NULL,
          "maxDiscountAmount" numeric(10,2),
          "validFrom" TIMESTAMP NOT NULL,
          "validUntil" TIMESTAMP NOT NULL,
          priority integer NOT NULL DEFAULT 0,
          "isActive" boolean NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
          "deletedAt" TIMESTAMP,
          PRIMARY KEY (id)
        )
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
      await queryRunner.query(`DROP TABLE IF EXISTS "${schema}".product_promotions`);
    }
  }
}
