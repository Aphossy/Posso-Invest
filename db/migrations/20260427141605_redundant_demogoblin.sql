CREATE TYPE "public"."email_send_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE "email_send_log" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"email" text NOT NULL,
	"event_type" text NOT NULL,
	"period" text NOT NULL,
	"status" "email_send_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp,
	"sent_at" timestamp,
	"failed_at" timestamp,
	"failure_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_send_log" ADD CONSTRAINT "email_send_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "esl_user_event_period_uidx" ON "email_send_log" USING btree ("user_id","event_type","period");--> statement-breakpoint
CREATE INDEX "esl_status_idx" ON "email_send_log" USING btree ("status");--> statement-breakpoint
CREATE INDEX "esl_period_idx" ON "email_send_log" USING btree ("period");--> statement-breakpoint
CREATE INDEX "esl_event_type_idx" ON "email_send_log" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "esl_user_id_idx" ON "email_send_log" USING btree ("user_id");