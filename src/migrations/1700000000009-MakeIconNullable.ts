import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeIconNullable1700000000009 implements MigrationInterface {
    name = 'MakeIconNullable1700000000009'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`categories\` MODIFY \`icon\` varchar(10) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`categories\` MODIFY \`icon\` varchar(10) NOT NULL`);
    }
} 