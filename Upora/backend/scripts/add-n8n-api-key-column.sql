-- Add n8n_api_key to message_delivery_settings (if migration did not run).
-- Run against your PostgreSQL DB, e.g.:
--   docker compose exec -T db psql -U postgres -d upora -f - < scripts/add-n8n-api-key-column.sql
-- Or: psql $DATABASE_URL -f scripts/add-n8n-api-key-column.sql

ALTER TABLE "message_delivery_settings"
ADD COLUMN IF NOT EXISTS "n8n_api_key" varchar(512);
