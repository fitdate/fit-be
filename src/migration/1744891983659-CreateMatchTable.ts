import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMatchTable1744891983659 implements MigrationInterface {
  name = 'CreateMatchTable1744891983659';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "match" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "matchId" character varying NOT NULL,
                "user1Id" uuid NOT NULL,
                "user2Id" uuid NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_match_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_match_matchId" UNIQUE ("matchId"),
                CONSTRAINT "FK_match_user1" FOREIGN KEY ("user1Id") REFERENCES "profile"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_match_user2" FOREIGN KEY ("user2Id") REFERENCES "profile"("id") ON DELETE CASCADE
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "match"
        `);
  }
}
