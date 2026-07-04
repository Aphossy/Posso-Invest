ALTER TABLE "financial_document" ALTER COLUMN "visibility" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "financial_document" ALTER COLUMN "visibility" SET DEFAULT 'committee'::text;--> statement-breakpoint
DROP TYPE "public"."financial_doc_visibility";--> statement-breakpoint
CREATE TYPE "public"."financial_doc_visibility" AS ENUM('public', 'authenticated', 'committee', 'private');--> statement-breakpoint
ALTER TABLE "financial_document" ALTER COLUMN "visibility" SET DEFAULT 'committee'::"public"."financial_doc_visibility";--> statement-breakpoint
ALTER TABLE "financial_document" ALTER COLUMN "visibility" SET DATA TYPE "public"."financial_doc_visibility" USING "visibility"::"public"."financial_doc_visibility";--> statement-breakpoint
ALTER TABLE "letter" ALTER COLUMN "visibility" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "letter" ALTER COLUMN "visibility" SET DEFAULT 'committee'::text;--> statement-breakpoint
DROP TYPE "public"."letter_visibility";--> statement-breakpoint
CREATE TYPE "public"."letter_visibility" AS ENUM('public', 'authenticated', 'committee', 'private');--> statement-breakpoint
ALTER TABLE "letter" ALTER COLUMN "visibility" SET DEFAULT 'committee'::"public"."letter_visibility";--> statement-breakpoint
ALTER TABLE "letter" ALTER COLUMN "visibility" SET DATA TYPE "public"."letter_visibility" USING "visibility"::"public"."letter_visibility";--> statement-breakpoint
ALTER TABLE "asset_collections" ALTER COLUMN "visibility" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "asset_collections" ALTER COLUMN "visibility" SET DEFAULT 'committee'::text;--> statement-breakpoint
ALTER TABLE "assets" ALTER COLUMN "visibility" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "assets" ALTER COLUMN "visibility" SET DEFAULT 'committee'::text;--> statement-breakpoint
DROP TYPE "public"."asset_visibility";--> statement-breakpoint
CREATE TYPE "public"."asset_visibility" AS ENUM('public', 'authenticated', 'committee', 'admin', 'private');--> statement-breakpoint
ALTER TABLE "asset_collections" ALTER COLUMN "visibility" SET DEFAULT 'committee'::"public"."asset_visibility";--> statement-breakpoint
ALTER TABLE "asset_collections" ALTER COLUMN "visibility" SET DATA TYPE "public"."asset_visibility" USING "visibility"::"public"."asset_visibility";--> statement-breakpoint
ALTER TABLE "assets" ALTER COLUMN "visibility" SET DEFAULT 'committee'::"public"."asset_visibility";--> statement-breakpoint
ALTER TABLE "assets" ALTER COLUMN "visibility" SET DATA TYPE "public"."asset_visibility" USING "visibility"::"public"."asset_visibility";