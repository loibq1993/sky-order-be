import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRestaurantMediaAndHours1704000000003 implements MigrationInterface {
  name = 'AddRestaurantMediaAndHours1704000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `restaurants` ADD COLUMN `coverImage` VARCHAR(500) NULL');
    await queryRunner.query('ALTER TABLE `restaurants` ADD COLUMN `businessHours` JSON NULL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `restaurants` DROP COLUMN `businessHours`');
    await queryRunner.query('ALTER TABLE `restaurants` DROP COLUMN `coverImage`');
  }
}
