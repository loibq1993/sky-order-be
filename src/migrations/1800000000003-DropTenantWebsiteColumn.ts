import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tenant storefront URL is only `customDomain`. Backfill from legacy `website` then drop column.
 */
export class DropTenantWebsiteColumn1800000000003 implements MigrationInterface {
  name = 'DropTenantWebsiteColumn1800000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.driver.options.type === 'postgres';
    if (!isPostgres) return;

    // Chỉ chạy khi DB cũ còn cột website (bản gen schema mới không tạo cột này).
    await queryRunner.query(`
      DO $migration$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'website'
        ) THEN
          UPDATE public.tenants
          SET "customDomain" = regexp_replace(
            regexp_replace(TRIM(website), '^https?://', '', 'i'),
            '/.*$',
            ''
          )
          WHERE ("customDomain" IS NULL OR TRIM("customDomain") = '')
            AND website IS NOT NULL
            AND TRIM(website) <> '';

          ALTER TABLE public.tenants DROP COLUMN website;
        END IF;
      END
      $migration$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.driver.options.type === 'postgres';
    if (!isPostgres) return;

    await queryRunner.query(
      `ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS website character varying(200)`,
    );
    await queryRunner.query(`UPDATE public.tenants SET website = "customDomain" WHERE website IS NULL`);
  }
}
