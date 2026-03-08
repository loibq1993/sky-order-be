import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCategoriesTable1700000000000 implements MigrationInterface {
    name = 'CreateCategoriesTable1700000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        if (queryRunner.connection.driver.options.type === 'postgres') return;
        // Create categories table
        await queryRunner.query(`
      CREATE TABLE \`categories\` (
        \`id\` varchar(36) NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`nameKo\` varchar(255) NOT NULL,
        \`description\` text,
        \`descriptionKo\` text,
        \`image\` varchar(255),
        \`isActive\` tinyint NOT NULL DEFAULT 1,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deletedAt\` datetime(6) NULL,
        PRIMARY KEY (\`id\`),
        KEY \`IDX_categories_isActive\` (\`isActive\`),
        KEY \`IDX_categories_deletedAt\` (\`deletedAt\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        if (queryRunner.connection.driver.options.type === 'postgres') return;
        await queryRunner.query(`DROP TABLE \`categories\``);
    }
} 