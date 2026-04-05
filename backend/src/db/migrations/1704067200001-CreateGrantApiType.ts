import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateGrantApiType1704067200001 implements MigrationInterface {
  name = 'CreateGrantApiType1704067200001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'grant_api_types',
        columns: [
          { name: 'id', type: 'varchar', isPrimary: true },
          { name: 'name', type: 'varchar', isUnique: true },
          { name: 'grantCode', type: 'text' },
          { name: 'revokeCode', type: 'text' },
          { name: 'getStatusCode', type: 'text' },
          { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );

    // Insert the default 'github' type
    await queryRunner.query(`
      INSERT INTO grant_api_types (id, name, grantCode, revokeCode, getStatusCode)
      VALUES (
        'default-github-type',
        'github',
        'async function grant(secrets, account, realm) { return { token: secrets.token }; }',
        'async function revoke(secrets, account, token) { return { revoked: true }; }',
        'async function getStatus(secrets, account, token) { return { active: true }; }'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('grant_api_types');
  }
}
