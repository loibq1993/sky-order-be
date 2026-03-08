import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateOrderStatusEnum1700000000008 implements MigrationInterface {
    name = 'UpdateOrderStatusEnum1700000000008'

    public async up(queryRunner: QueryRunner): Promise<void> {
        if (queryRunner.connection.driver.options.type === 'postgres') return;
        // Update the enum to include new statuses
        await queryRunner.query(`ALTER TABLE \`orders\` MODIFY COLUMN \`status\` ENUM('pending', 'confirmed', 'preparing', 'ready', 'served', 'delivered', 'completed', 'cancelled') DEFAULT 'pending'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        if (queryRunner.connection.driver.options.type === 'postgres') return;
        // Revert to old enum values
        await queryRunner.query(`ALTER TABLE \`orders\` MODIFY COLUMN \`status\` ENUM('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled') DEFAULT 'pending'`);
    }
} 