import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRestaurantCustomDomain1704000000005 implements MigrationInterface {
  name = 'AddRestaurantCustomDomain1704000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (queryRunner.connection.driver.options.type === 'postgres') return;
    await queryRunner.query('ALTER TABLE `restaurants` ADD COLUMN `customDomain` VARCHAR(200) NULL');
    await queryRunner.query('CREATE UNIQUE INDEX `IDX_restaurants_custom_domain` ON `restaurants` (`customDomain`)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (queryRunner.connection.driver.options.type === 'postgres') return;
    await queryRunner.query('DROP INDEX `IDX_restaurants_custom_domain` ON `restaurants`');
    await queryRunner.query('ALTER TABLE `restaurants` DROP COLUMN `customDomain`');
  }
}
