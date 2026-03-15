import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates public.notifications for admin notification list (order + call_staff).
 */
export class CreateNotificationsTable1800000000002 implements MigrationInterface {
  name = 'CreateNotificationsTable1800000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.driver.options.type === 'postgres';
    if (!isPostgres) return;

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.notifications (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        restaurant_id uuid NOT NULL,
        type character varying(50) NOT NULL,
        title character varying(255) NOT NULL,
        message text,
        order_id uuid,
        table_number integer,
        "read" boolean NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        PRIMARY KEY (id)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notifications_restaurant_created"
      ON public.notifications (restaurant_id, created_at DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notifications_restaurant_read"
      ON public.notifications (restaurant_id, "read")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.driver.options.type === 'postgres';
    if (!isPostgres) return;
    await queryRunner.query('DROP INDEX IF EXISTS public."IDX_notifications_restaurant_read"');
    await queryRunner.query('DROP INDEX IF EXISTS public."IDX_notifications_restaurant_created"');
    await queryRunner.query('DROP TABLE IF EXISTS public.notifications');
  }
}
