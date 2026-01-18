import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMultiTenantSupport1703123456001 implements MigrationInterface {
  name = 'AddMultiTenantSupport1703123456001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add restaurantId columns to existing tables
    try {
      await queryRunner.query('ALTER TABLE `categories` ADD COLUMN `restaurantId` VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    } catch (error) {
      try {
        await queryRunner.query('ALTER TABLE `categories` MODIFY COLUMN `restaurantId` VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
      } catch (modifyError) {
        // Ignore if already correct
      }
    }

    try {
      await queryRunner.query('ALTER TABLE `products` ADD COLUMN `restaurantId` VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    } catch (error) {
      try {
        await queryRunner.query('ALTER TABLE `products` MODIFY COLUMN `restaurantId` VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
      } catch (modifyError) {
        // Ignore if already correct
      }
    }

    try {
      await queryRunner.query('ALTER TABLE `orders` ADD COLUMN `restaurantId` VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    } catch (error) {
      try {
        await queryRunner.query('ALTER TABLE `orders` MODIFY COLUMN `restaurantId` VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
      } catch (modifyError) {
        // Ignore if already correct
      }
    }

    try {
      await queryRunner.query('ALTER TABLE `tables` ADD COLUMN `restaurantId` VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    } catch (error) {
      try {
        await queryRunner.query('ALTER TABLE `tables` MODIFY COLUMN `restaurantId` VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
      } catch (modifyError) {
        // Ignore if already correct
      }
    }

    // Create foreign key constraints
    try {
      await queryRunner.query('ALTER TABLE `users` ADD CONSTRAINT `FK_users_restaurant` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE SET NULL');
    } catch (error) {
      // Foreign key might already exist
    }

    try {
      await queryRunner.query('ALTER TABLE `categories` ADD CONSTRAINT `FK_categories_restaurant` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE');
    } catch (error) {
      // Foreign key might already exist
    }

    try {
      await queryRunner.query('ALTER TABLE `products` ADD CONSTRAINT `FK_products_restaurant` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE');
    } catch (error) {
      // Foreign key might already exist
    }

    try {
      await queryRunner.query('ALTER TABLE `orders` ADD CONSTRAINT `FK_orders_restaurant` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE');
    } catch (error) {
      // Foreign key might already exist
    }

    try {
      await queryRunner.query('ALTER TABLE `tables` ADD CONSTRAINT `FK_tables_restaurant` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE');
    } catch (error) {
      // Foreign key might already exist
    }

    // Create indexes for better performance
    try {
      await queryRunner.query('CREATE INDEX `idx_users_restaurant_id` ON `users`(`restaurantId`)');
    } catch (error) {
      // Index might already exist
    }

    try {
      await queryRunner.query('CREATE INDEX `idx_categories_restaurant_id` ON `categories`(`restaurantId`)');
    } catch (error) {
      // Index might already exist
    }

    try {
      await queryRunner.query('CREATE INDEX `idx_products_restaurant_id` ON `products`(`restaurantId`)');
    } catch (error) {
      // Index might already exist
    }

    try {
      await queryRunner.query('CREATE INDEX `idx_orders_restaurant_id` ON `orders`(`restaurantId`)');
    } catch (error) {
      // Index might already exist
    }

    try {
      await queryRunner.query('CREATE INDEX `idx_tables_restaurant_id` ON `tables`(`restaurantId`)');
    } catch (error) {
      // Index might already exist
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    try {
      await queryRunner.query('DROP INDEX `idx_users_restaurant_id` ON `users`');
    } catch (error) {
      // Ignore if index doesn't exist
    }

    try {
      await queryRunner.query('DROP INDEX `idx_categories_restaurant_id` ON `categories`');
    } catch (error) {
      // Ignore if index doesn't exist
    }

    try {
      await queryRunner.query('DROP INDEX `idx_products_restaurant_id` ON `products`');
    } catch (error) {
      // Ignore if index doesn't exist
    }

    try {
      await queryRunner.query('DROP INDEX `idx_orders_restaurant_id` ON `orders`');
    } catch (error) {
      // Ignore if index doesn't exist
    }

    try {
      await queryRunner.query('DROP INDEX `idx_tables_restaurant_id` ON `tables`');
    } catch (error) {
      // Ignore if index doesn't exist
    }

    // Drop foreign key constraints
    try {
      await queryRunner.query('ALTER TABLE `users` DROP FOREIGN KEY `FK_users_restaurant`');
    } catch (error) {
      // Ignore if foreign key doesn't exist
    }

    try {
      await queryRunner.query('ALTER TABLE `categories` DROP FOREIGN KEY `FK_categories_restaurant`');
    } catch (error) {
      // Ignore if foreign key doesn't exist
    }

    try {
      await queryRunner.query('ALTER TABLE `products` DROP FOREIGN KEY `FK_products_restaurant`');
    } catch (error) {
      // Ignore if foreign key doesn't exist
    }

    try {
      await queryRunner.query('ALTER TABLE `orders` DROP FOREIGN KEY `FK_orders_restaurant`');
    } catch (error) {
      // Ignore if foreign key doesn't exist
    }

    try {
      await queryRunner.query('ALTER TABLE `tables` DROP FOREIGN KEY `FK_tables_restaurant`');
    } catch (error) {
      // Ignore if foreign key doesn't exist
    }

    // Drop restaurantId columns
    try {
      await queryRunner.query('ALTER TABLE `categories` DROP COLUMN `restaurantId`');
    } catch (error) {
      // Ignore if column doesn't exist
    }

    try {
      await queryRunner.query('ALTER TABLE `products` DROP COLUMN `restaurantId`');
    } catch (error) {
      // Ignore if column doesn't exist
    }

    try {
      await queryRunner.query('ALTER TABLE `orders` DROP COLUMN `restaurantId`');
    } catch (error) {
      // Ignore if column doesn't exist
    }

    try {
      await queryRunner.query('ALTER TABLE `tables` DROP COLUMN `restaurantId`');
    } catch (error) {
      // Ignore if column doesn't exist
    }
  }
}
