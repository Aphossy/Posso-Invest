-- Add organization_id to the data tables in a way that is safe for existing rows.
-- The migration first backfills rows to the first available organization, then adds the
-- foreign-key constraint and indexes.

DO $$
DECLARE
  org_id text;
BEGIN
  SELECT id INTO org_id
  FROM public."organization"
  ORDER BY created_at, id
  LIMIT 1;

  IF org_id IS NULL THEN
    RAISE NOTICE 'No organization row found; skipping backfill for organization_id columns.';
  END IF;

  ALTER TABLE IF EXISTS public."contribution"
  ADD COLUMN IF NOT EXISTS "organization_id" text;

  IF org_id IS NOT NULL THEN
    UPDATE public."contribution"
    SET "organization_id" = org_id
    WHERE "organization_id" IS NULL;
  END IF;

  ALTER TABLE IF EXISTS public."loan"
  ADD COLUMN IF NOT EXISTS "organization_id" text;

  IF org_id IS NOT NULL THEN
    UPDATE public."loan"
    SET "organization_id" = org_id
    WHERE "organization_id" IS NULL;
  END IF;

  ALTER TABLE IF EXISTS public."penalty"
  ADD COLUMN IF NOT EXISTS "organization_id" text;

  IF org_id IS NOT NULL THEN
    UPDATE public."penalty"
    SET "organization_id" = org_id
    WHERE "organization_id" IS NULL;
  END IF;

  ALTER TABLE IF EXISTS public."attendance"
  ADD COLUMN IF NOT EXISTS "organization_id" text;

  IF org_id IS NOT NULL THEN
    UPDATE public."attendance"
    SET "organization_id" = org_id
    WHERE "organization_id" IS NULL;
  END IF;
END $$;

ALTER TABLE IF EXISTS public."contribution"
ADD CONSTRAINT "contribution_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES public."organization"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "contribution_organization_id_idx" ON public."contribution"("organization_id");

ALTER TABLE IF EXISTS public."loan"
ADD CONSTRAINT "loan_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES public."organization"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "loan_organization_id_idx" ON public."loan"("organization_id");

ALTER TABLE IF EXISTS public."penalty"
ADD CONSTRAINT "penalty_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES public."organization"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "penalty_organization_id_idx" ON public."penalty"("organization_id");

ALTER TABLE IF EXISTS public."attendance"
ADD CONSTRAINT "attendance_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES public."organization"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "attendance_organization_id_idx" ON public."attendance"("organization_id");
