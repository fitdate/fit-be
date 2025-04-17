import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProfileTable1744891983659 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "profile" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "intro" VARCHAR(255),
        "job" VARCHAR(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "profileId" uuid
    `);

    try {
      await queryRunner.query(`
        ALTER TABLE "user" ADD CONSTRAINT "FK_9466682df91534dd95e4dbaa616" 
        FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      `);
    } catch {
      // 제약조건이 이미 존재함, 무시
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    try {
      await queryRunner.query(
        `ALTER TABLE "user" DROP CONSTRAINT "FK_9466682df91534dd95e4dbaa616"`,
      );
    } catch {
      // 제약조건이 존재하지 않음, 무시
    }
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN IF EXISTS "profileId"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "profile" CASCADE`);
  }
}
