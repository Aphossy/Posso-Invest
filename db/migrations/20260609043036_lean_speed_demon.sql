ALTER TABLE "organization" ALTER COLUMN "contribution_cycle_amount" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "active_team_id" text;