import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserTable1744891923659 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "email" VARCHAR(255) NOT NULL UNIQUE,
        "password" VARCHAR(255) NOT NULL,
        "nickname" VARCHAR(255) NOT NULL UNIQUE,
        "name" VARCHAR(255) NOT NULL,
        "birthday" VARCHAR(255),
        "gender" VARCHAR(10),
        "address" VARCHAR(255),
        "phoneNumber" VARCHAR(255),
        "latitude" double precision,
        "longitude" double precision,
        "role" VARCHAR(20) NOT NULL DEFAULT 'USER',
        "likeCount" integer,
        "isProfileComplete" boolean NOT NULL DEFAULT false,
        "authProvider" VARCHAR(20) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user" CASCADE`);
  }
}
