import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrderItemsTable1700000000003 implements MigrationInterface {
    name = 'CreateOrderItemsTable1700000000003';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create order_items table
        await queryRunner.query(`
            CREATE TABLE \`order_items\` (
                \`id\` varchar(36) NOT NULL,
                \`orderId\` varchar(36) NOT NULL,
                \`productId\` varchar(36) NOT NULL,
                \`productName\` varchar(200) NOT NULL,
                \`unitPrice\` decimal(10,2) NOT NULL,
                \`quantity\` int NOT NULL,
                \`totalPrice\` decimal(10,2) NOT NULL,
                \`specialInstructions\` text NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                KEY \`IDX_order_items_orderId\` (\`orderId\`),
                KEY \`IDX_order_items_productId\` (\`productId\`),
                CONSTRAINT \`FK_order_items_order\` FOREIGN KEY (\`orderId\`) REFERENCES \`orders\` (\`id\`) ON DELETE CASCADE,
                CONSTRAINT \`FK_order_items_product\` FOREIGN KEY (\`productId\`) REFERENCES \`products\` (\`id\`) ON DELETE RESTRICT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`order_items\``);
    }
} 