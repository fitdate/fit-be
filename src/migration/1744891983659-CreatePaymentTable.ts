import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentTable1744891983659 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payment" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "order_id" VARCHAR(255) NOT NULL,
        "order_name" VARCHAR(255) NOT NULL,
        "amount" INTEGER NOT NULL,
        "payment_method" VARCHAR(50) NOT NULL,
        "status" VARCHAR(50) NOT NULL,
        "customer_name" VARCHAR(255) NOT NULL,
        "customer_email" VARCHAR(255) NOT NULL,
        "customer_mobile_phone" VARCHAR(255) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "payment" CASCADE`);
  }
}
