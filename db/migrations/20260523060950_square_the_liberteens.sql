CREATE TABLE "team" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "teamMember" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "member_number" text;--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "department" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "contribution_cycle_amount" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "meeting_frequency" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "founded_date" text;--> statement-breakpoint
ALTER TABLE "team" ADD CONSTRAINT "team_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teamMember" ADD CONSTRAINT "teamMember_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teamMember" ADD CONSTRAINT "teamMember_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teamMember" ADD CONSTRAINT "teamMember_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "team_organizationId_idx" ON "team" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "teamMember_teamId_idx" ON "teamMember" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "teamMember_userId_idx" ON "teamMember" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "teamMember_organizationId_idx" ON "teamMember" USING btree ("organization_id");