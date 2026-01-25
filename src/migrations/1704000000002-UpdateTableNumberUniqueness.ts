import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableNumberUniqueness1704000000002 implements MigrationInterface {
  name = 'UpdateTableNumberUniqueness1704000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const indexes: Array<{ INDEX_NAME: string }> = await queryRunner.query(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'tables'
         AND COLUMN_NAME = 'tableNumber'
         AND NON_UNIQUE = 0`
    );

    for (const index of indexes) {
      await queryRunner.query(`ALTER TABLE \`tables\` DROP INDEX \`${index.INDEX_NAME}\``);
    }

    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_tables_restaurant_table_number` ON `tables` (`restaurantId`, `tableNumber`)'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `IDX_tables_restaurant_table_number` ON `tables`');
    await queryRunner.query('CREATE UNIQUE INDEX `tableNumber` ON `tables` (`tableNumber`)');
  }
}
