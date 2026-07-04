ALTER TYPE "public"."letter_status" ADD VALUE 'pending_signature' BEFORE 'approved';--> statement-breakpoint
ALTER TYPE "public"."letter_status" ADD VALUE 'signed' BEFORE 'approved';