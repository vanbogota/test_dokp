import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVerificationSessionsTable1756457527890 implements MigrationInterface {
  name = 'CreateVerificationSessionsTable1756457527890';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "verification_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "sessionId" character varying NOT NULL, CONSTRAINT "UQ_b9e1188df462b24eaffc4d02565" UNIQUE ("userId"), CONSTRAINT "UQ_2896c3c24aaa164335e3ad73234" UNIQUE ("sessionId"), CONSTRAINT "PK_5e6a11608a05c9d913348fe8f77" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "verification_sessions"`);
  }
}
