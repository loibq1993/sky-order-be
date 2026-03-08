import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrdersTable1700000000002 implements MigrationInterface {
    name = 'CreateOrdersTable1700000000002';

    public async up(queryRunner: QueryRunner): Promise<void> {
        if (queryRunner.connection.driver.options.type === 'postgres') return;
        // Create orders table
        await queryRunner.query(`
            CREATE TABLE \`orders\` (
                \`id\` varchar(36) NOT NULL,
                \`orderNumber\` varchar(100) NOT NULL,
                \`customerName\` varchar(100) NOT NULL,
                \`customerPhone\` varchar(20) NULL,
                \`customerAddress\` varchar(200) NULL,
                \`notes\` text NULL,
                \`subtotal\` decimal(10,2) NOT NULL,
                \`tax\` decimal(10,2) NOT NULL DEFAULT 0,
                \`deliveryFee\` decimal(10,2) NOT NULL DEFAULT 0,
                \`total\` decimal(10,2) NOT NULL,
                \`status\` enum('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled') NOT NULL DEFAULT 'pending',
                \`orderType\` enum('dine_in', 'takeaway', 'delivery') NOT NULL DEFAULT 'dine_in',
                \`estimatedDeliveryTime\` timestamp NULL,
                \`actualDeliveryTime\` timestamp NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`deletedAt\` datetime(6) NULL,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`UQ_orders_orderNumber\` (\`orderNumber\`),
                KEY \`IDX_orders_status\` (\`status\`),
                KEY \`IDX_orders_orderType\` (\`orderType\`),
                KEY \`IDX_orders_createdAt\` (\`createdAt\`),
                KEY \`IDX_orders_deletedAt\` (\`deletedAt\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        if (queryRunner.connection.driver.options.type === 'postgres') return;
        await queryRunner.query(`DROP TABLE \`orders\``);
    }
} 