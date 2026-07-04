CREATE TYPE "public"."loan_repayment_method" AS ENUM('cash', 'bank_transfer', 'mobile_money', 'check', 'other');--> statement-breakpoint
CREATE TABLE "loan_repayment" (
	"id" text PRIMARY KEY NOT NULL,
	"loan_id" text NOT NULL,
	"member_id" text NOT NULL,
	"recorded_by" text,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'RWF' NOT NULL,
	"payment_method" "loan_repayment_method" DEFAULT 'cash',
	"paid_at" timestamp DEFAULT now() NOT NULL,
	"period" varchar(7),
	"receipt_id" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "loan_repayment" ADD CONSTRAINT "loan_repayment_loan_id_loan_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_repayment" ADD CONSTRAINT "loan_repayment_member_id_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_repayment" ADD CONSTRAINT "loan_repayment_recorded_by_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "loan_repayment_loan_id_idx" ON "loan_repayment" USING btree ("loan_id");--> statement-breakpoint
CREATE INDEX "loan_repayment_member_id_idx" ON "loan_repayment" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "loan_repayment_paid_at_idx" ON "loan_repayment" USING btree ("paid_at");