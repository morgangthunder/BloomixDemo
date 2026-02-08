import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates user_personalization and personalization_options tables
 * required for onboarding. Fixes PostgreSQL error 42703 (errorMissingColumn)
 * when these tables don't exist or have incorrect schema.
 */
export class CreateUserPersonalizationTables1735300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid-ossp extension for uuid_generate_v4()
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create user_personalization table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_personalization" (
        "user_id" uuid NOT NULL,
        "full_name" varchar(255),
        "age_range" varchar(20),
        "gender" varchar(50),
        "favourite_tv_movies" text[],
        "hobbies_interests" text[],
        "learning_areas" text[],
        "onboarding_completed_at" timestamp,
        "skipped_onboarding" boolean NOT NULL DEFAULT false,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_user_personalization" PRIMARY KEY ("user_id")
      )
    `);

    // Create personalization_options table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "personalization_options" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "category" varchar(50) NOT NULL,
        "age_range" varchar(50) NOT NULL DEFAULT '',
        "gender" varchar(50) NOT NULL DEFAULT '',
        "options" jsonb NOT NULL DEFAULT '[]',
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_personalization_options" PRIMARY KEY ("id")
      )
    `);

    // Index for options lookup by category
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_personalization_options_category"
      ON "personalization_options" ("category")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "personalization_options"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_personalization"`);
  }
}
