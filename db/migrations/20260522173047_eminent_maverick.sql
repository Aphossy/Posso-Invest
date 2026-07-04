CREATE TYPE "public"."share_out_allocation_status" AS ENUM('pending', 'paid');--> statement-breakpoint
CREATE TYPE "public"."share_out_status" AS ENUM('draft', 'approved', 'distributed', 'cancelled');--> statement-breakpoint
CREATE TABLE "share_out" (
	"id" text PRIMARY KEY NOT NULL,
	"label" varchar(160) NOT NULL,
	"fiscal_year" integer NOT NULL,
	"status" "share_out_status" DEFAULT 'draft' NOT NULL,
	"currency" varchar(3) DEFAULT 'RWF' NOT NULL,
	"distributable_amount" numeric(12, 2) NOT NULL,
	"total_contribution_base" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_gross" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_deductions" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_net" numeric(12, 2) DEFAULT '0' NOT NULL,
	"member_count" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_by" text,
	"approved_by" text,
	"approved_at" timestamp,
	"distributed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "share_out_allocation" (
	"id" text PRIMARY KEY NOT NULL,
	"share_out_id" text NOT NULL,
	"member_id" text NOT NULL,
	"contribution_base" numeric(12, 2) DEFAULT '0' NOT NULL,
	"share_percent" numeric(7, 4) DEFAULT '0' NOT NULL,
	"gross_share" numeric(12, 2) DEFAULT '0' NOT NULL,
	"loan_deduction" numeric(12, 2) DEFAULT '0' NOT NULL,
	"penalty_deduction" numeric(12, 2) DEFAULT '0' NOT NULL,
	"net_share" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" "share_out_allocation_status" DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp,
	"receipt_id" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "share_out" ADD CONSTRAINT "share_out_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_out" ADD CONSTRAINT "share_out_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_out_allocation" ADD CONSTRAINT "share_out_allocation_share_out_id_share_out_id_fk" FOREIGN KEY ("share_out_id") REFERENCES "public"."share_out"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_out_allocation" ADD CONSTRAINT "share_out_allocation_member_id_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "share_out_status_idx" ON "share_out" USING btree ("status");--> statement-breakpoint
CREATE INDEX "share_out_fiscal_year_idx" ON "share_out" USING btree ("fiscal_year");--> statement-breakpoint
CREATE INDEX "share_out_allocation_share_out_id_idx" ON "share_out_allocation" USING btree ("share_out_id");--> statement-breakpoint
CREATE INDEX "share_out_allocation_member_id_idx" ON "share_out_allocation" USING btree ("member_id");