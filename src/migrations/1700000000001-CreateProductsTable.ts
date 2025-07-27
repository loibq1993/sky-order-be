import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductsTable1700000000001 implements MigrationInterface {
    name = 'CreateProductsTable1700000000001';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create products table
        await queryRunner.query(`
      CREATE TABLE \`products\` (
        \`id\` varchar(36) NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`nameKo\` varchar(255) NOT NULL,
        \`addName\` varchar(255),
        \`addNameKo\` varchar(255),
        \`price\` decimal(10,2) NOT NULL,
        \`description\` text,
        \`descriptionKo\` text,
        \`image\` varchar(255),
        \`categoryId\` varchar(36) NULL,
        \`category\` varchar(255) NULL,
        \`categoryKo\` varchar(255) NULL,
        \`available\` tinyint NOT NULL DEFAULT 1,
        \`enabled\` tinyint NOT NULL DEFAULT 1,
        \`sales\` int NOT NULL DEFAULT 0,
        \`statusKey\` varchar(255),
        \`count\` int NOT NULL DEFAULT 0,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deletedAt\` datetime(6) NULL,
        PRIMARY KEY (\`id\`),
        KEY \`IDX_products_categoryId\` (\`categoryId\`),
        KEY \`IDX_products_available\` (\`available\`),
        KEY \`IDX_products_enabled\` (\`enabled\`),
        KEY \`IDX_products_deletedAt\` (\`deletedAt\`),
        CONSTRAINT \`FK_products_category\` FOREIGN KEY (\`categoryId\`) REFERENCES \`categories\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`products\``);
    }
} 