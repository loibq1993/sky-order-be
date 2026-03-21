import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates multi-tenant registry in public schema: tenants, platform_users.
 * Tenant data lives in per-tenant schemas (created at runtime via TenantService).
 */
export class CreateMultiTenantRegistry1800000000000 implements MigrationInterface {
  name = 'CreateMultiTenantRegistry1800000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.driver.options.type === 'postgres';
    if (!isPostgres) return;

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.tenants (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        "schemaName" character varying(100) NOT NULL,
        name character varying(200) NOT NULL,
        "nameKo" character varying(200),
        description text,
        "descriptionKo" text,
        logo text,
        "coverImage" text,
        address character varying(200),
        phone character varying(20),
        email character varying(100),
        "customDomain" character varying(200),
        timezone character varying(50),
        currency character varying(10),
        language character varying(10),
        "isActive" boolean DEFAULT true,
        settings jsonb,
        "businessHours" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE ("schemaName"),
        UNIQUE ("customDomain")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.platform_users (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        username character varying(100) NOT NULL,
        "passwordHash" character varying(255) NOT NULL,
        email character varying(200),
        role character varying(20) DEFAULT 'super_admin',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        PRIMARY KEY (id),
        UNIQUE (username)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.driver.options.type === 'postgres';
    if (!isPostgres) return;
    await queryRunner.query('DROP TABLE IF EXISTS public.platform_users');
    await queryRunner.query('DROP TABLE IF EXISTS public.tenants');
  }
}
