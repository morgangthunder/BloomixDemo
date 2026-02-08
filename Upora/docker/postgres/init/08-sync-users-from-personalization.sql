-- Backfill users table: ensure every user_id in user_personalization exists in users.
-- Run after 07-personalization-options-age-gender.sql.
-- Uses placeholder email/tenant for users created only via Cognito (no explicit users row).

INSERT INTO users (id, tenant_id, email, role, token_usage, token_limit, created_at, updated_at)
SELECT up.user_id,
  '00000000-0000-0000-0000-000000000001'::uuid,
  (up.user_id::text || '@cognito-synced.local'),
  'student',
  0,
  10000,
  COALESCE(up.created_at, NOW()),
  COALESCE(up.updated_at, NOW())
FROM user_personalization up
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = up.user_id)
ON CONFLICT DO NOTHING;
