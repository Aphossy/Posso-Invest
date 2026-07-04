-- Idempotent migration for Better Auth organization schema compatibility
-- Safe to run multiple times.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invitation'
      AND column_name = 'team_id'
  ) THEN
    ALTER TABLE "invitation" ADD COLUMN "team_id" text;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'session'
      AND column_name = 'active_team_id'
  ) THEN
    ALTER TABLE "session" ADD COLUMN "active_team_id" text;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'member'
      AND column_name = 'team_id'
  ) THEN
    ALTER TABLE "member" ADD COLUMN "team_id" text;
  END IF;
END $$;
