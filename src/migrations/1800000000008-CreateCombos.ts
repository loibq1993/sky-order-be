import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCombos1800000000008 implements MigrationInterface {
  name = 'CreateCombos1800000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.driver.options.type === 'postgres';
    if (!isPostgres) return;

    const tenants: { schemaName: string }[] = await queryRunner.query(`
      SELECT "schemaName" FROM public.tenants WHERE "deletedAt" IS NULL
    `);

    for (const tenant of tenants) {
      const schema = tenant.schemaName.replace(/"/g, '""');
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "${schema}".combos (
          id uuid NOT NULL DEFAULT gen_random_uuid(),
          name character varying(200) NOT NULL,
          "nameKo" character varying(200),
          description text,
          "descriptionKo" text,
          price numeric(10,2) NOT NULL,
          image character varying(500),
          "validFrom" TIMESTAMP,
          "validUntil" TIMESTAMP,
          "sortOrder" integer NOT NULL DEFAULT 0,
          "isActive" boolean NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
          "deletedAt" TIMESTAMP,
          PRIMARY KEY (id)
        )
      `);
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "${schema}".combo_items (
          id uuid NOT NULL DEFAULT gen_random_uuid(),
          "comboId" uuid NOT NULL,
          "productId" uuid NOT NULL,
          quantity integer NOT NULL DEFAULT 1,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
          PRIMARY KEY (id),
          CONSTRAINT "FK_combo_items_combo" FOREIGN KEY ("comboId") REFERENCES "${schema}".combos(id) ON DELETE CASCADE
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
      await queryRunner.query(`DROP TABLE IF EXISTS "${schema}".combo_items`);
      await queryRunner.query(`DROP TABLE IF EXISTS "${schema}".combos`);
    }
  }
}
