import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMultiTenantTables1703123456000 implements MigrationInterface {
  name = 'CreateMultiTenantTables1703123456000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (queryRunner.connection.driver.options.type === 'postgres') return;
    // Create restaurants table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`restaurants\` (
        \`id\` VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`name\` VARCHAR(200) NOT NULL,
        \`nameKo\` VARCHAR(200) NULL,
        \`description\` TEXT NULL,
        \`descriptionKo\` TEXT NULL,
        \`logo\` VARCHAR(500) NULL,
        \`address\` VARCHAR(200) NULL,
        \`phone\` VARCHAR(20) NULL,
        \`email\` VARCHAR(100) NULL,
        \`timezone\` VARCHAR(50) NULL,
        \`currency\` VARCHAR(10) NULL,
        \`language\` VARCHAR(10) NULL,
        \`isActive\` BOOLEAN DEFAULT true,
        \`settings\` JSON NULL,
        \`createdAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`deletedAt\` TIMESTAMP NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`username\` VARCHAR(100) NOT NULL UNIQUE,
        \`passwordHash\` VARCHAR(255) NOT NULL,
        \`email\` VARCHAR(200) NULL,
        \`firstName\` VARCHAR(100) NULL,
        \`lastName\` VARCHAR(100) NULL,
        \`phone\` VARCHAR(20) NULL,
        \`role\` ENUM('super_admin', 'restaurant_owner', 'restaurant_manager', 'restaurant_staff') DEFAULT 'restaurant_staff',
        \`restaurantId\` VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
        \`isActive\` BOOLEAN DEFAULT true,
        \`lastLoginAt\` TIMESTAMP NULL,
        \`lastLoginIp\` VARCHAR(45) NULL,
        \`createdAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`deletedAt\` TIMESTAMP NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (queryRunner.connection.driver.options.type === 'postgres') return;
    await queryRunner.query('DROP TABLE IF EXISTS `users`');
    await queryRunner.query('DROP TABLE IF EXISTS `restaurants`');
  }
}
