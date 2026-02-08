import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fixes PostgreSQL 23505: personalization_options_category_key unique constraint.
 * The table had a UNIQUE(category) which prevents multiple variants per category.
 * Replace with UNIQUE(category, age_range, gender) for variant support.
 */
export class FixPersonalizationOptionsUniqueConstraint1735400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "personalization_options" DROP CONSTRAINT IF EXISTS "personalization_options_category_key"`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "idx_personalization_options_category_age_gender" ON "personalization_options" ("category", "age_range", "gender")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_personalization_options_category_age_gender"`
    );
    await queryRunner.query(
      `ALTER TABLE "personalization_options" ADD CONSTRAINT "personalization_options_category_key" UNIQUE ("category")`
    );
  }
}
