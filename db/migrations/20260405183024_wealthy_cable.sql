ALTER TABLE "messages" ALTER COLUMN "service" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."message_service";--> statement-breakpoint
CREATE TYPE "public"."message_service" AS ENUM('contributions-savings', 'loans-repayments', 'meetings-minutes', 'penalties-compliance', 'member-account', 'access-technical', 'access', 'other');--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "service" SET DATA TYPE "public"."message_service" USING "service"::"public"."message_service";