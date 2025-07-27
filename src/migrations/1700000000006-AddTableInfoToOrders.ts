import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTableInfoToOrders1700000000006 implements MigrationInterface {
    name = 'AddTableInfoToOrders1700000000006'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if tableId column exists before adding it
        const tableIdExists = await queryRunner.hasColumn('orders', 'tableId');
        if (!tableIdExists) {
            await queryRunner.query(`ALTER TABLE \`orders\` ADD \`tableId\` varchar(36)`);
        }

        // Check if tableNumber column exists before adding it
        const tableNumberExists = await queryRunner.hasColumn('orders', 'tableNumber');
        if (!tableNumberExists) {
            await queryRunner.query(`ALTER TABLE \`orders\` ADD \`tableNumber\` int`);
        }
        // Foreign key constraint will be handled by TypeORM entity relationships
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`tableNumber\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`tableId\``);
    }
} 