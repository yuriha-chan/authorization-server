import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAuthTokenAndMetadata1704067200003 implements MigrationInterface {
  name = 'AddAuthTokenAndMetadata1704067200003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'authorizations',
      new TableColumn({
        name: 'token',
        type: 'varchar',
        isNullable: true,
      })
    );

    await queryRunner.addColumn(
      'authorizations',
      new TableColumn({
        name: 'metadata',
        type: 'json',
        isNullable: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('authorizations', 'token');
    await queryRunner.dropColumn('authorizations', 'metadata');
  }
}
