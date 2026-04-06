import { MigrationInterface, QueryRunner, Table } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

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

    const templatesDir = path.join(__dirname, '../../templates/github');
    const grantCode = fs.readFileSync(path.join(templatesDir, 'grant.js'), 'utf-8');
    const revokeCode = fs.readFileSync(path.join(templatesDir, 'revoke.js'), 'utf-8');
    const getStatusCode = fs.readFileSync(path.join(templatesDir, 'getStatus.js'), 'utf-8');

    await queryRunner.query(
      `INSERT INTO grant_api_types (id, name, grantCode, revokeCode, getStatusCode)
       VALUES ('default-github-type', 'github', ?, ?, ?)`,
      [grantCode, revokeCode, getStatusCode]
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('grant_api_types');
  }
}
