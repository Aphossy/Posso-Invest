CREATE TABLE "bank_account" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"account_name" varchar(120) NOT NULL,
	"bank_name" varchar(120) NOT NULL,
	"account_number" text NOT NULL,
	"account_holder" varchar(120) NOT NULL,
	"account_type" varchar(20) NOT NULL,
	"currency" varchar(3) DEFAULT 'RWF' NOT NULL,
	"branch" varchar(120),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bank_account" ADD CONSTRAINT "bank_account_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_account" ADD CONSTRAINT "bank_account_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bank_account_organization_idx" ON "bank_account" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bank_account_organization_number_uidx" ON "bank_account" USING btree ("organization_id","bank_name","account_number");--> statement-breakpoint
