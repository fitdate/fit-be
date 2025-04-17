import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateChatRoomUsersTable1744891983659
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chat_room_users" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "chat_room_id" uuid NOT NULL REFERENCES "chat_room"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_room_users" CASCADE`);
  }
}
