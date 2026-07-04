DROP TABLE "payment" CASCADE;--> statement-breakpoint
DROP TABLE "payout" CASCADE;--> statement-breakpoint
DROP TABLE "saved_payment_method" CASCADE;--> statement-breakpoint
ALTER TABLE "notification" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."notification_type";--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('contribution', 'penalty', 'loan', 'announcement', 'action_item', 'message', 'payment_received', 'payment_failed', 'system', 'info');--> statement-breakpoint
ALTER TABLE "notification" ALTER COLUMN "type" SET DATA TYPE "public"."notification_type" USING "type"::"public"."notification_type";--> statement-breakpoint
DROP TYPE "public"."payment_method";--> statement-breakpoint
DROP TYPE "public"."payment_status";--> statement-breakpoint
DROP TYPE "public"."transaction_type";