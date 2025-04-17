import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLikeTable1744891983659 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "like" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "from_user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "to_user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "like" CASCADE`);
  }
}
