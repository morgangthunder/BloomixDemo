-- Phase 6: User Management migration
-- Adds subscription_renewal_at to users and creates lesson_engagement_transcriptions

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "subscription_renewal_at" TIMESTAMP;

CREATE TABLE IF NOT EXISTS "lesson_engagement_transcriptions" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "user_id" uuid NOT NULL,
  "lesson_id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  "user_session_id" uuid,
  "transcript" jsonb NOT NULL DEFAULT '[]',
  "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PK_lesson_engagement_transcriptions" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IDX_lesson_engagement_transcriptions_user_id"
ON "lesson_engagement_transcriptions" ("user_id");

CREATE INDEX IF NOT EXISTS "IDX_lesson_engagement_transcriptions_lesson_id"
ON "lesson_engagement_transcriptions" ("lesson_id");
