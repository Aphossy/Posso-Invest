ALTER TABLE "penalty" DROP CONSTRAINT "penalty_contribution_id_contribution_id_fk";
--> statement-breakpoint
ALTER TABLE "penalty" ALTER COLUMN "contribution_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "penalty" ADD CONSTRAINT "penalty_contribution_id_contribution_id_fk" FOREIGN KEY ("contribution_id") REFERENCES "public"."contribution"("id") ON DELETE set null ON UPDATE no action;