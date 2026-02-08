-- Fix PostgreSQL 42703 (errorMissingColumn) by creating user_personalization and personalization_options
-- Run with: psql -U upora_user -d upora_dev -f scripts/create-personalization-tables.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
);

CREATE TABLE IF NOT EXISTS "personalization_options" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "category" varchar(50) NOT NULL,
  "age_range" varchar(50) NOT NULL DEFAULT '',
  "gender" varchar(50) NOT NULL DEFAULT '',
  "options" jsonb NOT NULL DEFAULT '[]',
  "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PK_personalization_options" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IDX_personalization_options_category"
ON "personalization_options" ("category");
