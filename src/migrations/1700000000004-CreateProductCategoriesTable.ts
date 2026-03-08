import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductCategoriesTable1700000000004 implements MigrationInterface {
    name = 'CreateProductCategoriesTable1700000000004';

    public async up(queryRunner: QueryRunner): Promise<void> {
        if (queryRunner.connection.driver.options.type === 'postgres') return;
        // Create product_categories junction table
        await queryRunner.query(`
            CREATE TABLE \`product_categories\` (
                \`id\` varchar(36) NOT NULL,
                \`productId\` varchar(36) NOT NULL,
                \`categoryId\` varchar(36) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`UQ_product_categories_unique\` (\`productId\`, \`categoryId\`),
                KEY \`IDX_product_categories_productId\` (\`productId\`),
                KEY \`IDX_product_categories_categoryId\` (\`categoryId\`),
                CONSTRAINT \`FK_product_categories_product\` FOREIGN KEY (\`productId\`) REFERENCES \`products\` (\`id\`) ON DELETE CASCADE,
                CONSTRAINT \`FK_product_categories_category\` FOREIGN KEY (\`categoryId\`) REFERENCES \`categories\` (\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        if (queryRunner.connection.driver.options.type === 'postgres') return;
        await queryRunner.query(`DROP TABLE \`product_categories\``);
    }
} 