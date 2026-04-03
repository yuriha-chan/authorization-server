import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class InitialMigration1704067200000 implements MigrationInterface {
  name = 'InitialMigration1704067200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'agent_containers',
        columns: [
          { name: 'id', type: 'varchar', isPrimary: true },
          { name: 'uniqueName', type: 'varchar', isUnique: true },
          { name: 'fingerprint', type: 'varchar' },
          { name: 'publicKey', type: 'text' },
          { name: 'state', type: 'varchar', default: "'active'" },
          { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
        indices: [
          { name: 'IDX_agent_container_uniqueName', columnNames: ['uniqueName'] },
        ],
      }),
      true
    );

    await queryRunner.createTable(
      new Table({
        name: 'grant_apis',
        columns: [
          { name: 'id', type: 'varchar', isPrimary: true },
          { name: 'type', type: 'varchar' },
          { name: 'baseURL', type: 'varchar' },
          { name: 'secret', type: 'varchar' },
          { name: 'account', type: 'varchar' },
          { name: 'name', type: 'varchar' },
          { name: 'defaultRevokeTime', type: 'integer', default: 86400000 },
          { name: 'state', type: 'varchar', default: "'active'" },
          { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );

    await queryRunner.createTable(
      new Table({
        name: 'notification_apis',
        columns: [
          { name: 'id', type: 'varchar', isPrimary: true },
          { name: 'type', type: 'varchar' },
          { name: 'baseURL', type: 'varchar' },
          { name: 'secret', type: 'varchar' },
          { name: 'account', type: 'varchar' },
          { name: 'name', type: 'varchar' },
          { name: 'channel', type: 'varchar' },
          { name: 'state', type: 'varchar', default: "'active'" },
          { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );

    await queryRunner.createTable(
      new Table({
        name: 'authorizations',
        columns: [
          { name: 'id', type: 'varchar', isPrimary: true },
          { name: 'key', type: 'varchar' },
          { name: 'type', type: 'varchar' },
          { name: 'realm', type: 'json' },
          { name: 'revokeTime', type: 'datetime', isNullable: true },
          { name: 'state', type: 'varchar', default: "'active'" },
          { name: 'containerId', type: 'varchar', isNullable: true },
          { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
        foreignKeys: [
          {
            name: 'FK_authorization_container',
            columnNames: ['containerId'],
            referencedTableName: 'agent_containers',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true
    );

    await queryRunner.createTable(
      new Table({
        name: 'authorization_requests',
        columns: [
          { name: 'id', type: 'varchar', isPrimary: true },
          { name: 'state', type: 'varchar' },
          { name: 'signature', type: 'text', isNullable: true },
          { name: 'history', type: 'json', isNullable: true },
          { name: 'authorizationId', type: 'varchar', isNullable: true },
          { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
        foreignKeys: [
          {
            name: 'FK_authorization_request_authorization',
            columnNames: ['authorizationId'],
            referencedTableName: 'authorizations',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('authorization_requests');
    await queryRunner.dropTable('authorizations');
    await queryRunner.dropTable('notification_apis');
    await queryRunner.dropTable('grant_apis');
    await queryRunner.dropTable('agent_containers');
  }
}
