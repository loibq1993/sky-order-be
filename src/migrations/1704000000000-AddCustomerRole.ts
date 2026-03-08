import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerRole1704000000000 implements MigrationInterface {
  name = 'AddCustomerRole1704000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (queryRunner.connection.driver.options.type === 'postgres') return;
    // Update the enum to include 'customer' role
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY COLUMN \`role\` ENUM('super_admin', 'restaurant_owner', 'restaurant_manager', 'restaurant_staff', 'customer') DEFAULT 'restaurant_staff'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (queryRunner.connection.driver.options.type === 'postgres') return;
    // Revert to old enum values (remove 'customer')
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY COLUMN \`role\` ENUM('super_admin', 'restaurant_owner', 'restaurant_manager', 'restaurant_staff') DEFAULT 'restaurant_staff'`
    );
  }
}
