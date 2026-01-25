import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandRestaurantImageFields1704000000004 implements MigrationInterface {
  name = 'ExpandRestaurantImageFields1704000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `restaurants` MODIFY COLUMN `logo` LONGTEXT NULL');
    await queryRunner.query('ALTER TABLE `restaurants` MODIFY COLUMN `coverImage` LONGTEXT NULL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `restaurants` MODIFY COLUMN `logo` VARCHAR(500) NULL');
    await queryRunner.query('ALTER TABLE `restaurants` MODIFY COLUMN `coverImage` VARCHAR(500) NULL');
  }
}
