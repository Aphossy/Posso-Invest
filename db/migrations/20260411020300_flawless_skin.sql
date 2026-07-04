ALTER TABLE "notification" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."notification_type";--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('service_started', 'service_completed', 'payment_received', 'payment_failed', 'review_received', 'payout_processed', 'verification_approved', 'verification_rejected', 'promotion', 'system', 'info');--> statement-breakpoint
ALTER TABLE "notification" ALTER COLUMN "type" SET DATA TYPE "public"."notification_type" USING "type"::"public"."notification_type";--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "is_archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "archived_at" timestamp;--> statement-breakpoint
CREATE INDEX "notification_is_archived_idx" ON "notification" USING btree ("is_archived");