CREATE TYPE "public"."penalty_status" AS ENUM('active', 'waived');--> statement-breakpoint
CREATE TABLE "penalty" (
	"id" text PRIMARY KEY NOT NULL,
	"contribution_id" text NOT NULL,
	"member_id" text NOT NULL,
	"issued_by" text,
	"waived_by" text,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'RWF' NOT NULL,
	"status" "penalty_status" DEFAULT 'active' NOT NULL,
	"reason" text,
	"waived_at" timestamp,
	"waived_reason" text,
	"notes" text,
	"period" varchar(7) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "penalty" ADD CONSTRAINT "penalty_contribution_id_contribution_id_fk" FOREIGN KEY ("contribution_id") REFERENCES "public"."contribution"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penalty" ADD CONSTRAINT "penalty_member_id_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penalty" ADD CONSTRAINT "penalty_issued_by_user_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penalty" ADD CONSTRAINT "penalty_waived_by_user_id_fk" FOREIGN KEY ("waived_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "penalty_contribution_id_idx" ON "penalty" USING btree ("contribution_id");--> statement-breakpoint
CREATE INDEX "penalty_member_id_idx" ON "penalty" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "penalty_status_idx" ON "penalty" USING btree ("status");--> statement-breakpoint
CREATE INDEX "penalty_period_idx" ON "penalty" USING btree ("period");