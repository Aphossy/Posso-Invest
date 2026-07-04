CREATE TYPE "public"."expense_category" AS ENUM('bank_charge', 'notary', 'transport', 'office_supplies', 'communication', 'event', 'other');--> statement-breakpoint
CREATE TYPE "public"."expense_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "operational_expense" (
	"id" text PRIMARY KEY NOT NULL,
	"submitted_by_id" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'RWF' NOT NULL,
	"category" "expense_category" DEFAULT 'other' NOT NULL,
	"description" text NOT NULL,
	"expense_date" timestamp NOT NULL,
	"receipt_url" text,
	"status" "expense_status" DEFAULT 'pending' NOT NULL,
	"approved_by_id" text,
	"approved_at" timestamp,
	"rejection_note" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "operational_expense" ADD CONSTRAINT "operational_expense_submitted_by_id_user_id_fk" FOREIGN KEY ("submitted_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_expense" ADD CONSTRAINT "operational_expense_approved_by_id_user_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "operational_expense_submitted_by_idx" ON "operational_expense" USING btree ("submitted_by_id");--> statement-breakpoint
CREATE INDEX "operational_expense_status_idx" ON "operational_expense" USING btree ("status");--> statement-breakpoint
CREATE INDEX "operational_expense_category_idx" ON "operational_expense" USING btree ("category");--> statement-breakpoint
CREATE INDEX "operational_expense_date_idx" ON "operational_expense" USING btree ("expense_date");--> statement-breakpoint
CREATE INDEX "operational_expense_created_at_idx" ON "operational_expense" USING btree ("created_at");