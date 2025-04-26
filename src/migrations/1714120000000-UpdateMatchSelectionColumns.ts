import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateMatchSelectionColumns1714120000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 임시 컬럼 추가
    await queryRunner.query(`
      ALTER TABLE "match_selection" 
      ADD COLUMN "userId_new" uuid;
    `);

    // 2. 기존 데이터 복사 (NULL 값은 제외)
    await queryRunner.query(`
      UPDATE "match_selection" 
      SET "userId_new" = "userId"::uuid 
      WHERE "userId" IS NOT NULL;
    `);

    // 3. 기존 컬럼 삭제
    await queryRunner.query(`
      ALTER TABLE "match_selection" 
      DROP COLUMN "userId";
    `);

    // 4. 새 컬럼 이름 변경
    await queryRunner.query(`
      ALTER TABLE "match_selection" 
      RENAME COLUMN "userId_new" TO "userId";
    `);

    // 5. NOT NULL 제약 조건 추가
    await queryRunner.query(`
      ALTER TABLE "match_selection" 
      ALTER COLUMN "userId" SET NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 롤백: 컬럼을 원래 타입으로 되돌림
    await queryRunner.query(`
      ALTER TABLE "match_selection" 
      ALTER COLUMN "userId" TYPE varchar;
    `);
  }
}
