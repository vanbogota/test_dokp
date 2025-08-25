import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStripeIdentityFields1756064329476 implements MigrationInterface {
  name = 'AddStripeIdentityFields1756064329476';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "stripeIdentitySessionId" character varying`);

    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "identityVerifiedAt" TIMESTAMP`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "identityVerifiedAt"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "stripeIdentitySessionId"`);
  }
}
