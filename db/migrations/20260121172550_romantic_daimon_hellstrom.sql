CREATE TYPE "public"."announcement_audience" AS ENUM('members', 'committee', 'public');--> statement-breakpoint
CREATE TYPE "public"."announcement_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."attendance_status" AS ENUM('present', 'absent', 'excused', 'late');--> statement-breakpoint
CREATE TYPE "public"."action_item_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."action_item_status" AS ENUM('open', 'in_progress', 'blocked', 'done', 'cancelled');--> statement-breakpoint
CREATE TABLE "announcement" (
	"id" text PRIMARY KEY NOT NULL,
	"title" varchar(160) NOT NULL,
	"summary" text,
	"content" text NOT NULL,
	"status" "announcement_status" DEFAULT 'draft' NOT NULL,
	"audience" "announcement_audience" DEFAULT 'members' NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"published_at" timestamp,
	"expires_at" timestamp,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" text PRIMARY KEY NOT NULL,
	"meeting_id" text NOT NULL,
	"member_id" text NOT NULL,
	"status" "attendance_status" DEFAULT 'present' NOT NULL,
	"checked_in_at" timestamp,
	"notes" text,
	"recorded_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "action_item" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "action_item_status" DEFAULT 'open' NOT NULL,
	"priority" "action_item_priority" DEFAULT 'medium' NOT NULL,
	"due_date" timestamp,
	"completed_at" timestamp,
	"meeting_id" text,
	"minutes_id" text,
	"owner_id" text,
	"created_by" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_meeting_id_meeting_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meeting"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_member_id_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_recorded_by_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_item" ADD CONSTRAINT "action_item_meeting_id_meeting_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meeting"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_item" ADD CONSTRAINT "action_item_minutes_id_meeting_minutes_id_fk" FOREIGN KEY ("minutes_id") REFERENCES "public"."meeting_minutes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_item" ADD CONSTRAINT "action_item_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_item" ADD CONSTRAINT "action_item_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "announcement_status_idx" ON "announcement" USING btree ("status");--> statement-breakpoint
CREATE INDEX "announcement_audience_idx" ON "announcement" USING btree ("audience");--> statement-breakpoint
CREATE INDEX "announcement_created_at_idx" ON "announcement" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "announcement_pinned_idx" ON "announcement" USING btree ("pinned");--> statement-breakpoint
CREATE INDEX "attendance_meeting_id_idx" ON "attendance" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "attendance_member_id_idx" ON "attendance" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "attendance_status_idx" ON "attendance" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_meeting_member_idx" ON "attendance" USING btree ("meeting_id","member_id");--> statement-breakpoint
CREATE INDEX "action_item_status_idx" ON "action_item" USING btree ("status");--> statement-breakpoint
CREATE INDEX "action_item_priority_idx" ON "action_item" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "action_item_meeting_idx" ON "action_item" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "action_item_owner_idx" ON "action_item" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "action_item_due_date_idx" ON "action_item" USING btree ("due_date");