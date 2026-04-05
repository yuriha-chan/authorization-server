import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

export class UpdateGrantApiTypeRelationship1704067200002 implements MigrationInterface {
  name = 'UpdateGrantApiTypeRelationship1704067200002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add foreign key constraint to grant_apis table
    await queryRunner.createForeignKey(
      'grant_apis',
      new TableForeignKey({
        name: 'FK_grant_api_type',
        columnNames: ['type'],
        referencedTableName: 'grant_api_types',
        referencedColumnNames: ['name'],
        onDelete: 'RESTRICT',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('grant_apis', 'FK_grant_api_type');
  }
}
