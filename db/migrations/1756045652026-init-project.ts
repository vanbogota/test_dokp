import { MigrationInterface, QueryRunner } from "typeorm";

export class InitProject1756045652026 implements MigrationInterface {
    name = 'InitProject1756045652026'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'admin', 'doctor')`);
        await queryRunner.query(`CREATE TYPE "public"."users_identitystatus_enum" AS ENUM('pending', 'verified', 'failed')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "auth0Sub" character varying NOT NULL, "email" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'user', "identityStatus" "public"."users_identitystatus_enum" NOT NULL DEFAULT 'pending', "firstName" character varying(50) NOT NULL, "lastName" character varying(50) NOT NULL, "country" character varying(50) NOT NULL, "birthYear" integer NOT NULL, CONSTRAINT "UQ_59cd043c4d4736d4038f8423985" UNIQUE ("auth0Sub"), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_identitystatus_enum"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    }

}
