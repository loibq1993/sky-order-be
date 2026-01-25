import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateUserUsernameUniqueness1704000000001 implements MigrationInterface {
  name = 'UpdateUserUsernameUniqueness1704000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop global unique index on username
    await queryRunner.query('ALTER TABLE `users` DROP INDEX `username`');
    // Add composite unique index on (username, restaurantId)
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_users_username_restaurant` ON `users` (`username`, `restaurantId`)'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `IDX_users_username_restaurant` ON `users`');
    await queryRunner.query('ALTER TABLE `users` ADD UNIQUE INDEX `username` (`username`)');
  }
}
