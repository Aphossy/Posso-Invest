CREATE TYPE "public"."contribution_status" AS ENUM('pending', 'confirmed', 'late', 'waived');--> statement-breakpoint
CREATE TYPE "public"."loan_status" AS ENUM('requested', 'approved', 'rejected', 'disbursed', 'repaying', 'repaid', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."meeting_status" AS ENUM('scheduled', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."minutes_status" AS ENUM('draft', 'finalized', 'published');--> statement-breakpoint
CREATE TABLE "contribution" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"recorded_by" text,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'RWF' NOT NULL,
	"period" varchar(7) NOT NULL,
	"status" "contribution_status" DEFAULT 'pending' NOT NULL,
	"due_date" timestamp,
	"paid_at" timestamp,
	"penalty_amount" numeric(10, 2) DEFAULT '0',
	"receipt_number" varchar(50),
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"approved_by" text,
	"disbursed_by" text,
	"requested_amount" numeric(10, 2) NOT NULL,
	"approved_amount" numeric(10, 2),
	"currency" varchar(3) DEFAULT 'RWF' NOT NULL,
	"interest_rate" numeric(5, 4) DEFAULT '0.05' NOT NULL,
	"term_months" integer,
	"status" "loan_status" DEFAULT 'requested' NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"approved_at" timestamp,
	"disbursed_at" timestamp,
	"repaid_at" timestamp,
	"due_date" timestamp,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting" (
	"id" text PRIMARY KEY NOT NULL,
	"title" varchar(120) NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"location" text,
	"agenda" text,
	"status" "meeting_status" DEFAULT 'scheduled' NOT NULL,
	"host_contribution" numeric(10, 2) DEFAULT '10000',
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_minutes" (
	"id" text PRIMARY KEY NOT NULL,
	"meeting_id" text NOT NULL,
	"status" "minutes_status" DEFAULT 'draft' NOT NULL,
	"summary" text,
	"decisions" jsonb,
	"action_items" jsonb,
	"attendance" jsonb,
	"recorded_by" text,
	"approved_by" text,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contribution" ADD CONSTRAINT "contribution_member_id_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution" ADD CONSTRAINT "contribution_recorded_by_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan" ADD CONSTRAINT "loan_member_id_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan" ADD CONSTRAINT "loan_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan" ADD CONSTRAINT "loan_disbursed_by_user_id_fk" FOREIGN KEY ("disbursed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting" ADD CONSTRAINT "meeting_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_minutes" ADD CONSTRAINT "meeting_minutes_meeting_id_meeting_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meeting"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_minutes" ADD CONSTRAINT "meeting_minutes_recorded_by_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_minutes" ADD CONSTRAINT "meeting_minutes_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contribution_member_id_idx" ON "contribution" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "contribution_status_idx" ON "contribution" USING btree ("status");--> statement-breakpoint
CREATE INDEX "contribution_period_idx" ON "contribution" USING btree ("period");--> statement-breakpoint
CREATE INDEX "contribution_created_at_idx" ON "contribution" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "loan_member_id_idx" ON "loan" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "loan_status_idx" ON "loan" USING btree ("status");--> statement-breakpoint
CREATE INDEX "loan_requested_at_idx" ON "loan" USING btree ("requested_at");--> statement-breakpoint
CREATE INDEX "meeting_status_idx" ON "meeting" USING btree ("status");--> statement-breakpoint
CREATE INDEX "meeting_scheduled_at_idx" ON "meeting" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "meeting_minutes_meeting_id_idx" ON "meeting_minutes" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "meeting_minutes_status_idx" ON "meeting_minutes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "meeting_minutes_created_at_idx" ON "meeting_minutes" USING btree ("created_at");