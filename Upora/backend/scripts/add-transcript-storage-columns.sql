-- Add columns required for transcript storage (MinIO/S3).
-- Run this if you get 500 on POST /api/interaction-data/session/:sessionId/transcript
-- and have not run the TypeORM migration 1735700000000.

ALTER TABLE "lesson_engagement_transcriptions"
ADD COLUMN IF NOT EXISTS "storage_key" VARCHAR(512);

ALTER TABLE "lesson_engagement_transcriptions"
ADD COLUMN IF NOT EXISTS "entry_count" INTEGER DEFAULT 0;
