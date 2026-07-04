-- Add missing team-related columns required by auth schema
ALTER TABLE "invitation" ADD COLUMN IF NOT EXISTS "team_id" text;
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "active_team_id" text;
