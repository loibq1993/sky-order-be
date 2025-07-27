import { MigrationInterface, QueryRunner } from "typeorm";

export class AddQrUuidToTables1700000000007 implements MigrationInterface {
    name = 'AddQrUuidToTables1700000000007'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tables\` ADD \`qrUuid\` varchar(36)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tables\` DROP COLUMN \`qrUuid\``);
    }
} 