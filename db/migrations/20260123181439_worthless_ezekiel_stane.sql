ALTER TYPE "public"."message_service" ADD VALUE 'access' BEFORE 'other';--> statement-breakpoint
DROP INDEX "two_factor_user_id_idx";--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "role" SET DEFAULT 'member';--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'member';--> statement-breakpoint
CREATE INDEX "two_factor_secret_idx" ON "two_factor" USING btree ("secret");--> statement-breakpoint
CREATE INDEX "two_factor_user_id_idx" ON "two_factor" USING btree ("user_id");