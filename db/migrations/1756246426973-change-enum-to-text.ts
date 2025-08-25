import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeEnumToText1756246426973 implements MigrationInterface {
  name = 'ChangeEnumToText1756246426973';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" TYPE TEXT`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "identityStatus" TYPE TEXT`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'admin', 'doctor')`);
    await queryRunner.query(
      `CREATE TYPE "public"."users_identitystatus_enum" AS ENUM('pending', 'verified', 'failed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum" USING "role"::"public"."users_role_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "identityStatus" TYPE "public"."users_identitystatus_enum" USING "identityStatus"::"public"."users_identitystatus_enum"`,
    );
  }
}
