CREATE TYPE "public"."financial_doc_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."financial_doc_type" AS ENUM('monthly_report', 'balance_sheet', 'income_statement', 'contribution_schedule', 'loan_agreement', 'disbursement_record', 'repayment_schedule', 'audit_report', 'bank_statement', 'budget', 'other');--> statement-breakpoint
CREATE TYPE "public"."financial_doc_visibility" AS ENUM('public', 'authenticated', 'team', 'private');--> statement-breakpoint
CREATE TYPE "public"."letter_status" AS ENUM('draft', 'sent', 'acknowledged', 'approved', 'rejected', 'archived');--> statement-breakpoint
CREATE TYPE "public"."letter_type" AS ENUM('approval_request', 'official_notice', 'legal_notice', 'meeting_notice', 'member_communication', 'general_correspondence');--> statement-breakpoint
CREATE TYPE "public"."letter_visibility" AS ENUM('public', 'authenticated', 'team', 'private');--> statement-breakpoint
CREATE TYPE "public"."receipt_payment_method" AS ENUM('cash', 'bank_transfer', 'mobile_money', 'check', 'other');--> statement-breakpoint
CREATE TYPE "public"."receipt_status" AS ENUM('issued', 'void', 'replaced');--> statement-breakpoint
CREATE TYPE "public"."receipt_type" AS ENUM('contribution', 'loan_repayment', 'penalty_payment', 'registration_fee', 'other');--> statement-breakpoint
CREATE TABLE "financial_document" (
	"id" text PRIMARY KEY NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"doc_type" "financial_doc_type" DEFAULT 'other' NOT NULL,
	"status" "financial_doc_status" DEFAULT 'draft' NOT NULL,
	"visibility" "financial_doc_visibility" DEFAULT 'team' NOT NULL,
	"period" varchar(7),
	"fiscal_year" integer,
	"file_url" text,
	"file_key" text,
	"file_size" integer,
	"file_type" varchar(100),
	"uploaded_by" text,
	"download_count" integer DEFAULT 0,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "letter" (
	"id" text PRIMARY KEY NOT NULL,
	"ref_number" varchar(50),
	"subject" varchar(500) NOT NULL,
	"letter_type" "letter_type" DEFAULT 'general_correspondence' NOT NULL,
	"status" "letter_status" DEFAULT 'draft' NOT NULL,
	"visibility" "letter_visibility" DEFAULT 'team' NOT NULL,
	"recipient" varchar(500),
	"recipient_member_id" text,
	"issued_by" text,
	"file_url" text,
	"file_key" text,
	"file_size" integer,
	"file_type" varchar(100),
	"description" text,
	"notes" text,
	"issued_at" timestamp,
	"due_date" timestamp,
	"download_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipt" (
	"id" text PRIMARY KEY NOT NULL,
	"receipt_number" varchar(50),
	"receipt_type" "receipt_type" DEFAULT 'other' NOT NULL,
	"status" "receipt_status" DEFAULT 'issued' NOT NULL,
	"member_id" text NOT NULL,
	"issued_by" text,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'RWF' NOT NULL,
	"payment_method" "receipt_payment_method" DEFAULT 'cash',
	"contribution_id" text,
	"loan_id" text,
	"penalty_id" text,
	"period" varchar(7),
	"file_url" text,
	"file_key" text,
	"file_size" integer,
	"file_type" varchar(100),
	"notes" text,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"download_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "receipt_receipt_number_unique" UNIQUE("receipt_number")
);
--> statement-breakpoint
ALTER TABLE "financial_document" ADD CONSTRAINT "financial_document_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "letter" ADD CONSTRAINT "letter_recipient_member_id_user_id_fk" FOREIGN KEY ("recipient_member_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "letter" ADD CONSTRAINT "letter_issued_by_user_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt" ADD CONSTRAINT "receipt_member_id_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt" ADD CONSTRAINT "receipt_issued_by_user_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt" ADD CONSTRAINT "receipt_contribution_id_contribution_id_fk" FOREIGN KEY ("contribution_id") REFERENCES "public"."contribution"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fin_doc_type_idx" ON "financial_document" USING btree ("doc_type");--> statement-breakpoint
CREATE INDEX "fin_doc_status_idx" ON "financial_document" USING btree ("status");--> statement-breakpoint
CREATE INDEX "fin_doc_period_idx" ON "financial_document" USING btree ("period");--> statement-breakpoint
CREATE INDEX "fin_doc_fiscal_year_idx" ON "financial_document" USING btree ("fiscal_year");--> statement-breakpoint
CREATE INDEX "fin_doc_uploaded_by_idx" ON "financial_document" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "fin_doc_created_at_idx" ON "financial_document" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "letter_ref_number_idx" ON "letter" USING btree ("ref_number");--> statement-breakpoint
CREATE INDEX "letter_letter_type_idx" ON "letter" USING btree ("letter_type");--> statement-breakpoint
CREATE INDEX "letter_status_idx" ON "letter" USING btree ("status");--> statement-breakpoint
CREATE INDEX "letter_issued_by_idx" ON "letter" USING btree ("issued_by");--> statement-breakpoint
CREATE INDEX "letter_recipient_member_idx" ON "letter" USING btree ("recipient_member_id");--> statement-breakpoint
CREATE INDEX "letter_created_at_idx" ON "letter" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "receipt_number_idx" ON "receipt" USING btree ("receipt_number");--> statement-breakpoint
CREATE INDEX "receipt_receipt_type_idx" ON "receipt" USING btree ("receipt_type");--> statement-breakpoint
CREATE INDEX "receipt_member_id_idx" ON "receipt" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "receipt_issued_by_idx" ON "receipt" USING btree ("issued_by");--> statement-breakpoint
CREATE INDEX "receipt_status_idx" ON "receipt" USING btree ("status");--> statement-breakpoint
CREATE INDEX "receipt_period_idx" ON "receipt" USING btree ("period");--> statement-breakpoint
CREATE INDEX "receipt_contribution_id_idx" ON "receipt" USING btree ("contribution_id");--> statement-breakpoint
CREATE INDEX "receipt_issued_at_idx" ON "receipt" USING btree ("issued_at");